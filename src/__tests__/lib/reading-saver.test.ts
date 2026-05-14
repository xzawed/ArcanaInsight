import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  saveTarotReading,
  saveSajuReading,
  saveShinjeomFinalReading,
  saveShinjeomMessages,
} from "@/lib/db/reading-saver";
import { makeMockDb } from "@/test-helpers/mock-db";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("saveTarotReading", () => {
  it("insert + update + insertMany 호출", async () => {
    const db = makeMockDb();
    db.insert.mockResolvedValue({ id: "r-1" });
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);

    await saveTarotReading(
      db,
      "sess-1",
      { overallReading: "전체 리딩", advice: "조언" },
      [{ cardId: "major-00", position: 0, isReversed: false }]
    );

    expect(db.insert).toHaveBeenCalledWith("readings", expect.objectContaining({ session_id: "sess-1" }));
    expect(db.update).toHaveBeenCalledWith("sessions", { id: "sess-1" }, expect.objectContaining({ status: "completed" }));
    expect(db.insertMany).toHaveBeenCalledWith("session_cards", expect.arrayContaining([
      expect.objectContaining({ card_id: "major-00", position: 0 }),
    ]));
  });
});

describe("saveSajuReading", () => {
  it("insert + update 호출", async () => {
    const db = makeMockDb();
    db.insert.mockResolvedValue({ id: "saju-1" });
    db.update.mockResolvedValue(null);

    await saveSajuReading(db, "sess-2", { session_id: "sess-2", overall_reading: "사주 리딩" });

    expect(db.insert).toHaveBeenCalledWith("saju_readings", expect.objectContaining({ session_id: "sess-2" }));
    expect(db.update).toHaveBeenCalledWith("sessions", { id: "sess-2" }, expect.objectContaining({ status: "completed" }));
  });
});

describe("saveShinjeomFinalReading", () => {
  it("insert + update 호출", async () => {
    const db = makeMockDb();
    db.insert.mockResolvedValue({ id: "sh-1", share_token: "tok-sh-1" });
    db.update.mockResolvedValue(null);

    const result = await saveShinjeomFinalReading(db, "sess-3", { overallReading: "신점 결과", advice: "조언" });

    expect(db.insert).toHaveBeenCalledWith("shinjeom_readings", expect.objectContaining({
      session_id: "sess-3",
      overall_reading: "신점 결과",
    }));
    expect(db.update).toHaveBeenCalledWith("sessions", { id: "sess-3" }, expect.objectContaining({ status: "completed" }));
    expect(result.shareToken).toBe("tok-sh-1");
  });

  it("insert에서 share_token 없을 때 shareToken은 null", async () => {
    const db = makeMockDb();
    db.insert.mockResolvedValue({ id: "sh-2" });
    db.update.mockResolvedValue(null);

    const result = await saveShinjeomFinalReading(db, "sess-3b", { overallReading: "결과", advice: "조언" });

    expect(result.shareToken).toBeNull();
  });
});

describe("saveShinjeomMessages", () => {
  it("user/character 메시지 쌍 insertMany 호출", async () => {
    const db = makeMockDb();
    db.insertMany.mockResolvedValue([]);

    await saveShinjeomMessages(db, "sess-4", "사용자 메시지", "캐릭터 응답", 2);

    expect(db.insertMany).toHaveBeenCalledWith("shinjeom_messages", [
      expect.objectContaining({ role: "user", content: "사용자 메시지", message_index: 2 }),
      expect.objectContaining({ role: "character", content: "캐릭터 응답", message_index: 3 }),
    ]);
  });
});

describe("withRetry — 재시도 동작", () => {
  it("첫 번째 시도 성공 → 1회만 호출", async () => {
    const db = makeMockDb();
    db.insert.mockResolvedValue({ id: "r-1" });
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);

    await saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, []);

    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("일시적 오류 2회 후 성공 → 3회 호출", async () => {
    const db = makeMockDb();
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);
    db.insert
      .mockRejectedValueOnce(new Error("connection timeout"))
      .mockRejectedValueOnce(new Error("connection timeout"))
      .mockResolvedValue({ id: "r-1" });

    const p = saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, []);
    // 핸들러를 먼저 붙인 후 타이머 전진 — unhandled rejection 방지
    const settled = p.then(() => "ok").catch(() => "ok");
    await vi.runAllTimersAsync();
    await settled;

    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("3회 모두 실패 → 마지막 에러 throw", async () => {
    const db = makeMockDb();
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);
    const err = new Error("persistent failure");
    db.insert.mockRejectedValue(err);

    const p = saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, []);
    // 핸들러를 먼저 붙인 후 타이머 전진 — unhandled rejection 방지
    const assertion = expect(p).rejects.toThrow("persistent failure");
    await vi.runAllTimersAsync();
    await assertion;

    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("영구 에러(PostgreSQL 23xxx) → 즉시 throw, 재시도 없음", async () => {
    const db = makeMockDb();
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);
    const permanentErr = Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
    db.insert.mockRejectedValue(permanentErr);

    await expect(saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, [])).rejects.toThrow("duplicate key");
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("영구 에러(42xxx syntax) → 즉시 throw", async () => {
    const db = makeMockDb();
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);
    const syntaxErr = Object.assign(new Error("syntax error near SELECT"), { code: "42601" });
    db.insert.mockRejectedValue(syntaxErr);

    await expect(saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, [])).rejects.toThrow("syntax error");
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("영구 에러(메시지 패턴) → 즉시 throw", async () => {
    const db = makeMockDb();
    db.update.mockResolvedValue(null);
    db.insertMany.mockResolvedValue([]);
    const constraintErr = new Error("violates foreign key constraint");
    db.insert.mockRejectedValue(constraintErr);

    await expect(saveTarotReading(db, "s", { overallReading: "o", advice: "a" }, [])).rejects.toThrow("violates");
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
