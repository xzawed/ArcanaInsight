import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { MOCK_USER, makeAuthMock } from "@/test-helpers/mock-auth";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makePostRequest } from "@/test-helpers/mock-request";

setupDoMock();

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

async function setup(opts: { user?: typeof MOCK_USER | null; claimed?: number; rateLimit?: boolean } = {}) {
  const mockDb = makeMockDb();
  mockDb.claimSessions.mockResolvedValue(opts.claimed ?? 2);
  const user = "user" in opts ? opts.user : MOCK_USER;

  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(opts.rateLimit ?? true),
    rateLimitResponse: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "rate limited" }), { status: 429 })
    ),
  }));
  vi.doMock("@/lib/db", () => ({
    getDb: vi.fn().mockReturnValue(mockDb),
    getAdminDb: vi.fn().mockReturnValue(mockDb),
  }));
  vi.doMock("@/lib/auth", () => makeAuthMock(user));

  const route = await import("@/app/api/sessions/claim/route");
  return { POST: route.POST as (req: Request) => Promise<Response>, mockDb };
}

describe("POST /api/sessions/claim", () => {
  it("로그인 + 유효 sessionIds → claimed 수 반환", async () => {
    const { POST, mockDb } = await setup({ claimed: 2 });
    const res = await POST(makePostRequest({ sessionIds: [UUID_A, UUID_B] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 2 });
    expect(mockDb.claimSessions).toHaveBeenCalledWith([UUID_A, UUID_B], MOCK_USER.id);
  });

  it("비로그인 → 401, claim 미호출", async () => {
    const { POST, mockDb } = await setup({ user: null });
    const res = await POST(makePostRequest({ sessionIds: [UUID_A] }));
    expect(res.status).toBe(401);
    expect(mockDb.claimSessions).not.toHaveBeenCalled();
  });

  it("빈 sessionIds → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ sessionIds: [] }));
    expect(res.status).toBe(400);
  });

  it("UUID가 아닌 값 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ sessionIds: ["not-a-uuid"] }));
    expect(res.status).toBe(400);
  });

  it("sessionIds 누락 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("100개 초과 → 400", async () => {
    const { POST } = await setup();
    const tooMany = Array.from({ length: 101 }, () => UUID_A);
    const res = await POST(makePostRequest({ sessionIds: tooMany }));
    expect(res.status).toBe(400);
  });

  it("rate limit 초과 → 429", async () => {
    const { POST, mockDb } = await setup({ rateLimit: false });
    const res = await POST(makePostRequest({ sessionIds: [UUID_A] }));
    expect(res.status).toBe(429);
    expect(mockDb.claimSessions).not.toHaveBeenCalled();
  });

  it("claimSessions 예외 → 500", async () => {
    const { POST, mockDb } = await setup();
    mockDb.claimSessions.mockRejectedValue(new Error("DB error"));
    const res = await POST(makePostRequest({ sessionIds: [UUID_A] }));
    expect(res.status).toBe(500);
  });

  it("claim 0건도 정상 200 (멱등 — 이미 소유/타인 소유)", async () => {
    const { POST } = await setup({ claimed: 0 });
    const res = await POST(makePostRequest({ sessionIds: [UUID_A] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 0 });
  });
});
