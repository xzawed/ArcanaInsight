import { describe, it, expect } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeResultRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_READING = { id: "r-2", share_token: "saju-tok", overall_reading: "사주 테스트" };

async function setup() {
  return makeResultRouteSetup(
    () => import("@/app/api/saju/result/[id]/route"),
    "http://localhost/api/saju/result"
  );
}

describe("GET /api/saju/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("saju-tok"));
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
    const res = await GET(...makeGetRequest("saju-tok"));
    expect(res.status).toBe(500);
  });

  it("saju_readings 테이블에 share_token으로 조회", async () => {
    const { GET, mockAdminDb, makeGetRequest } = await setup();
    mockAdminDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok456"));
    expect(mockAdminDb.findOne).toHaveBeenCalledWith("saju_readings", { share_token: "tok456" });
  });
});
