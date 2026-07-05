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
    mockAiModule.FallbackProvider.mockImplementation(function () { return provider; });
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

  it("스트림 완료 후 saveSajuReading 호출 (done 이후 await)", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
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

  it("저장 성공 시 done 이후 saved:true 이벤트를 전송한다", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave, logReadingSaveFailure: vi.fn() }));
    vi.doMock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockReturnValue(true), rateLimitResponse: vi.fn() }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-saju" }));
    const text = await readSSEStream(res);
    expect(text).toContain('"saved":true');
  });

  it("저장 실패 시 saved:false 이벤트 전송 + logReadingSaveFailure 호출", async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error("db down"));
    const mockLog = vi.fn();
    const mockRecord = vi.fn();
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave, logReadingSaveFailure: mockLog, recordFailedReading: mockRecord }));
    vi.doMock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockReturnValue(true), rateLimitResponse: vi.fn() }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-saju" }));
    const text = await readSSEStream(res);
    expect(text).toContain('"saved":false');
    expect(mockLog).toHaveBeenCalledWith("saju", "sess-saju", expect.any(Error));
    expect(mockRecord).toHaveBeenCalledWith(mockDb, "saju", "sess-saju", expect.objectContaining({ sajuReadingData: expect.any(Object) }), expect.any(Error));
  });

  it("birthTime=null → birth_hour: null 로 저장 (NOT NULL 위반 방지)", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      sessionId: "sess-no-time",
      userInfo: { ...VALID_BODY.userInfo, birthTime: null },
    }));
    await readSSEStream(res);
    await Promise.resolve();
    const savedData = mockSave.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(savedData?.birth_hour).toBeNull();
  });

  it("mbti 입력 시 saju_readings에 저장", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      sessionId: "sess-mbti",
      userInfo: { ...VALID_BODY.userInfo, mbti: "INFP" },
    }));
    await readSSEStream(res);
    await Promise.resolve();
    const savedData = mockSave.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(savedData?.mbti).toBe("INFP");
  });

  it("mbti 미입력 시 mbti: null 로 저장", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb), getAdminDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-no-mbti" }));
    await readSSEStream(res);
    await Promise.resolve();
    const savedData = mockSave.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(savedData?.mbti).toBeNull();
  });

  it("topicReading 없는 AI 응답 → topic_reading || '' 분기 커버", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const noTopicReading = JSON.stringify({ overallReading: "전반 결과", advice: "조언" });
    const mockAiModule = makeMockAiModule({
      streamReading: vi.fn().mockImplementation(async function* () { yield noTopicReading; }),
      generateReading: vi.fn().mockResolvedValue(""),
    });
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
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
    mockAiModule.FallbackProvider.mockImplementation(function () { return provider; });
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
      const mockAiModule = { FallbackProvider: vi.fn().mockImplementation(function () { return provider; }) };
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

    it("includeMonthly=true → max_tokens 60000 (cap)", async () => {
      expect(await captureMaxTokens({ timeRange: "this-month", includeMonthly: true })).toBe(60000);
    });

    it("timeRange='full-fortune' → max_tokens 60000 (cap)", async () => {
      expect(await captureMaxTokens({ timeRange: "full-fortune", includeMonthly: false })).toBe(60000);
    });

    it("timeRange='five-year' → max_tokens 60000 (cap)", async () => {
      expect(await captureMaxTokens({ timeRange: "five-year", includeMonthly: false })).toBe(60000);
    });

    it("timeRange='three-year' → max_tokens 60000 (cap)", async () => {
      expect(await captureMaxTokens({ timeRange: "three-year", includeMonthly: false })).toBe(60000);
    });

    it("기본 (this-month, monthly 미포함) → max_tokens 48000 (3배 확장)", async () => {
      expect(await captureMaxTokens({ timeRange: "this-month", includeMonthly: false })).toBe(48000);
    });
  });

  // ─── sajuSections 구조 검증 ───────────────────────────────────────────────
  it("sajuSections 포함 AI 응답 → done 청크에 sajuSections 전달", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    const text = await readSSEStream(res);
    expect(text).toContain("sajuSections");
    expect(text).toContain("structure");
    expect(text).toContain("elements");
    expect(text).toContain("fortune");
    expect(text).toContain("guidance");
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
    vi.doMock("@/lib/db/reading-saver", () => ({ persistDirectAnswer: vi.fn(), persistReadingSections: vi.fn(), saveSajuReading: mockSave }));
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

  describe("freeQuestion 시간 지평 연계 (#6)", () => {
    /** streamReading userPrompt를 캡처하는 헬퍼. directAnswerText=null 이면 directAnswer 없는 응답. */
    async function captureSajuUserPrompt(
      bodyOverride: Record<string, unknown>,
      directAnswerText: string | null = "직답",
    ): Promise<{ userPrompt: string; warnSpy: ReturnType<typeof vi.spyOn> }> {
      vi.resetModules();
      const aiJson = directAnswerText === null
        ? JSON.stringify({ overallReading: "ok", topicReading: "t", advice: "ok" })
        : JSON.stringify({ directAnswer: directAnswerText, overallReading: "ok", topicReading: "t", advice: "ok" });
      const streamSpy = vi.fn().mockImplementation(async function* () { yield aiJson; });
      const provider = { streamReading: streamSpy, generateReading: vi.fn() };
      vi.doMock("@/services/core/fallback-provider", () => ({
        FallbackProvider: vi.fn().mockImplementation(function () { return provider; }),
      }));
      vi.doMock("@/lib/rate-limit", () => ({
        checkRateLimit: vi.fn().mockReturnValue(true),
        rateLimitResponse: vi.fn(),
      }));
      vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()), getAdminDb: vi.fn().mockReturnValue(makeMockDb()) }));
      vi.doMock("@/lib/auth", () => makeAuthMock());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { POST } = await import("@/app/api/saju/reading/route");
      const res = await POST(makePostRequest({ ...VALID_BODY, ...bodyOverride }));
      await readSSEStream(res);
      const userPrompt: string = streamSpy.mock.calls[0]?.[1] ?? "";
      return { userPrompt, warnSpy };
    }

    it("'이번 달' → 드롭다운(this-year)과 달라도 월운 데이터+시기 창 지시 주입", async () => {
      const { userPrompt } = await captureSajuUserPrompt({ timeRange: "this-year", freeQuestion: "이번 달에 이직할 수 있을까요?" });
      expect(userPrompt).toContain("월운");
      expect(userPrompt).toContain("질문의 시간 지평");
      expect(userPrompt).toContain("이번 달에 이직할 수 있을까요?");
    });

    it("'이번 주' → 일운(daily) 데이터 주입", async () => {
      const { userPrompt } = await captureSajuUserPrompt({ timeRange: "this-year", freeQuestion: "이번 주는 어떤가요?" });
      expect(userPrompt).toContain("일운");
    });

    it("'내년' → 세운(yearly) 데이터 주입", async () => {
      const { userPrompt } = await captureSajuUserPrompt({ timeRange: "this-year", freeQuestion: "내년에 이사해도 될까요?" });
      expect(userPrompt).toContain("세운 전망");
    });

    it("'올해' → 추가 계산 없이 시기 창 지시만 주입 (올해 세운은 기본 포함)", async () => {
      const { userPrompt } = await captureSajuUserPrompt({ timeRange: "full-fortune", freeQuestion: "올해 재물운이 궁금해요" });
      expect(userPrompt).toContain("질문의 시간 지평");
    });

    it("freeQuestion 있으나 directAnswer 비면 관측 경고 로그(RC3 재발 감시)", async () => {
      const { warnSpy } = await captureSajuUserPrompt({ freeQuestion: "이번 달 이직?" }, null);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("directAnswer 비어있음"),
        expect.anything(),
      );
    });
  });
});
