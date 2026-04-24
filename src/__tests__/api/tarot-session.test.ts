import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock, MOCK_USER } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";

setupDoMock();

const MOCK_SESSION = { id: "session-abc", service_type: "tarot", topic: "love", status: "in_progress" };

async function setup(options: { user?: typeof MOCK_USER | null } = {}) {
  const mockDb = makeMockDb();
  mockDb.insert.mockResolvedValue(MOCK_SESSION);

  const user = "user" in options ? options.user : MOCK_USER;
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/lib/auth", () => makeAuthMock(user));

  const { POST } = await import("@/app/api/tarot/session/route");
  return { POST, mockDb };
}

describe("POST /api/tarot/session", () => {
  it("유효한 요청 → session 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "love", characterId: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ session: MOCK_SESSION });
  });

  it("topic 누락 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ characterId: null }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("유효하지 않은 topic → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "invalid-topic", characterId: null }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid topic");
  });

  it("유효하지 않은 characterId → character_id: null로 저장", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love", characterId: "nonexistent-char" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ character_id: null }));
  });

  it("유효한 characterId → character_id에 반영", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love", characterId: "arcana" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ character_id: "arcana" }));
  });

  it("spreadType one-card → 그대로 사용", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love", spreadType: "one-card" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ spread_type: "one-card" }));
  });

  it("spreadType three-card → 그대로 사용", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love", spreadType: "three-card" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ spread_type: "three-card" }));
  });

  it("spreadType이 유효 3개 외 값이면 서비스 기본값 사용 (zodiac 등)", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love", spreadType: "zodiac" }));
    const callArg = mockDb.insert.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg.spread_type).not.toBe("zodiac");
    expect(callArg.spread_type).toBeTruthy();
  });

  it("spreadType 미지정 → sessionData.spreadType 사용", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "love" }));
    const callArg = mockDb.insert.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg.spread_type).toBeTruthy();
  });

  it("비로그인 사용자 → user_id: null", async () => {
    const { POST, mockDb } = await setup({ user: null });
    await POST(makePostRequest({ topic: "love" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: null }));
  });

  it("로그인 사용자 → user_id에 userId 반영", async () => {
    const { POST, mockDb } = await setup({ user: MOCK_USER });
    await POST(makePostRequest({ topic: "love" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: MOCK_USER.id }));
  });

  it("DB insert 실패 → 500", async () => {
    const { POST, mockDb } = await setup();
    mockDb.insert.mockRejectedValue(new Error("DB error"));
    const res = await POST(makePostRequest({ topic: "love" }));
    expect(res.status).toBe(500);
  });

  it("service_type이 tarot으로 설정", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "finance" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ service_type: "tarot" }));
  });
});
