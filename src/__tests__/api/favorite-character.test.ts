import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock, MOCK_USER } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";

setupDoMock();

function makeGetRequest(url = "http://localhost/api/profile/favorite-character"): NextRequest {
  return new NextRequest(url);
}

async function setup(options: { user?: typeof MOCK_USER | null } = {}) {
  const mockDb = makeMockDb();
  const mockAdminDb = makeMockDb();
  mockDb.update.mockResolvedValue({ id: MOCK_USER.id, favorite_character_id: "arcana" });
  mockAdminDb.update.mockResolvedValue({ id: MOCK_USER.id, favorite_character_id: "arcana" });
  mockDb.findOne.mockResolvedValue({ favorite_character_id: "arcana" });

  const user = "user" in options ? options.user : MOCK_USER;
  vi.doMock("@/lib/db", () => ({
    getDb: vi.fn().mockReturnValue(mockDb),
    getAdminDb: vi.fn().mockReturnValue(mockAdminDb),
  }));
  vi.doMock("@/lib/auth", () => makeAuthMock(user));
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(true),
    rateLimitResponse: vi.fn(),
  }));

  const { GET, POST } = await import("@/app/api/profile/favorite-character/route");
  return { GET, POST, mockDb, mockAdminDb };
}

describe("GET /api/profile/favorite-character", () => {
  it("선호 상담사 있음 → characterId 반환", async () => {
    const { GET } = await setup();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).characterId).toBe("arcana");
  });

  it("선호 상담사 없음 → characterId: null", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockResolvedValue({ favorite_character_id: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).characterId).toBeNull();
  });

  it("프로필 없음 → characterId: null", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).characterId).toBeNull();
  });

  it("미인증 사용자 → 401", async () => {
    const { GET } = await setup({ user: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("DB 조회 실패 → 500", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockRejectedValue(new Error("DB error"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/profile/favorite-character", () => {
  it("유효한 characterId → success 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "arcana" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("characterId: null → 선호 상담사 해제 (success)", async () => {
    const { POST, mockAdminDb } = await setup();
    mockAdminDb.update.mockResolvedValue({ id: MOCK_USER.id, favorite_character_id: null });
    const res = await POST(makePostRequest({ characterId: null }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockAdminDb.update).toHaveBeenCalledWith("profiles", { id: MOCK_USER.id }, { favorite_character_id: null });
  });

  it("존재하지 않는 characterId → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: "nonexistent-char" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid character");
  });

  it("미인증 사용자 → 401", async () => {
    const { POST } = await setup({ user: null });
    const res = await POST(makePostRequest({ characterId: "arcana" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("DB update 실패 → 500", async () => {
    const { POST, mockAdminDb } = await setup();
    mockAdminDb.update.mockRejectedValue(new Error("DB error"));
    const res = await POST(makePostRequest({ characterId: "arcana" }));
    expect(res.status).toBe(500);
  });

  it("body 없음 (빈 객체) → 400 (Zod 검증 실패)", async () => {
    const { POST } = await setup();
    const req = new Request("http://localhost/api/profile/favorite-character", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    })
    const res = await POST(req as unknown as import("next/server").NextRequest)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Invalid request body")
  });
});
