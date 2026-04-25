import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule, readSSEStream } from "@/test-helpers/mock-ai";

setupDoMock();

const VALID_BODY = {
  sessionId: null,
  topic: "love",
  characterId: "arcana",
  cards: [{ cardId: "major-00", position: 0, isReversed: false }],
};

async function setup(options: { aiError?: boolean } = {}) {
  const mockDb = makeMockDb();
  mockDb.insert.mockResolvedValue({ id: "r-1" });
  mockDb.update.mockResolvedValue(null);
  mockDb.insertMany.mockResolvedValue([]);

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const provider = {
      streamReading: vi.fn().mockImplementation(async function* () {
        throw new Error("AI error");
      }),
    };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  }

  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockReturnValue(true),
    rateLimitResponse: vi.fn(),
  }));
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/lib/auth", () => makeAuthMock());
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);

  const { POST } = await import("@/app/api/tarot/reading/route");
  return { POST, mockDb };
}

describe("POST /api/tarot/reading", () => {
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

  it("cards 배열 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "love", characterId: "arcana" }));
    expect(res.status).toBe(400);
  });

  it("유효하지 않은 topic → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, topic: "invalid-topic" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid topic");
  });

  it("rate limit 초과 → 429", async () => {
    // rate-limit 포함 모든 모듈을 처음부터 mock (setup() 없이 직접 구성)
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(false),
      rateLimitResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("AI 오류 → 응답 생성 후 스트림 내부에서 처리", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    // AI 오류는 스트림 내부 try-catch에서 처리되므로 200 응답
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("타인 세션에 reading 요청 → 403 (IDOR 차단)", async () => {
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
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "session-other-user" }));
    expect(res.status).toBe(403);
  });

  it("내부 예외 → 500", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue(new Error("unexpected")),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("스트림 완료 후 saveTarotReading fire-and-forget 호출", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ saveTarotReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-existing" }));
    await readSSEStream(res);
    await Promise.resolve(); // 마이크로태스크 플러시
    expect(mockSave).toHaveBeenCalledWith(
      mockDb,
      "sess-existing",
      expect.objectContaining({ overallReading: expect.any(String) }),
      expect.any(Array)
    );
  });
});
