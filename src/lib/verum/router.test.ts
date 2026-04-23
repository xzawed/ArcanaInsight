import { describe, it, expect, vi, afterEach } from "vitest";
import { chooseVariant } from "./router";

describe("chooseVariant", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("split=0 시 항상 baseline을 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(chooseVariant(0)).toBe("baseline");
  });

  it("split=1 시 항상 variant를 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    expect(chooseVariant(1)).toBe("variant");
  });

  it("random이 split보다 작으면 variant를 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    expect(chooseVariant(0.5)).toBe("variant");
  });

  it("random이 split보다 크거나 같으면 baseline을 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    expect(chooseVariant(0.5)).toBe("baseline");
  });
});
