import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule, readSSEStream } from "@/test-helpers/mock-ai";
import { makeStreamingRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

async function* failingShinjeomStream(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw new Error("Shinjeom AI error");
}

async function* failingShinjeomStreamNonError(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw "non-error shinjeom string"; // non-Error to trigger String(e) catch branch
}

const VALID_BODY = {
  sessionId: null,
  topic: "shinjeom-general",
  characterId: "arcana",
  currentMessage: "요즘 연애가 걱정돼요",
  chatHistory: [],
  isFinalTurn: false,
  messageIndex: 0,
};

async function setup() {
  return makeStreamingRouteSetup(
    () => import("@/app/api/shinjeom/message/route"),
    (db) => {
      db.insert.mockResolvedValue({ id: "sm-1" });
      db.insertMany.mockResolvedValue([]);
      db.update.mockResolvedValue(null);
    }
  );
}

describe("POST /api/shinjeom/message", () => {
  it("유효한 요청 → SSE 스트림 응답", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("data:");
    expect(text).toContain("done");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("isFinalTurn=false이고 currentMessage 없음 → 400", async () => {
    const { POST } = await setup();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currentMessage: _, ...bodyWithoutMsg } = VALID_BODY;
    const res = await POST(makePostRequest(bodyWithoutMsg));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Message required");
  });

  it("isFinalTurn=true → 최종 결과 SSE 포함", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, isFinalTurn: true }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("isFinal");
  });

  it("rate limit 초과 → 429", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(false),
      rateLimitResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("내부 예외 → 500", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue(new Error("unexpected")),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("타인 세션에 message 요청 → 403 (IDOR 차단)", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
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
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "session-other-user" }));
    expect(res.status).toBe(403);
  });

  it("chatHistory 요소 있을 때 timestamp가 Date로 변환된다", async () => {
    const { POST } = await setup();
    const bodyWithHistory = {
      ...VALID_BODY,
      chatHistory: [{ id: "msg-1", role: "user", content: "첫 번째 고민", timestamp: "2026-01-01T00:00:00Z" }],
    };
    const res = await POST(makePostRequest(bodyWithHistory));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("isFinalTurn=true + sessionId → saveShinjeomFinalReading fire-and-forget 호출", async () => {
    const mockSaveFinal = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({
      saveShinjeomFinalReading: mockSaveFinal,
      saveShinjeomMessages: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-final", isFinalTurn: true }));
    await readSSEStream(res);
    await Promise.resolve();
    expect(mockSaveFinal).toHaveBeenCalledWith(mockDb, "sess-final", expect.any(Object));
  });

  it("AI 오류 → 스트림 내부 catch에서 errMsg 전송", async () => {
    const mockAiModule = makeMockAiModule();
    const provider = { streamReading: vi.fn().mockReturnValue(failingShinjeomStream()) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("DB 저장 실패해도 SSE 응답 정상 완료 (fire-and-forget 비블로킹)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockSaveFail = vi.fn().mockRejectedValue(new Error("DB connection lost"));
    vi.doMock("@/lib/db/reading-saver", () => ({
      saveShinjeomMessages: mockSaveFail,
      saveShinjeomFinalReading: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-sh", isFinalTurn: false }));
    const text = await readSSEStream(res);
    expect(text).toContain("done");
    await Promise.resolve();
    expect(mockSaveFail).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("중간 메시지 → saveShinjeomMessages fire-and-forget 호출", async () => {
    const mockSaveMsg = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({
      saveShinjeomMessages: mockSaveMsg,
      saveShinjeomFinalReading: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-sh", isFinalTurn: false }));
    await readSSEStream(res);
    await Promise.resolve();
    expect(mockSaveMsg).toHaveBeenCalledWith(mockDb, "sess-sh", "요즘 연애가 걱정돼요", expect.any(String), 0);
  });

  it("AI 스트림이 non-Error throw → 스트림 catch String(e) 분기 커버", async () => {
    const mockAiModule = makeMockAiModule();
    const provider = { streamReading: vi.fn().mockReturnValue(failingShinjeomStreamNonError()) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("outer catch non-Error → String(err) 분기 커버", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue("string-throw"),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/shinjeom/message/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("characterId null → ?? undefined 분기 커버", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, characterId: null }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });
});
