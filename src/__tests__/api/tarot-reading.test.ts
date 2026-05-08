import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule, readSSEStream } from "@/test-helpers/mock-ai";

setupDoMock();

async function* failingStreamGenerator(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw new Error("AI error");
}

async function* failingStreamNonError(): AsyncGenerator<string, void, unknown> {
  for (const chunk of [] as string[]) yield chunk;
  throw "non-error string throw"; // non-Error to trigger String(e) catch branch
}

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
      streamReading: vi.fn().mockReturnValue(failingStreamGenerator()),
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
  it("유효한 요청 → SSE 스트림 응답", { timeout: 15000 }, async () => {
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

  it("spreadType='three-card' 제공 시 그대로 사용한다", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, spreadType: "three-card" }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("cards 2장 → TOKENS_FEW_CARDS 분기 통과", async () => {
    const { POST } = await setup();
    const twoCards = [
      { cardId: "major-00", position: 0, isReversed: false },
      { cardId: "major-01", position: 1, isReversed: true },
    ];
    const res = await POST(makePostRequest({ ...VALID_BODY, cards: twoCards }));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("cards 5장 → TOKENS_MEDIUM_CARDS 분기 통과", async () => {
    const { POST } = await setup();
    const fiveCards = Array.from({ length: 5 }, (_, i) => ({
      cardId: `major-0${i}`,
      position: i,
      isReversed: false,
    }));
    const res = await POST(makePostRequest({ ...VALID_BODY, cards: fiveCards }));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("cards 8장 → TOKENS_MANY_CARDS 분기 통과", async () => {
    const { POST } = await setup();
    const eightCards = Array.from({ length: 8 }, (_, i) => ({
      cardId: `major-0${i}`,
      position: i,
      isReversed: false,
    }));
    const res = await POST(makePostRequest({ ...VALID_BODY, cards: eightCards }));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("done");
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
      expect.any(Array),
      expect.any(String)  // locale (PR-A: i18n wiring)
    );
  });

  it("존재하지 않는 cardId → Card not found 에러 → 500", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      cards: [{ cardId: "invalid-card-xyz-9999", position: 0, isReversed: false }],
    }));
    expect(res.status).toBe(500);
  });

  it("카드 position이 음수 → Zod min(0) 검증 실패 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      cards: [{ cardId: "major-00", position: -1, isReversed: false }],
    }));
    expect(res.status).toBe(400);
  });

  it("AI 스트림이 non-Error throw → 스트림 catch String(e) 분기 커버", async () => {
    const mockAiModule = makeMockAiModule();
    const provider = { streamReading: vi.fn().mockReturnValue(failingStreamNonError()) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await readSSEStream(res);
    expect(text).toContain("error");
  });

  it("computeReadingMaxTokens 정책 — 모든 분기가 streamReading에 정확히 전달", async () => {
    // 1~9장: 기존 검증된 고정값. 10장+: 2500 + cardCount*1700 + 5000 (모델 cap 60000)
    const cases: { count: number; expected: number }[] = [
      { count: 1, expected: 2600 },
      { count: 3, expected: 4500 },
      { count: 5, expected: 6500 },
      { count: 7, expected: 8500 },
      { count: 9, expected: 10500 },
      { count: 10, expected: 24500 },  // 2500 + 17000 + 5000
      { count: 12, expected: 27900 },  // 2500 + 20400 + 5000 (zodiac)
      { count: 15, expected: 33000 },  // 2500 + 25500 + 5000 (미래 spread)
      { count: 20, expected: 41500 },  // 2500 + 34000 + 5000 (미래 spread)
    ];
    for (const { count, expected } of cases) {
      vi.resetModules();
      const streamSpy = vi.fn().mockImplementation(async function* () {
        yield JSON.stringify({
          cardInterpretations: [],
          overallReading: "ok",
          advice: "ok",
        });
      });
      const provider = { streamReading: streamSpy, generateReading: vi.fn() };
      vi.doMock("@/services/core/fallback-provider", () => ({
        FallbackProvider: vi.fn().mockImplementation(() => provider),
      }));
      vi.doMock("@/lib/rate-limit", () => ({
        checkRateLimit: vi.fn().mockReturnValue(true),
        rateLimitResponse: vi.fn(),
      }));
      vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
      vi.doMock("@/lib/auth", () => makeAuthMock());
      const { POST } = await import("@/app/api/tarot/reading/route");
      const cardsArr = Array.from({ length: count }, (_, i) => ({
        cardId: `major-${String(i).padStart(2, "0")}`,
        position: i,
        isReversed: false,
      }));
      const res = await POST(makePostRequest({ ...VALID_BODY, cards: cardsArr }));
      await readSSEStream(res);
      expect(streamSpy).toHaveBeenCalledTimes(1);
      expect(streamSpy.mock.calls[0][2]).toBe(expected);
    }
  });

  it("정상 케이스(1장) → done 페이로드에 expectedCardCount=1 포함, parseError 없음", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    const text = await readSSEStream(res);
    const doneLine = text.split("\n").find((l) => l.startsWith("data:") && l.includes("\"done\":true"));
    expect(doneLine).toBeDefined();
    const payload = JSON.parse(doneLine!.slice(5).trim());
    expect(payload.result.expectedCardCount).toBe(1);
    expect(payload.result.parseError).toBeUndefined();
  });

  it("AI 응답이 카드 수 부족 → done 페이로드에 parseError='truncated' 포함", async () => {
    // mock-ai의 MOCK_JSON_RESPONSE는 cardInterpretations 1장 → 5장 요청 시 truncated
    const { POST } = await setup();
    const fiveCards = Array.from({ length: 5 }, (_, i) => ({
      cardId: `major-0${i}`,
      position: i,
      isReversed: false,
    }));
    const res = await POST(makePostRequest({ ...VALID_BODY, cards: fiveCards }));
    const text = await readSSEStream(res);
    const doneLine = text.split("\n").find((l) => l.startsWith("data:") && l.includes("\"done\":true"));
    const payload = JSON.parse(doneLine!.slice(5).trim());
    expect(payload.result.expectedCardCount).toBe(5);
    expect(payload.result.parseError).toBe("truncated");
  });

  it("freeQuestion 포함 요청 → SSE 스트림 응답", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      freeQuestion: "이번 달 운은 어떨까요?",
    }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("done");
  });

  it("freeQuestion 200자 초과 → 400 Invalid request", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      freeQuestion: "a".repeat(201),
    }));
    expect(res.status).toBe(400);
  });

  it("outer catch non-Error → String(e) 분기 커버", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue("string-throw"),
      rateLimitResponse: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/tarot/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
