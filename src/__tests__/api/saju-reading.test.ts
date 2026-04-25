import { describe, it, expect, vi } from "vitest";
import { setupDoMock } from "@/test-helpers/reset-modules";
import { makeMockDb } from "@/test-helpers/mock-db";
import { makeAuthMock } from "@/test-helpers/mock-auth";
import { makePostRequest } from "@/test-helpers/mock-request";
import { makeMockAiModule, readSSEStream } from "@/test-helpers/mock-ai";
import { makeStreamingRouteSetup } from "@/test-helpers/api-route-setup";

setupDoMock();

const VALID_BODY = {
  sessionId: null,
  topic: "saju-general",
  timeRange: "this-year",
  includeMonthly: false,
  characterId: "arcana",
  userInfo: {
    birthDate: "1990-01-15",
    birthHour: "자시 (23시~01시)",
    gender: "female",
  },
};

async function setup() {
  return makeStreamingRouteSetup(
    () => import("@/app/api/saju/reading/route"),
    (db) => {
      db.insert.mockResolvedValue({ id: "r-saju-1" });
      db.update.mockResolvedValue(null);
    }
  );
}

describe("POST /api/saju/reading", () => {
  it("유효한 요청 → SSE 스트림 응답", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readSSEStream(res);
    expect(text).toContain("data:");
  });

  it("body 없음 → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("유효하지 않은 topic → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, topic: "love" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid topic");
  });

  it("유효하지 않은 timeRange → 400", async () => {
    const { POST } = await setup();
    const res = await POST(makePostRequest({ ...VALID_BODY, timeRange: "invalid-range" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid timeRange");
  });

  it("rate limit 초과 → 429", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(false),
      rateLimitResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
    }));
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(makeMockDb()) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("스트림 완료 후 saveSajuReading fire-and-forget 호출", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/reading-saver", () => ({ saveSajuReading: mockSave }));
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: vi.fn().mockReturnValue(true),
      rateLimitResponse: vi.fn(),
    }));
    const mockDb = makeMockDb();
    vi.doMock("@/lib/db", () => ({ getDb: vi.fn().mockReturnValue(mockDb) }));
    vi.doMock("@/lib/auth", () => makeAuthMock());
    vi.doMock("@/services/core/fallback-provider", () => makeMockAiModule());
    const { POST } = await import("@/app/api/saju/reading/route");
    const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: "sess-saju" }));
    await readSSEStream(res);
    await Promise.resolve();
    expect(mockSave).toHaveBeenCalledWith(mockDb, "sess-saju", expect.any(Object));
  });
});
