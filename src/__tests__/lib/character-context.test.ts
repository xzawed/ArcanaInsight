import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb } from "@/test-helpers/mock-db";
import { getRecentCharacterMemory, fetchMemoryPrompt } from "@/lib/db/character-context";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/core/prompt-builder", () => ({
  buildCharacterMemoryPrompt: vi.fn((memories: unknown[]) =>
    memories.length === 0 ? "" : `메모리-프롬프트(${memories.length}개)`,
  ),
}));

describe("getRecentCharacterMemory", () => {
  it("세션 + 리딩 조회 → 메모리 반환", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([
      { id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" },
      { id: "s2", service_type: "saju",  created_at: "2026-03-15T00:00:00Z" },
    ]);
    db.findManyIn.mockResolvedValue([
      { session_id: "s1", overall_reading: "운이 좋다" },
      { session_id: "s2", overall_reading: "사주 분석 결과" },
    ]);

    const result = await getRecentCharacterMemory(db, "user-1", "arcana");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ serviceType: "tarot", date: "2026-04-01", overallReading: "운이 좋다" });
    expect(result[1]).toEqual({ serviceType: "saju",  date: "2026-03-15", overallReading: "사주 분석 결과" });
  });

  it("세션 없음 → 빈 배열", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("리딩 없는 세션은 스킵", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([{ id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" }]);
    db.findManyIn.mockResolvedValue([]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("DB 오류 시 빈 배열 반환 (리딩 계속)", async () => {
    const db = makeMockDb();
    db.findMany.mockRejectedValue(new Error("DB down"));
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("findMany가 limit=3, orderBy='created_at', orderDir='desc'로 호출됨", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    await getRecentCharacterMemory(db, "user-1", "arcana", 3);
    expect(db.findMany).toHaveBeenCalledWith(
      "sessions",
      { user_id: "user-1", character_id: "arcana", status: "completed" },
      { limit: 3, orderBy: "created_at", orderDir: "desc" },
    );
  });

  it("locale 지정 시 filter에 locale 포함", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    await getRecentCharacterMemory(db, "user-1", "arcana", 3, "en");
    expect(db.findMany).toHaveBeenCalledWith(
      "sessions",
      { user_id: "user-1", character_id: "arcana", status: "completed", locale: "en" },
      { limit: 3, orderBy: "created_at", orderDir: "desc" },
    );
  });

  it("locale 미지정 시 locale 필터 미포함", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(db.findMany).toHaveBeenCalledWith(
      "sessions",
      { user_id: "user-1", character_id: "arcana", status: "completed" },
      { limit: 3, orderBy: "created_at", orderDir: "desc" },
    );
  });

  it("overall_reading 150자 초과 시 잘림", async () => {
    const db = makeMockDb();
    const longText = "가".repeat(200);
    db.findMany.mockResolvedValue([{ id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" }]);
    db.findManyIn.mockResolvedValue([{ session_id: "s1", overall_reading: longText }]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result[0].overallReading).toHaveLength(150);
  });
});

describe("fetchMemoryPrompt", () => {
  let getCurrentUserMock: ReturnType<typeof vi.fn>;
  let getDbMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const authModule = await import("@/lib/auth");
    const dbModule = await import("@/lib/db");
    getCurrentUserMock = authModule.getCurrentUser as ReturnType<typeof vi.fn>;
    getDbMock = dbModule.getDb as ReturnType<typeof vi.fn>;
  });

  it("비인증 사용자(null) → 빈 문자열 반환", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("id 없는 사용자 객체 → 빈 문자열 반환", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "test@example.com" });
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("인증된 사용자 + 메모리 없음 → 빈 문자열 반환", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    getDbMock.mockReturnValue(db);

    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
  });

  it("인증된 사용자 + 메모리 있음 → 프롬프트 문자열 반환", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const db = makeMockDb();
    db.findMany.mockResolvedValue([
      { id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" },
    ]);
    db.findManyIn.mockResolvedValue([
      { session_id: "s1", overall_reading: "운이 좋다" },
    ]);
    getDbMock.mockReturnValue(db);

    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("메모리-프롬프트(1개)");
  });

  it("getCurrentUser throws → 빈 문자열 반환 (충돌 방지)", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("Auth service down"));
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
  });

  it("getDb throws → 빈 문자열 반환 (충돌 방지)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    getDbMock.mockImplementation(() => {
      throw new Error("DB init failed");
    });
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
  });
});
