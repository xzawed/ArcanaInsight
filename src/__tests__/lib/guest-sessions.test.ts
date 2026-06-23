import { describe, it, expect, beforeEach, vi } from "vitest";
import { rememberGuestSession, getGuestSessions, clearGuestSessions } from "@/lib/guest-sessions";

function installMemoryStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      get length() { return store.size; },
    } as Storage,
  });
  return store;
}

describe("guest-sessions", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("세션 id를 저장하고 조회한다", () => {
    rememberGuestSession("a");
    rememberGuestSession("b");
    expect(getGuestSessions()).toEqual(["b", "a"]); // 최신이 앞
  });

  it("빈 id는 무시한다", () => {
    rememberGuestSession("");
    expect(getGuestSessions()).toEqual([]);
  });

  it("중복 id는 한 번만, 최신으로 끌어올린다", () => {
    rememberGuestSession("a");
    rememberGuestSession("b");
    rememberGuestSession("a");
    expect(getGuestSessions()).toEqual(["a", "b"]);
  });

  it("최대 30개로 제한한다(cap)", () => {
    for (let i = 0; i < 35; i++) rememberGuestSession(`id-${i}`);
    const ids = getGuestSessions();
    expect(ids).toHaveLength(30);
    expect(ids[0]).toBe("id-34"); // 최신
    expect(ids).not.toContain("id-0"); // 오래된 것은 밀려남
  });

  it("지정 id를 제거한다", () => {
    rememberGuestSession("a");
    rememberGuestSession("b");
    rememberGuestSession("c");
    clearGuestSessions(["a", "c"]);
    expect(getGuestSessions()).toEqual(["b"]);
  });

  it("전부 제거되면 키를 삭제한다", () => {
    rememberGuestSession("a");
    clearGuestSessions(["a"]);
    expect(getGuestSessions()).toEqual([]);
  });

  it("빈 배열 clear는 무동작", () => {
    rememberGuestSession("a");
    clearGuestSessions([]);
    expect(getGuestSessions()).toEqual(["a"]);
  });

  it("손상된 JSON은 빈 배열로 처리한다", () => {
    localStorage.setItem("arcana_guest_sessions", "{not json");
    expect(getGuestSessions()).toEqual([]);
  });

  it("배열이 아닌 값은 빈 배열로 처리한다", () => {
    localStorage.setItem("arcana_guest_sessions", JSON.stringify({ x: 1 }));
    expect(getGuestSessions()).toEqual([]);
  });

  it("localStorage 차단 환경에서도 throw하지 않는다", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => { throw new Error("blocked"); }),
        setItem: vi.fn(() => { throw new Error("blocked"); }),
        removeItem: vi.fn(() => { throw new Error("blocked"); }),
      } as unknown as Storage,
    });
    expect(() => rememberGuestSession("a")).not.toThrow();
    expect(getGuestSessions()).toEqual([]);
    expect(() => clearGuestSessions(["a"])).not.toThrow();
  });
});
