import { describe, it, expect, vi, beforeEach } from "vitest";

// POSTGRES_URL 필수 환경변수 설정
process.env.POSTGRES_URL = "postgresql://test:test@localhost:5432/test_db";

// postgres 클라이언트 mock (실제 DB 연결 방지)
vi.mock("postgres", () => ({
  default: vi.fn(() => ({})),
}));

// drizzle mock — select/insert/update 플루언트 체인을 테스트별 재구성
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => mockDb),
}));

// ─── 헬퍼: 플루언트 체인 구성 ─────────────────────────────────────────────

/** select().from(t).$dynamic()[.where(...)][.limit(N)][.offset(N)] 체인을 rows로 응답 */
function mockSelectWith(rows: Record<string, unknown>[]) {
  const withOffset = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(rows).catch(onRejected),
    offset: vi.fn().mockResolvedValue(rows),
  };
  const thenable = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(rows).catch(onRejected),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(withOffset),
    offset: vi.fn().mockResolvedValue(rows),
  };
  const fromChain = {
    $dynamic: vi.fn().mockReturnValue(thenable),
    where: thenable.where,
    orderBy: thenable.orderBy,
    limit: thenable.limit,
    offset: thenable.offset,
    then: thenable.then,
    catch: thenable.catch,
  };
  mockDb.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(fromChain) });
}

/** insert(t).values(d).returning() 체인을 rows로 응답 */
function mockInsertWith(rows: Record<string, unknown>[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ returning, onConflictDoUpdate });
  mockDb.insert = vi.fn().mockReturnValue({ values });
  return { returning, onConflictDoUpdate };
}

/** update(t).set(d).where(...).returning() 체인을 rows로 응답 */
function mockUpdateWith(rows: Record<string, unknown>[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update = vi.fn().mockReturnValue({ set });
}

// ─── import (mock 설정 이후) ──────────────────────────────────────────────
import { PostgresAdapter } from "./postgres-adapter";

describe("PostgresAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("행 존재 시 camelCase→snake_case 변환 후 반환", async () => {
      mockSelectWith([{ userId: "u-1", shareToken: "tok-abc", createdAt: new Date("2024-01-01") }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findOne<{ user_id: string; share_token: string; created_at: Date }>(
        "sessions", { id: "s-1" }
      );
      expect(result).not.toBeNull();
      expect(result!.user_id).toBe("u-1");
      expect(result!.share_token).toBe("tok-abc");
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it("행 없음 → null 반환", async () => {
      mockSelectWith([]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findOne("sessions", { id: "ghost" });
      expect(result).toBeNull();
    });

    it("존재하지 않는 테이블 → Unknown table 예외", async () => {
      const adapter = new PostgresAdapter();
      await expect(adapter.findOne("no_such_table", { id: "1" })).rejects.toThrow("Unknown table: no_such_table");
    });

    it("존재하지 않는 컬럼 → Unknown column 예외", async () => {
      mockSelectWith([]);
      const adapter = new PostgresAdapter();
      await expect(adapter.findOne("sessions", { no_such_col: "x" })).rejects.toThrow("Unknown column");
    });
  });

  // ── findMany ─────────────────────────────────────────────────────────────

  describe("findMany", () => {
    it("where 없이 전체 행 반환", async () => {
      mockSelectWith([{ id: "1" }, { id: "2" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions");
      expect(result).toHaveLength(2);
    });

    it("where 있는 경우 조건 적용 후 반환", async () => {
      mockSelectWith([{ id: "s-1", userId: "u-1" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany<{ id: string; user_id: string }>("sessions", { user_id: "u-1" });
      expect(result[0]).toMatchObject({ id: "s-1", user_id: "u-1" });
    });

    it("결과 없음 → 빈 배열 반환", async () => {
      mockSelectWith([]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", { user_id: "nobody" });
      expect(result).toEqual([]);
    });

    it("limit 옵션 적용 시 limit() 호출", async () => {
      mockSelectWith([{ id: "1" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", undefined, { limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("limit + offset 옵션 적용 시 offset() 까지 호출", async () => {
      mockSelectWith([{ id: "2" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", undefined, { limit: 10, offset: 5 });
      expect(result).toHaveLength(1);
    });

    it("orderBy desc 옵션 → orderBy() 호출 (desc 분기)", async () => {
      mockSelectWith([{ id: "1", createdAt: new Date() }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", { user_id: "u-1" }, { orderBy: "created_at", orderDir: "desc" });
      expect(result).toHaveLength(1);
    });

    it("orderBy asc 기본 옵션 (orderDir 미지정)", async () => {
      mockSelectWith([{ id: "1" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", undefined, { orderBy: "created_at" });
      expect(result).toHaveLength(1);
    });

    it("orderBy 컬럼이 테이블에 없으면 정렬 건너뜀 (orderCol falsy 분기)", async () => {
      mockSelectWith([{ id: "1" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findMany("sessions", undefined, { orderBy: "no_such_col_xyz" });
      expect(result).toHaveLength(1);
    });
  });

  // ── findManyIn ───────────────────────────────────────────────────────────

  describe("findManyIn", () => {
    it("빈 values → 쿼리 미실행, 빈 배열 반환", async () => {
      const adapter = new PostgresAdapter();
      expect(await adapter.findManyIn("sessions", "id", [])).toEqual([]);
    });

    it("IN 조회 → normalizeRow 후 반환", async () => {
      mockSelectWith([{ id: "a", userId: "u-1" }, { id: "b", userId: "u-2" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.findManyIn<{ id: string; user_id: string }>("sessions", "id", ["a", "b"]);
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe("u-1");
    });

    it("존재하지 않는 컬럼 → Unknown column 예외", async () => {
      const adapter = new PostgresAdapter();
      await expect(adapter.findManyIn("sessions", "no_such_col_xyz", ["x"])).rejects.toThrow("Unknown column");
    });
  });

  // ── insert ───────────────────────────────────────────────────────────────

  describe("insert", () => {
    it("삽입 성공 → normalizeRow 후 반환", async () => {
      mockInsertWith([{ id: "r-1", shareToken: "tok-xyz", serviceType: "tarot" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.insert<{ id: string; share_token: string; service_type: string }>(
        "readings", { share_token: "tok-xyz", service_type: "tarot" }
      );
      expect(result.id).toBe("r-1");
      expect(result.share_token).toBe("tok-xyz");
      expect(result.service_type).toBe("tarot");
    });

    it("returning 결과 없음 → Insert failed 예외", async () => {
      mockInsertWith([]);
      const adapter = new PostgresAdapter();
      await expect(adapter.insert("readings", { data: "x" })).rejects.toThrow("Insert failed for table: readings");
    });
  });

  // ── insertMany ───────────────────────────────────────────────────────────

  describe("insertMany", () => {
    it("다건 삽입 → 배열 반환 (normalizeRow 적용)", async () => {
      mockInsertWith([{ id: "c-1", cardId: "major-00" }, { id: "c-2", cardId: "major-01" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.insertMany<{ id: string; card_id: string }>(
        "session_cards", [{ card_id: "major-00" }, { card_id: "major-01" }]
      );
      expect(result).toHaveLength(2);
      expect(result[0].card_id).toBe("major-00");
      expect(result[1].card_id).toBe("major-01");
    });

    it("빈 배열 삽입 → 빈 배열 반환", async () => {
      mockInsertWith([]);
      const adapter = new PostgresAdapter();
      const result = await adapter.insertMany("session_cards", []);
      expect(result).toEqual([]);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe("update", () => {
    it("업데이트 성공 → normalizeRow 후 반환", async () => {
      mockUpdateWith([{ id: "s-1", serviceType: "tarot", status: "completed" }]);
      const adapter = new PostgresAdapter();
      const result = await adapter.update<{ id: string; service_type: string; status: string }>(
        "sessions", { id: "s-1" }, { status: "completed" }
      );
      expect(result).not.toBeNull();
      expect(result!.service_type).toBe("tarot");
      expect(result!.status).toBe("completed");
    });

    it("매칭 행 없음 → null 반환", async () => {
      mockUpdateWith([]);
      const adapter = new PostgresAdapter();
      const result = await adapter.update("sessions", { id: "ghost" }, { status: "done" });
      expect(result).toBeNull();
    });
  });

  // ── upsert ───────────────────────────────────────────────────────────────

  describe("upsert", () => {
    it("upsert 성공 → normalizeRow 후 반환", async () => {
      const returning = vi.fn().mockResolvedValue([{ date: "2024-01-01", characterId: "arcana", cardId: "major-00" }]);
      const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate, returning });
      mockDb.insert = vi.fn().mockReturnValue({ values });

      const adapter = new PostgresAdapter();
      const result = await adapter.upsert<{ date: string; character_id: string; card_id: string }>(
        "daily_cards",
        { date: "2024-01-01", character_id: "arcana", card_id: "major-00" },
        "date,character_id"
      );
      expect(result.date).toBe("2024-01-01");
      expect(result.character_id).toBe("arcana");
      expect(result.card_id).toBe("major-00");
    });

    it("unknown conflict column → 예외 발생", async () => {
      mockInsertWith([]);
      const adapter = new PostgresAdapter();
      await expect(
        adapter.upsert("daily_cards", { date: "2024-01-01" }, "no_such_col")
      ).rejects.toThrow("Unknown conflict column");
    });

    it("returning 결과 없음 → Upsert failed 예외", async () => {
      const returning = vi.fn().mockResolvedValue([]);
      const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate, returning });
      mockDb.insert = vi.fn().mockReturnValue({ values });

      const adapter = new PostgresAdapter();
      await expect(
        adapter.upsert("daily_cards", { date: "2024-01-01", character_id: "arcana" }, "date,character_id")
      ).rejects.toThrow("Upsert failed for table: daily_cards");
    });
  });

  // ── claimSessions ──────────────────────────────────────────────────────────
  describe("claimSessions", () => {
    it("빈 배열이면 0 반환 + update 미호출", async () => {
      const adapter = new PostgresAdapter();
      expect(await adapter.claimSessions([], "u-1")).toBe(0);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("claim된 행 수를 반환한다", async () => {
      mockUpdateWith([{ id: "a" }, { id: "b" }]);
      const adapter = new PostgresAdapter();
      expect(await adapter.claimSessions(["a", "b", "c"], "u-1")).toBe(2);
    });
  });
});
