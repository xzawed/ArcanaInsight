import { describe, it, expect } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeResultRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_READING = {
  id: "r-1",
  share_token: "abc123",
  overall_reading: "테스트",
  card_interpretation: [],
  advice: "조언",
  created_at: "2026-05-05T00:00:00Z",
  user_id: "u-secret",        // SAFE_KEYS에 없는 필드 — 응답에서 제거되어야 함
  session_id: "s-secret",     // SAFE_KEYS에 없는 필드 — 응답에서 제거되어야 함
};

async function setup() {
  return makeResultRouteSetup(
    () => import("@/app/api/tarot/result/[id]/route"),
    "http://localhost/api/tarot/result"
  );
}

describe("GET /api/tarot/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reading.id).toBe("r-1");
    expect(body.reading.overall_reading).toBe("테스트");
    expect(body.reading.user_id).toBeUndefined();   // pickFields 필터 검증
    expect(body.reading.session_id).toBeUndefined(); // pickFields 필터 검증
  });

  it("존재하지 않는 share_token → 404", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(null);
    const res = await GET(...makeGetRequest("no-such-token"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Reading not found");
  });

  it("DB 오류 → 500", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockRejectedValue(new Error("DB error"));
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(500);
  });

  it("getAdminDb로 readings 테이블 share_token 조회", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok123"));
    expect(mockAdminDb.findOne).toHaveBeenCalledWith("readings", { share_token: "tok123" });
  });
});
