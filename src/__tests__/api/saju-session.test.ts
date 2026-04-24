import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock, MOCK_USER } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";

setupDoMock();

const MOCK_SESSION = { id: "saju-session-abc", service_type: "saju", topic: "saju-general", status: "in_progress" };

async function setup(options: { user?: typeof MOCK_USER | null } = {}) {
  const mockDb = makeMockDb();
  mockDb.insert.mockResolvedValue(MOCK_SESSION);

  const user = "user" in options ? options.user : MOCK_USER;
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/lib/auth", () => makeAuthMock(user));

  const { POST } = await import("@/app/api/saju/session/route");
  return { POST, mockDb };
}

describe("POST /api/saju/session", () => {
  it("유효한 요청 → session 반환", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "saju-general", characterId: null }));
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

  it("타로 topic은 사주에서 거부 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "finance", characterId: null }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid topic");
  });

  it("유효하지 않은 characterId → character_id: null로 저장", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "saju-love-single", characterId: "no-such-char" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ character_id: null }));
  });

  it("유효한 characterId → character_id에 반영", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "saju-career", characterId: "arcana" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ character_id: "arcana" }));
  });

  it("비로그인 사용자 → user_id: null", async () => {
    const { POST, mockDb } = await setup({ user: null });
    await POST(makePostRequest({ topic: "saju-general" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: null }));
  });

  it("로그인 사용자 → user_id에 userId 반영", async () => {
    const { POST, mockDb } = await setup({ user: MOCK_USER });
    await POST(makePostRequest({ topic: "saju-general" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ user_id: MOCK_USER.id }));
  });

  it("service_type이 saju로 설정, spread_type은 null", async () => {
    const { POST, mockDb } = await setup();
    await POST(makePostRequest({ topic: "saju-health" }));
    expect(mockDb.insert).toHaveBeenCalledWith("sessions", expect.objectContaining({ service_type: "saju", spread_type: null }));
  });

  it("DB insert 실패 → 500", async () => {
    const { POST, mockDb } = await setup();
    mockDb.insert.mockRejectedValue(new Error("DB error"));
    const res = await POST(makePostRequest({ topic: "saju-general" }));
    expect(res.status).toBe(500);
  });

  it("saju-auspicious-date topic → 200 정상 처리", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ topic: "saju-auspicious-date" }));
    expect(res.status).toBe(200);
  });
});
