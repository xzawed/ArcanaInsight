import { describe, it, expect } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeResultRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const MOCK_READING = { id: "r-1", share_token: "abc123", overall_reading: "테스트" };

async function setup() {
  return makeResultRouteSetup(
    () => import("@/app/api/tarot/result/[id]/route"),
    "http://localhost/api/tarot/result"
  );
}

describe("GET /api/tarot/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockDb, makeGetRequest } = await setup();
    mockDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(200);
    expect((await res.json()).reading).toEqual(MOCK_READING);
  });

  it("존재하지 않는 share_token → 404", async () => {
    const { GET, mockDb, makeGetRequest } = await setup();
    mockDb.findOne.mockResolvedValue(null);
    const res = await GET(...makeGetRequest("no-such-token"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Reading not found");
  });

  it("DB 오류 → 500", async () => {
    const { GET, mockDb, makeGetRequest } = await setup();
    mockDb.findOne.mockRejectedValue(new Error("DB error"));
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(500);
  });

  it("readings 테이블에 share_token으로 조회", async () => {
    const { GET, mockDb, makeGetRequest } = await setup();
    mockDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok123"));
    expect(mockDb.findOne).toHaveBeenCalledWith("readings", { share_token: "tok123" });
  });
});
