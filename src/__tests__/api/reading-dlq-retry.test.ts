import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { NextRequest } from "next/server";

setupDoMock();

function makeReq(secret?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret !== undefined) headers["x-dlq-secret"] = secret;
  return new NextRequest("http://localhost/api/internal/reading-dlq/retry", { method: "POST", headers });
}

interface SetupOpts {
  secret?: string;
  pending?: Record<string, unknown>[];
  dispatch?: ReturnType<typeof vi.fn>;
}

async function setup(opts: SetupOpts) {
  const mockDb = makeMockDb();
  mockDb.findMany.mockResolvedValue(opts.pending ?? []);
  mockDb.update.mockResolvedValue(null);
  const dispatch = opts.dispatch ?? vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/lib/env", () => ({ getDlqRetrySecret: vi.fn().mockReturnValue(opts.secret ?? "") }));
  vi.doMock("@/lib/db", () => ({ getAdminDb: vi.fn().mockReturnValue(mockDb) }));
  vi.doMock("@/lib/db/reading-saver", () => ({ dispatchFailedReadingSave: dispatch }));
  const { POST } = await import("@/app/api/internal/reading-dlq/retry/route");
  return { POST, mockDb, dispatch };
}

describe("POST /api/internal/reading-dlq/retry", () => {
  it("env 미설정(secret 빈값) → 404 (엔드포인트 비활성)", async () => {
    const { POST } = await setup({ secret: "" });
    const res = await POST(makeReq("anything"));
    expect(res.status).toBe(404);
  });

  it("secret 불일치 → 401", async () => {
    const { POST } = await setup({ secret: "right" });
    const res = await POST(makeReq("wrong"));
    expect(res.status).toBe(401);
  });

  it("secret 헤더 없음 → 401", async () => {
    const { POST } = await setup({ secret: "right" });
    const res = await POST(makeReq(undefined));
    expect(res.status).toBe(401);
  });

  it("pending 없음 → processed 0", async () => {
    const { POST } = await setup({ secret: "right", pending: [] });
    const res = await POST(makeReq("right"));
    expect(await res.json()).toEqual({ processed: 0, resolved: 0, failed: 0, abandoned: 0 });
  });

  it("dispatch 성공 → resolved + status=resolved 업데이트", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const { POST, mockDb } = await setup({
      secret: "right",
      pending: [{ id: "f-1", service: "tarot", session_id: "s1", payload: { reading: 1 }, attempts: 0 }],
      dispatch,
    });
    const res = await POST(makeReq("right"));
    const body = await res.json();
    expect(body.resolved).toBe(1);
    expect(dispatch).toHaveBeenCalledWith(mockDb, "tarot", "s1", { reading: 1 });
    expect(mockDb.update).toHaveBeenCalledWith("failed_readings", { id: "f-1" }, expect.objectContaining({ status: "resolved" }));
  });

  it("dispatch 실패 + attempts<MAX → pending 유지 + attempts++", async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error("still failing"));
    const { POST, mockDb } = await setup({
      secret: "right",
      pending: [{ id: "f-2", service: "saju", session_id: "s2", payload: {}, attempts: 1 }],
      dispatch,
    });
    const res = await POST(makeReq("right"));
    expect((await res.json()).failed).toBe(1);
    expect(mockDb.update).toHaveBeenCalledWith("failed_readings", { id: "f-2" }, expect.objectContaining({ status: "pending", attempts: 2 }));
  });

  it("dispatch 실패 + attempts MAX 도달 → abandoned", async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error("permanent"));
    const { POST, mockDb } = await setup({
      secret: "right",
      pending: [{ id: "f-3", service: "shinjeom", session_id: "s3", payload: {}, attempts: 4 }],
      dispatch,
    });
    const res = await POST(makeReq("right"));
    expect((await res.json()).abandoned).toBe(1);
    expect(mockDb.update).toHaveBeenCalledWith("failed_readings", { id: "f-3" }, expect.objectContaining({ status: "abandoned", attempts: 5 }));
  });
});
