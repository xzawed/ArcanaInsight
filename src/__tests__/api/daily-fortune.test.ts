import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule } from "@/test-helpers/mock-ai";

setupDoMock();

const TODAY = "2026-05-11";
const VALID_BODY = { characterId: "arcana", date: TODAY };

const CACHED_ROWS = [
  { area: "general", card_id: "major-00", is_reversed: false, interpretation: "종합 해석", keywords: ["시작"] },
  { area: "love",    card_id: "major-06", is_reversed: false, interpretation: "연애 해석", keywords: ["인연"] },
  { area: "career",  card_id: "major-01", is_reversed: false, interpretation: "직장 해석", keywords: ["의지"] },
  { area: "health",  card_id: "major-14", is_reversed: false, interpretation: "건강 해석", keywords: ["균형"] },
  { area: "wealth",  card_id: "major-10", is_reversed: false, interpretation: "재물 해석", keywords: ["행운"] },
];

async function setup(options: {
  cachedCount?: number;
  aiError?: string | boolean;
  rateLimited?: boolean;
} = {}) {
  const mockDb = makeMockDb();
  const count = options.cachedCount ?? 0;
  mockDb.findMany.mockResolvedValue(CACHED_ROWS.slice(0, count));
  mockDb.upsert.mockResolvedValue({});

  const mockAiModule = makeMockAiModule();
  if (options.aiError) {
    const msg = typeof options.aiError === "string" ? options.aiError : "AI down";
    const provider = { generateReading: vi.fn().mockRejectedValue(new Error(msg)) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  } else {
    const aiJson = JSON.stringify({
      general: "종합운 해석", love: "연애운 해석", career: "직장운 해석",
      health: "건강운 해석", wealth: "재물운 해석",
    });
    const provider = { generateReading: vi.fn().mockResolvedValue(aiJson) };
    mockAiModule.FallbackProvider.mockImplementation(() => provider);
  }

  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/services/core/fallback-provider", () => mockAiModule);
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(!options.rateLimited),
    rateLimitResponse: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    ),
  }));

  const { POST } = await import("@/app/api/daily-fortune/route");
  return { POST, mockDb };
}

describe("POST /api/daily-fortune", () => {
  it("5개 영역 전부 캐시 히트 → AI 호출 없이 5개 반환", async () => {
    const { POST, mockDb } = await setup({ cachedCount: 5 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    expect(body.areas.map((a: { area: string }) => a.area).sort()).toEqual(
      ["career", "general", "health", "love", "wealth"]
    );
    expect(mockDb.upsert).not.toHaveBeenCalled();
  });

  it("캐시 미스 → AI 호출 후 5개 영역 반환", async () => {
    const { POST } = await setup({ cachedCount: 0 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    expect(body.areas[0].cardId).toBeTruthy();
    expect(body.areas[0].interpretation).toBeTruthy();
  });

  it("일부 캐시 히트 → 누락 영역만 AI 호출", async () => {
    const { POST, mockDb } = await setup({ cachedCount: 3 });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.areas).toHaveLength(5);
    expect(mockDb.upsert).toHaveBeenCalledTimes(2);
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
    const res = await POST(makePostRequest({ characterId: "arcana", date: "2026/05/11" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("AI 오류 → 500 (오늘의 운세 메시지)", async () => {
    const { POST } = await setup({ aiError: true });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/오늘의 운세를 불러오지 못했습니다/);
  });

  it("API_KEY 오류 → 500 (AI 서비스 설정 메시지)", async () => {
    const { POST } = await setup({ aiError: "Invalid API_KEY provided" });
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/AI 서비스 설정/);
  });

  it("각 영역 cardId·isReversed 타입 검증", async () => {
    const { POST } = await setup({ cachedCount: 5 });
    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();
    for (const a of body.areas) {
      expect(typeof a.cardId).toBe("string");
      expect(typeof a.isReversed).toBe("boolean");
      expect(Array.isArray(a.keywords)).toBe(true);
    }
  });
});
