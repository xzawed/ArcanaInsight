import { describe, it, expect, vi, afterEach } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";

afterEach(() => {
  vi.useRealTimers();
});

describe("CircuitBreaker — 로컬 상태", () => {
  it("초기 상태: isAvailable() true", () => {
    const cb = new CircuitBreaker({ prefix: "test" });
    expect(cb.isAvailable()).toBe(true);
  });

  it("markDown 후 isAvailable() false", () => {
    const cb = new CircuitBreaker({ prefix: "test" });
    cb.markDown(60_000, "테스트");
    expect(cb.isAvailable()).toBe(false);
  });

  it("쿨다운 만료 후 isAvailable() true (fakeTimers)", () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker({ prefix: "test" });
    cb.markDown(5_000, "테스트");
    expect(cb.isAvailable()).toBe(false);
    vi.advanceTimersByTime(5_001);
    expect(cb.isAvailable()).toBe(true);
  });

  it("resetForTests() 후 isAvailable() true", () => {
    const cb = new CircuitBreaker({ prefix: "test" });
    cb.markDown(60_000, "테스트");
    cb.resetForTests();
    expect(cb.isAvailable()).toBe(true);
  });
});

describe("CircuitBreaker — globalKey 공유 상태", () => {
  const KEY = "__cb_test_shared__";

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[KEY];
  });

  it("같은 globalKey를 쓰는 두 인스턴스가 상태 공유", () => {
    const cb1 = new CircuitBreaker({ prefix: "A", globalKey: KEY });
    const cb2 = new CircuitBreaker({ prefix: "B", globalKey: KEY });
    cb1.markDown(60_000, "인스턴스1에서 다운");
    expect(cb2.isAvailable()).toBe(false);
  });

  it("globalKey 인스턴스 resetForTests()로 공유 상태 초기화", () => {
    const cb1 = new CircuitBreaker({ prefix: "A", globalKey: KEY });
    const cb2 = new CircuitBreaker({ prefix: "B", globalKey: KEY });
    cb1.markDown(60_000, "인스턴스1에서 다운");
    cb2.resetForTests();
    expect(cb1.isAvailable()).toBe(true);
  });

  it("globalKey 없는 인스턴스는 독립적", () => {
    const local = new CircuitBreaker({ prefix: "local" });
    const shared = new CircuitBreaker({ prefix: "shared", globalKey: KEY });
    shared.markDown(60_000, "shared 다운");
    expect(local.isAvailable()).toBe(true);
  });
});
