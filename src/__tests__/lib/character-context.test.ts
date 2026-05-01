import { describe, it, expect } from "vitest";
import { makeMockDb } from "@/test-helpers/mock-db";
import { getRecentCharacterMemory } from "@/lib/db/character-context";

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

  it("overall_reading 150자 초과 시 잘림", async () => {
    const db = makeMockDb();
    const longText = "가".repeat(200);
    db.findMany.mockResolvedValue([{ id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" }]);
    db.findManyIn.mockResolvedValue([{ session_id: "s1", overall_reading: longText }]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result[0].overallReading).toHaveLength(150);
  });
});
