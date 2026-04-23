import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("첫 번째 요청은 항상 허용", () => {
    expect(checkRateLimit("test-key-1", 5, 60_000)).toBe(true);
  });

  it("한도 내 요청은 허용", () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000)).toBe(true);
    }
  });

  it("한도 초과 요청은 거부", () => {
    const key = "test-key-3";
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    expect(checkRateLimit(key, 5, 60_000)).toBe(false);
  });

  it("윈도우 만료 후 리셋", () => {
    const key = "test-key-4";
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    expect(checkRateLimit(key, 5, 60_000)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit(key, 5, 60_000)).toBe(true);
  });

  it("다른 키는 독립적으로 카운트", () => {
    const keyA = "test-key-5a";
    const keyB = "test-key-5b";
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000);
    expect(checkRateLimit(keyA, 5, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 5, 60_000)).toBe(true);
  });

  it("limit=1이면 두 번째 요청부터 거부", () => {
    const key = "test-key-6";
    expect(checkRateLimit(key, 1, 60_000)).toBe(true);
    expect(checkRateLimit(key, 1, 60_000)).toBe(false);
  });
});
