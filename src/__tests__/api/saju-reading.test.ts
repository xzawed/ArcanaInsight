import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule, readSSEStream } from "@/test-helpers/mock-ai";
import { makeStreamingRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

async function* failingSajuStream(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw new Error("Saju AI error");
}

async function* failingSajuStreamNonError(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw "non-error saju string"; // non-Error to trigger String(e) catch branch
}

const VALID_BODY = {
  sessionId: null,
  topic: "saju-general",
  timeRange: "this-year",
  includeMonthly: false,
  characterId: "arcana",
  userInfo: {
    birthDate: "1990-01-15",
    birthTime: "00:00",
    gender: "female",
  },
};

async function setup() {
  return makeStreamingRouteSetup(
    () => import("@/app/api/saju/reading/route"),
    (db) => {
      db.insert.mockResolvedValue({ id: "r-saju-1" });
      db.update.mockResolvedValue(null);
    }
  );
}

describe("POST /api/saju/reading", () => {
  it("유효한 요청 → SSE 스트림 응답", { timeout: 15000 }, async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("data:");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("유효하지 않은 topic → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, topic: "love" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid topic");
  });

  it("유효하지 않은 timeRange → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, timeRange: "invalid-range" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid timeRange");
  });

  it("rate limit 초과 → 429", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(false),
      rateLimitResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("내부 예외 → 500", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue(new Error("unexpected")),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("includeMonthly=true + allowMonthly 지원 timeRange → monthly 옵션 포함", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, timeRange: "this-year", includeMonthly: true }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("AI 오류 → 스트림 내부 catch에서 처리", async () => {
    const mockAiModule = makeMockAiModule();
    const provider = { streamReading: vi.fn().mockReturnValue(failingSajuStream()) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("타인 세션에 reading 요청 → 403 (IDOR 차단)", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => ({
      ...makeAuthMock(),
      assertSessionOwnership: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      ),
    }));
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "session-other-user" }));
    expect(res.status).toBe(403);
  });

  it("스트림 완료 후 saveSajuReading fire-and-forget 호출", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-saju" }));
    await readSSEStream(res);
    await Promise.resolve();
    expect(mockSave).toHaveBeenCalledWith(mockDb, "sess-saju", expect.any(Object), expect.any(String));
  });

  it("topicReading 없는 AI 응답 → topic_reading || '' 분기 커버", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const noTopicReading = JSON.stringify({ overallReading: "전반 결과", advice: "조언" });
    const mockAiModule = makeMockAiModule({
      streamReading: vi.fn().mockImplementation(async function* () { yield noTopicReading; }),
      generateReading: vi.fn().mockResolvedValue(""),
    });
    vi.doMock("@/lib/db/reading-saver", () => ({ saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-no-topic" }));
    const text = await readSSEStream(res);
    await Promise.resolve();
    expect(text).toContain("done");
    expect(mockSave).toHaveBeenCalled();
  });

  it("AI 스트림이 non-Error throw → 스트림 catch String(e) 분기 커버", async () => {
    const mockAiModule = makeMockAiModule();
    const provider = { streamReading: vi.fn().mockReturnValue(failingSajuStreamNonError()) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("outer catch non-Error → String(e) 분기 커버", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue("string-throw"),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  // ─── computeSajuReadingMaxTokens 분기 ─────────────────────────────────────
  describe("computeSajuReadingMaxTokens — 동적 max_tokens", () => {
    async function captureMaxTokens(body: Record<string, unknown>): Promise<number | undefined> {
      const provider = {
        streamReading: vi.fn().mockImplementation(async function* () {
          yield JSON.stringify({ overallReading: "ok", topicReading: "주제", advice: "조언" });
        }),
        generateReading: vi.fn().mockResolvedValue(""),
      };
      const mockAiModule = { FallbackProvider: vi.fn().mockImplementation(() => provider) };
      vi.doMock("@/lib/rate-limit", () => ({
        checkRateLimit: vi.fn().mockReturnValue(true),
        rateLimitResponse: vi.fn(),
      }));
      vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
      vi.doMock("@/lib/auth", () => makeAuthMock());
      vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
      const { POST } = await import("@/app/api/saju/reading/route");
      const res = await POST(makePostRequest({ ...VALID_BODY, ...body }));
      await readSSEStream(res);
      return provider.streamReading.mock.calls[0]?.[2] as number | undefined;
    }

    it("includeMonthly=true → max_tokens 28000", async () => {
      expect(await captureMaxTokens({ timeRange: "this-month", includeMonthly: true })).toBe(28000);
    });

    it("timeRange='full-fortune' → max_tokens 25000", async () => {
      expect(await captureMaxTokens({ timeRange: "full-fortune", includeMonthly: false })).toBe(25000);
    });

    it("timeRange='five-year' → max_tokens 22000", async () => {
      expect(await captureMaxTokens({ timeRange: "five-year", includeMonthly: false })).toBe(22000);
    });

    it("timeRange='three-year' → max_tokens 20000", async () => {
      expect(await captureMaxTokens({ timeRange: "three-year", includeMonthly: false })).toBe(20000);
    });

    it("기본 (this-month, monthly 미포함) → max_tokens 16000", async () => {
      expect(await captureMaxTokens({ timeRange: "this-month", includeMonthly: false })).toBe(16000);
    });
  });

  // ─── parseError 시 DB 저장 차단 ───────────────────────────────────────────
  it("parseError(missing_fields) → saveSajuReading 미호출 (부분 결과 영구 저장 차단)", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    // overallReading만 있고 advice 빈 문자 → parseResult가 missing_fields 부여
    const partialJson = JSON.stringify({ overallReading: "결과 본문", topicReading: "주제", advice: "" });
    const mockAiModule = makeMockAiModule({
      streamReading: vi.fn().mockImplementation(async function* () { yield partialJson; }),
      generateReading: vi.fn().mockResolvedValue(""),
    });
    vi.doMock("@/lib/db/reading-saver", () => ({ saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-partial" }));
    const text = await readSSEStream(res);
    await Promise.resolve();
    expect(text).toContain("missing_fields");
    expect(mockSave).not.toHaveBeenCalled();
  });
});
