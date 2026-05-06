import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * locale wiring 검증 — PR-A 정합성 핫픽스.
 * 3개 session 라우트 + reading-saver 3개 함수가 locale을 INSERT 인자로 전달하는지 확인.
 */

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeMockDb() {
  const insertCalls: { table: string; data: Record<string, unknown> }[] = [];
  const insert = vi.fn(async (table: string, data: Record<string, unknown>) => {
    insertCalls.push({ table, data });
    return { id: "mock-session-id", ...data };
  });
  const insertMany = vi.fn(async () => undefined);
  const update = vi.fn(async () => undefined);
  const findOne = vi.fn(async () => null);
  return { insert, insertMany, update, findOne, insertCalls };
}

function setupServerLocale(value: "ko" | "en" | "ja") {
  vi.doMock("@/i18n/server-locale", () => ({
    getRequestLocale: vi.fn().mockResolvedValue(value),
  }));
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("locale wiring — sessions INSERT", () => {
  it("tarot/session: locale='en' 헤더 → sessions INSERT에 locale='en' 동봉", async () => {
    setupServerLocale("en");
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: () => mockDb }));
    vi.doMock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));

    const { POST } = await import("@/app/api/tarot/session/route");
    await POST(makePostRequest({ topic: "love", characterId: null, spreadType: "three-card" }));

    const sessionInsert = mockDb.insertCalls.find((c) => c.table === "sessions");
    expect(sessionInsert).toBeDefined();
    expect(sessionInsert!.data.locale).toBe("en");
  });

  it("saju/session: locale='ja' → sessions INSERT에 locale='ja' 동봉", async () => {
    setupServerLocale("ja");
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: () => mockDb }));
    vi.doMock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));

    const { POST } = await import("@/app/api/saju/session/route");
    await POST(makePostRequest({ topic: "saju-career", characterId: null }));

    const sessionInsert = mockDb.insertCalls.find((c) => c.table === "sessions");
    expect(sessionInsert).toBeDefined();
    expect(sessionInsert!.data.locale).toBe("ja");
  });

  it("shinjeom/session: locale='ko' → sessions INSERT에 locale='ko' 동봉", async () => {
    setupServerLocale("ko");
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: () => mockDb }));
    vi.doMock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));

    const { POST } = await import("@/app/api/shinjeom/session/route");
    await POST(makePostRequest({ topic: "love", characterId: "arcana" }));

    const sessionInsert = mockDb.insertCalls.find((c) => c.table === "sessions");
    expect(sessionInsert).toBeDefined();
    expect(sessionInsert!.data.locale).toBe("ko");
  });
});

describe("locale wiring — reading-saver", () => {
  it("saveTarotReading: locale 인자가 readings INSERT에 동봉", async () => {
    const { saveTarotReading } = await import("@/lib/db/reading-saver");
    const mockDb = makeMockDb();
    await saveTarotReading(
      mockDb as unknown as Parameters<typeof saveTarotReading>[0],
      "sess-1",
      { overallReading: "test", advice: "" },
      [{ cardId: "major-00", position: 0, isReversed: false }],
      "en"
    );
    const readingsInsert = mockDb.insertCalls.find((c) => c.table === "readings");
    expect(readingsInsert!.data.locale).toBe("en");
  });

  it("saveSajuReading: locale 인자가 saju_readings INSERT에 동봉", async () => {
    const { saveSajuReading } = await import("@/lib/db/reading-saver");
    const mockDb = makeMockDb();
    await saveSajuReading(
      mockDb as unknown as Parameters<typeof saveSajuReading>[0],
      "sess-2",
      { session_id: "sess-2", overall_reading: "" },
      "ja"
    );
    const sajuInsert = mockDb.insertCalls.find((c) => c.table === "saju_readings");
    expect(sajuInsert!.data.locale).toBe("ja");
  });

  it("saveShinjeomFinalReading: locale 인자가 shinjeom_readings INSERT에 동봉", async () => {
    const { saveShinjeomFinalReading } = await import("@/lib/db/reading-saver");
    const mockDb = makeMockDb();
    await saveShinjeomFinalReading(
      mockDb as unknown as Parameters<typeof saveShinjeomFinalReading>[0],
      "sess-3",
      { overallReading: "test", advice: "" },
      "en"
    );
    const shinInsert = mockDb.insertCalls.find((c) => c.table === "shinjeom_readings");
    expect(shinInsert!.data.locale).toBe("en");
  });

  it("saveTarotReading: locale 미지정 시 기본값 'ko'", async () => {
    const { saveTarotReading } = await import("@/lib/db/reading-saver");
    const mockDb = makeMockDb();
    await saveTarotReading(
      mockDb as unknown as Parameters<typeof saveTarotReading>[0],
      "sess-default",
      { overallReading: "", advice: "" },
      [{ cardId: "major-00", position: 0, isReversed: false }]
    );
    const readingsInsert = mockDb.insertCalls.find((c) => c.table === "readings");
    expect(readingsInsert!.data.locale).toBe("ko");
  });
});
