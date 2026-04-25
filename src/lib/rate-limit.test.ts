import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, rateLimitResponse } from "./rate-limit";

// UPSTASH 환경변수 미설정 → in-memory fallback 경로 테스트
describe("checkRateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 번째 요청은 항상 허용", async () => {
    expect(await checkRateLimit("test-key-1", 5, 60_000)).toBe(true);
  });

  it("한도 내 요청은 허용", async () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      expect(await checkRateLimit(key, 5, 60_000)).toBe(true);
    }
  });

  it("한도 초과 요청은 거부", async () => {
    const key = "test-key-3";
    for (let i = 0; i < 5; i++) await checkRateLimit(key, 5, 60_000);
    expect(await checkRateLimit(key, 5, 60_000)).toBe(false);
  });

  it("윈도우 만료 후 리셋", async () => {
    const key = "test-key-4";
    for (let i = 0; i < 5; i++) await checkRateLimit(key, 5, 60_000);
    expect(await checkRateLimit(key, 5, 60_000)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(await checkRateLimit(key, 5, 60_000)).toBe(true);
  });

  it("다른 키는 독립적으로 카운트", async () => {
    const keyA = "test-key-5a";
    const keyB = "test-key-5b";
    for (let i = 0; i < 5; i++) await checkRateLimit(keyA, 5, 60_000);
    expect(await checkRateLimit(keyA, 5, 60_000)).toBe(false);
    expect(await checkRateLimit(keyB, 5, 60_000)).toBe(true);
  });

  it("limit=1이면 두 번째 요청부터 거부", async () => {
    const key = "test-key-6";
    expect(await checkRateLimit(key, 1, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 1, 60_000)).toBe(false);
  });
});

describe("checkRateLimit (Upstash Redis)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.unstubAllGlobals();
  });

  it("count <= limit → 허용", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ result: 3 }, { result: 1 }],
    });
    expect(await checkRateLimit("upstash-key-1", 10, 60_000)).toBe(true);
  });

  it("count > limit → 거부", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ result: 11 }, { result: 0 }],
    });
    expect(await checkRateLimit("upstash-key-2", 10, 60_000)).toBe(false);
  });

  it("Upstash 오류(4xx/5xx) → in-memory fallback 허용", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await checkRateLimit("upstash-key-3", 10, 60_000)).toBe(true);
  });

  it("네트워크 오류 → in-memory fallback 허용", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    expect(await checkRateLimit("upstash-key-4", 10, 60_000)).toBe(true);
  });

  it("pipeline endpoint로 요청", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }, { result: 1 }],
    });
    await checkRateLimit("upstash-key-5", 10, 60_000);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://upstash.test/pipeline",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("rateLimitResponse()", () => {
  it("429 상태와 Retry-After 헤더를 포함한 Response를 반환한다", async () => {
    const res = rateLimitResponse();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = await res.json() as { error: string };
    expect(body.error).toContain("요청이 너무 많습니다");
  });
});
