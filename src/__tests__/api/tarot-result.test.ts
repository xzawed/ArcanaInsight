import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";

setupDoMock();

const MOCK_READING = { id: "r-1", share_token: "abc123", overall_reading: "테스트" };

async function setup(dbOverrides?: Partial<ReturnType<typeof makeMockDb>>) {
  const mockDb = makeMockDb(dbOverrides);
  vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
  const { GET } = await import("@/app/api/tarot/result/[id]/route");
  return { GET, mockDb };
}

function makeGetRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  return [
    new NextRequest(`http://localhost/api/tarot/result/${id}`),
    { params: Promise.resolve({ id }) },
  ];
}

describe("GET /api/tarot/result/[id]", () => {
  it("존재하는 share_token → reading 반환", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockResolvedValue(MOCK_READING);
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(200);
    expect((await res.json()).reading).toEqual(MOCK_READING);
  });

  it("존재하지 않는 share_token → 404", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockResolvedValue(null);
    const res = await GET(...makeGetRequest("no-such-token"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Reading not found");
  });

  it("DB 오류 → 500", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockRejectedValue(new Error("DB error"));
    const res = await GET(...makeGetRequest("abc123"));
    expect(res.status).toBe(500);
  });

  it("readings 테이블에 share_token으로 조회", async () => {
    const { GET, mockDb } = await setup();
    mockDb.findOne.mockResolvedValue(MOCK_READING);
    await GET(...makeGetRequest("tok123"));
    expect(mockDb.findOne).toHaveBeenCalledWith("readings", { share_token: "tok123" });
  });
});
