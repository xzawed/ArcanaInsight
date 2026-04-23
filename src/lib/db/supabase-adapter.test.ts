import { describe, it, expect, vi, beforeEach } from "vitest";

/** Supabase 쿼리 체인을 모킹하는 헬퍼 */
function makeChain(result: { data?: unknown; error?: { code?: string; message: string } | null }) {
  const outcome = { data: result.data ?? null, error: result.error ?? null };
  // findMany는 쿼리 객체를 직접 await 하므로 Promise thenable이어야 한다
  const chain: Record<string, unknown> & PromiseLike<typeof outcome> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(outcome),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    then: (resolve: (v: typeof outcome) => void) => Promise.resolve(outcome).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(outcome).catch(reject),
  };
  return chain;
}

// @/lib/supabase/server 모킹
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { SupabaseAdapter } from "./supabase-adapter";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe("SupabaseAdapter", () => {
  let adapter: SupabaseAdapter;

  beforeEach(() => {
    adapter = new SupabaseAdapter();
    vi.clearAllMocks();
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("데이터가 있으면 첫 번째 행을 반환한다", async () => {
      const row = { id: "1", name: "테스트" };
      const chain = makeChain({ data: row });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.findOne("profiles", { id: "1" });
      expect(result).toEqual(row);
    });

    it("PGRST116 에러이면 null을 반환한다", async () => {
      const chain = makeChain({ error: { code: "PGRST116", message: "no rows found" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.findOne("profiles", { id: "999" });
      expect(result).toBeNull();
    });

    it("기타 에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { code: "42P01", message: "table not found" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.findOne("nonexistent", { id: "1" })).rejects.toThrow("42P01");
    });

    it("where 조건이 여러 개이면 eq가 여러 번 호출된다", async () => {
      const chain = makeChain({ data: { id: "1" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await adapter.findOne("sessions", { user_id: "u1", session_type: "tarot" });
      expect(chain.eq).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findMany ─────────────────────────────────────────────────────────────

  describe("findMany", () => {
    it("데이터 배열을 반환한다", async () => {
      const rows = [{ id: "1" }, { id: "2" }];
      const chain = makeChain({ data: rows });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.findMany("sessions", { user_id: "u1" });
      expect(result).toEqual(rows);
    });

    it("where 없으면 필터 없이 조회한다", async () => {
      const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];
      const chain = makeChain({ data: rows });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.findMany("services");
      expect(result).toEqual(rows);
      expect(chain.eq).not.toHaveBeenCalled();
    });

    it("data가 null이면 빈 배열을 반환한다", async () => {
      const chain = makeChain({ data: null });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.findMany("sessions");
      expect(result).toEqual([]);
    });

    it("에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { code: "500", message: "DB connection failed" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.findMany("sessions")).rejects.toThrow("DB connection failed");
    });
  });

  // ─── insert ───────────────────────────────────────────────────────────────

  describe("insert", () => {
    it("삽입된 행을 반환한다", async () => {
      const inserted = { id: "new-1", content: "리딩 내용" };
      const chain = makeChain({ data: inserted });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.insert("readings", { content: "리딩 내용" });
      expect(result).toEqual(inserted);
    });

    it("에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { message: "unique constraint violated" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.insert("sessions", { id: "dup" })).rejects.toThrow("unique constraint violated");
    });
  });

  // ─── insertMany ───────────────────────────────────────────────────────────

  describe("insertMany", () => {
    it("삽입된 행 배열을 반환한다", async () => {
      const inserted = [{ id: "1" }, { id: "2" }];
      const chain = makeChain({ data: inserted });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.insertMany("session_cards", [{ card_id: "c1" }, { card_id: "c2" }]);
      expect(result).toEqual(inserted);
    });

    it("data가 null이면 빈 배열을 반환한다", async () => {
      const chain = makeChain({ data: null });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.insertMany("session_cards", []);
      expect(result).toEqual([]);
    });

    it("에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { message: "FK constraint" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.insertMany("session_cards", [{ card_id: "x" }])).rejects.toThrow("FK constraint");
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe("update", () => {
    it("업데이트된 행을 반환한다", async () => {
      const updated = { id: "1", status: "done" };
      const chain = makeChain({ data: updated });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.update("sessions", { id: "1" }, { status: "done" });
      expect(result).toEqual(updated);
    });

    it("PGRST116이면 null을 반환한다", async () => {
      const chain = makeChain({ error: { code: "PGRST116", message: "no rows matched" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.update("sessions", { id: "999" }, { status: "done" });
      expect(result).toBeNull();
    });

    it("기타 에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { code: "23503", message: "FK violation" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.update("sessions", { id: "1" }, { bad_col: "x" })).rejects.toThrow("23503");
    });
  });

  // ─── upsert ───────────────────────────────────────────────────────────────

  describe("upsert", () => {
    it("upsert된 행을 반환한다", async () => {
      const row = { date: "2026-04-23", character_id: "arcana", content: "운세" };
      const chain = makeChain({ data: row });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      const result = await adapter.upsert("daily_cards", row, "date,character_id");
      expect(result).toEqual(row);
    });

    it("에러이면 Error를 던진다", async () => {
      const chain = makeChain({ error: { message: "upsert failed" } });
      mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });

      await expect(adapter.upsert("daily_cards", {}, "date")).rejects.toThrow("upsert failed");
    });
  });
});
