import { describe, it, expect, vi, afterEach } from "vitest";
import { chooseVariant } from "./router";

function mockGetRandomValues(normalizedValue: number) {
  vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
    (array as Uint32Array)[0] = Math.floor(normalizedValue * 0x100000000);
    return array;
  });
}

describe("chooseVariant", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("split=0 시 항상 baseline을 반환한다", () => {
    mockGetRandomValues(0);
    expect(chooseVariant(0)).toBe("baseline");
  });

  it("split=1 시 항상 variant를 반환한다", () => {
    mockGetRandomValues(0.99);
    expect(chooseVariant(1)).toBe("variant");
  });

  it("random이 split보다 작으면 variant를 반환한다", () => {
    mockGetRandomValues(0.3);
    expect(chooseVariant(0.5)).toBe("variant");
  });

  it("random이 split보다 크거나 같으면 baseline을 반환한다", () => {
    mockGetRandomValues(0.7);
    expect(chooseVariant(0.5)).toBe("baseline");
  });
});
