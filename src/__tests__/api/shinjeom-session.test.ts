import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { MOCK_USER } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeSessionRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_SESSION = { id: "shinjeom-session-abc", service_type: "shinjeom", topic: "shinjeom-general", status: "in_progress" };

async function setup(options: { user?: typeof MOCK_USER | null } = {}) {
  return makeSessionRouteSetup(() => import("@/app/api/shinjeom/session/route"), MOCK_SESSION, options);
}

describe("POST /api/shinjeom/session", () => {
  it("유효한 요청 → session 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "shinjeom-general", characterId: "arcana" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ session: MOCK_SESSION });
  });

  it("topic 누락 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("characterId 누락 → 400 (신점은 characterId 필수)", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "shinjeom-general" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("DB insert 실패해도 200 반환 (신점은 세션 없이 계속 진행)", async () => {
    const { POST, mockDb } = await setup();
    mockDb.insert.mockRejectedValue(new Error("DB unavailable"));
    const res = await POST(makePostRequest({ topic: "shinjeom-love", characterId: "arcana" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ session: null });
  });

  it("getCurrentUser 실패해도 200 반환 (신점은 세션 없이 계속)", async () => {
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => ({
      getCurrentUser: vi.fn().mockRejectedValue(new Error("Auth service down")),
    }));
    const { POST } = await import("@/app/api/shinjeom/session/route");
    const res = await POST(makePostRequest({ topic: "shinjeom-health", characterId: "luna" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: null });
  });

  it("비로그인 사용자 → user_id: null로 저장", async () => {
    const { POST, mockDb } = await setup({ user: null });
    await POST(makePostRequest({ topic: "shinjeom-general", characterId: "arcana" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: null }));
  });

  it("로그인 사용자 → user_id에 userId 반영", async () => {
    const { POST, mockDb } = await setup({ user: MOCK_USER });
    await POST(makePostRequest({ topic: "shinjeom-general", characterId: "arcana" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: MOCK_USER.id }));
  });

  it("service_type이 shinjeom으로 설정", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "shinjeom-wealth", characterId: "miko" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ service_type: "shinjeom" }));
  });

  it("topic이 insert에 전달됨", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "shinjeom-career", characterId: "rei" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ topic: "shinjeom-career" }));
  });

  it("shinjeom-auspicious topic → 200 정상 처리", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "shinjeom-auspicious", characterId: "hoshi" }));
    expect(res.status).toBe(200);
    expect((await res.json()).session).toEqual(MOCK_SESSION);
  });

  it("request.json() 실패 시 500 반환 (outer catch)", async () => {
    const { POST } = await setup();
    const badRequest = new (await import("next/server")).NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid { json {{",
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error");
  });

  it("checkRateLimit 예외 → 500 (outer catch 커버리지)", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockRejectedValue(new Error("redis error")),
      rateLimitResponse: vi.fn(),
    }));
    const { POST } = await import("@/app/api/shinjeom/session/route");
    const res = await POST(makePostRequest({ topic: "shinjeom-general", characterId: "arcana" }));
    expect(res.status).toBe(500);
  });
});
