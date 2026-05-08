import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_USER } from "@/test-helpers/mock-auth";
import { makeMockDb } from "@/test-helpers/mock-db";

describe("assertSessionOwnership", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doMock("@/lib/env", () => ({ getDbProvider: vi.fn().mockReturnValue("supabase") }));
  });

  async function setup(session: { user_id: string | null } | null, user: typeof MOCK_USER | null = MOCK_USER) {
    const adminDb = makeMockDb();
    adminDb.findOne.mockResolvedValue(session);
    const getDb = vi.fn().mockReturnValue(makeMockDb());
    const getAdminDb = vi.fn().mockReturnValue(adminDb);

    vi.doMock("@/lib/db", () => ({ getDb, getAdminDb }));
    vi.doMock("@/lib/auth/supabase-auth", () => ({
      getSupabaseUser: vi.fn().mockResolvedValue(user),
    }));

    const { assertSessionOwnership } = await import("@/lib/auth");
    return { assertSessionOwnership, getDb, getAdminDb, adminDb };
  }

  it("service-role admin DB로 세션을 조회한다", async () => {
    const { assertSessionOwnership, getDb, getAdminDb, adminDb } = await setup({ user_id: null });

    const result = await assertSessionOwnership("session-id");

    expect(result).toBeNull();
    expect(getAdminDb).toHaveBeenCalledTimes(1);
    expect(getDb).not.toHaveBeenCalled();
    expect(adminDb.findOne).toHaveBeenCalledWith("sessions", { id: "session-id" });
  });

  it("익명 세션은 통과시킨다", async () => {
    const { assertSessionOwnership } = await setup({ user_id: null }, null);

    await expect(assertSessionOwnership("anonymous-session")).resolves.toBeNull();
  });

  it("세션이 없으면 404를 반환한다", async () => {
    const { assertSessionOwnership } = await setup(null);

    const result = await assertSessionOwnership("missing-session");

    expect(result?.status).toBe(404);
  });

  it("소유 세션에 비인증 사용자가 접근하면 403을 반환한다", async () => {
    const { assertSessionOwnership } = await setup({ user_id: "owner-id" }, null);

    const result = await assertSessionOwnership("owned-session");

    expect(result?.status).toBe(403);
  });

  it("현재 사용자가 세션 소유자면 통과시킨다", async () => {
    const { assertSessionOwnership } = await setup({ user_id: MOCK_USER.id }, MOCK_USER);

    await expect(assertSessionOwnership("owned-session")).resolves.toBeNull();
  });
});
