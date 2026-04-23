import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeploymentConfigCache } from "./cache";

describe("DeploymentConfigCache", () => {
  let cache: DeploymentConfigCache<{ id: string }>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new DeploymentConfigCache(5000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── get / set ──────────────────────────────────────────────────────────

  it("set 후 get은 값을 반환한다", () => {
    cache.set("key1", { id: "abc" });
    expect(cache.get("key1")).toEqual({ id: "abc" });
  });

  it("TTL 만료 후 get은 null을 반환한다", () => {
    cache.set("key1", { id: "abc" });
    vi.advanceTimersByTime(5001);
    expect(cache.get("key1")).toBeNull();
  });

  it("TTL 내에는 반복 get이 동일 값을 반환한다", () => {
    cache.set("key1", { id: "abc" });
    vi.advanceTimersByTime(2000);
    expect(cache.get("key1")).toEqual({ id: "abc" });
  });

  it("다른 키는 독립적으로 관리된다", () => {
    cache.set("key1", { id: "a" });
    cache.set("key2", { id: "b" });
    vi.advanceTimersByTime(5001);
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });

  // ── getOrFetch ──────────────────────────────────────────────────────────

  it("캐시 미스 시 fetcher를 호출한다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: "fetched" });
    const result = await cache.getOrFetch("key1", fetcher);
    expect(result).toEqual({ id: "fetched" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("캐시 히트 시 fetcher를 호출하지 않는다", async () => {
    cache.set("key1", { id: "cached" });
    const fetcher = vi.fn().mockResolvedValue({ id: "fetched" });
    const result = await cache.getOrFetch("key1", fetcher);
    expect(result).toEqual({ id: "cached" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("동시 캐시 미스 10건에 대해 fetcher를 1회만 호출한다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: "fetched" });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => cache.getOrFetch("key1", fetcher)),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.id === "fetched")).toBe(true);
  });

  it("getOrFetch 완료 후 같은 키 재요청은 캐시에서 반환한다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: "fetched" });
    await cache.getOrFetch("key1", fetcher);
    await cache.getOrFetch("key1", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fetcher reject 시 inflight에서 제거되어 다음 요청이 재시도한다", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValue({ id: "retry" });

    await expect(cache.getOrFetch("key1", fetcher)).rejects.toThrow("network error");
    const result = await cache.getOrFetch("key1", fetcher);
    expect(result).toEqual({ id: "retry" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
