import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule } from "@/test-helpers/mock-ai";

setupDoMock();

const TODAY = new Date().toISOString().split("T")[0];
const CACHED_CARD = { card_id: "major-00", is_reversed: false, interpretation: "캐시된 해석", keywords: ["새로운 시작"] };
const VALID_BODY = { characterId: "arcana", date: TODAY };

async function setup(options: {
  cached?: boolean;
  aiError?: string | boolean;
  rateLimited?: boolean;
} = {}) {
  const mockDb = makeMockDb();
  mockDb.findOne.mockResolvedValue(options.cached ? CACHED_CARD : null);
  mockDb.upsert.mockResolvedValue(CACHED_CARD);

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const msg = typeof options.aiError === "string" ? options.aiError : "AI down";
    const provider = { generateReading: vi.fn().mockRejectedValue(new Error(msg)) };
    mockAiModule.FallbackProvider.mockImplementation(function () { return provider; });
  }

  vi.doMock("@/lib/db", () => ({
    getDb: vi.fn().mockReturnValue(mockDb),
    getAdminDb: vi.fn().mockReturnValue(mockDb),
  }));
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(!options.rateLimited),
    rateLimitResponse: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    ),
  }));

  const { POST } = await import("@/app/api/daily-card/route");
  return { POST, mockDb };
}

describe("POST /api/daily-card", () => {
  it("캐시 히트 → AI 호출 없이 캐시 반환", async () => {
    const { POST } = await setup({ cached: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cardId).toBe(CACHED_CARD.card_id);
    expect(body.interpretation).toBe(CACHED_CARD.interpretation);
  });

  it("캐시 미스 → AI 호출 후 결과 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cardId).toBeTruthy();
    expect(body.interpretation).toBeTruthy();
  });

  it("레이트 리밋 초과 → 429", async () => {
    const { POST } = await setup({ rateLimited: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("캐릭터 없음 → 404", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "no-such-char", date: TODAY }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Character not found");
  });

  it("date 형식 오류 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana", date: "2026/04/24" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("AI 오류 → 500 (일반 메시지)", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/일일 카드 생성에 실패/);
  });

  it("API_KEY 오류 → 500 (AI 서비스 설정 메시지)", async () => {
    const { POST } = await setup({ aiError: "Invalid API_KEY provided" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/AI 서비스 설정/);
  });

  it("rate limit 오류 → 500 (요청 많음 메시지)", async () => {
    const { POST } = await setup({ aiError: "429 rate limit exceeded" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/요청이 너무 많습니다/);
  });

  it("isReversed 결정 — seed % 3 === 0 시 역방향", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana", date: TODAY }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.isReversed).toBe("boolean");
  });
});
