import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule } from "@/test-helpers/mock-ai";

setupDoMock();

const TODAY = "2026-04-24";
const CACHED_CARD = { card_id: "major-00", is_reversed: false, interpretation: "캐시된 해석", keywords: ["새로운 시작"] };
const VALID_BODY = { characterId: "arcana", date: TODAY };

async function setup(options: { cached?: boolean; aiError?: boolean } = {}) {
  const mockDb = makeMockDb();
  mockDb.findOne.mockResolvedValue(options.cached ? CACHED_CARD : null);
  mockDb.upsert.mockResolvedValue(CACHED_CARD);

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const provider = { generateReading: vi.fn().mockRejectedValue(new Error("AI down")) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  }

  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);

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

  it("AI 오류 → 500", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
