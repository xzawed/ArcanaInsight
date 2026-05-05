import { describe, it, expect } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeResultRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_READING = {
  id: "r-3",
  share_token: "shinjeom-tok",
  overall_reading: "신점 테스트 결과",
  topic_reading: "주제 해석",
  advice: "조언",
};

async function setup() {
  return makeResultRouteSetup(
    () => import("@/app/api/shinjeom/result/[id]/route"),
    "http://localhost/api/shinjeom/result"
  );
}

describe("GET /api/shinjeom/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("shinjeom-tok"));
    expect(res.status).toBe(200);
    expect((await res.json()).reading).toEqual(MOCK_READING);
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
    const res = await GET(...makeGetRequest("shinjeom-tok"));
    expect(res.status).toBe(500);
  });

  it("shinjeom_readings 테이블에 share_token으로 조회", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok789"));
    expect(mockAdminDb.findOne).toHaveBeenCalledWith("shinjeom_readings", { share_token: "tok789" });
  });

  it("session_id 필드 응답에서 제거", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue({ ...MOCK_READING, session_id: "private-session-id" });
    const res = await GET(...makeGetRequest("shinjeom-tok"));
    const body = await res.json();
    expect(body.reading.session_id).toBeUndefined();
  });
});
