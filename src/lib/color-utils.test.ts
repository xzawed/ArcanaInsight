import { describe, it, expect } from "vitest";
import { hexToRgba, hexToRgbBase } from "./color-utils";

describe("hexToRgba", () => {
  it("6자리 hex → rgba 문자열 반환", () => {
    expect(hexToRgba("#8b5cf6", 1)).toBe("rgba(139,92,246,1)");
  });

  it("alpha 0.5 적용", () => {
    expect(hexToRgba("#ffffff", 0.5)).toBe("rgba(255,255,255,0.5)");
  });

  it("검정색 hex 처리", () => {
    expect(hexToRgba("#000000", 0)).toBe("rgba(0,0,0,0)");
  });

  it("잘못된 hex → 기본 fallback 반환", () => {
    expect(hexToRgba("invalid", 0.5)).toBe("rgba(212, 175, 55,0.5)");
  });

  it("잘못된 hex → 커스텀 fallback 반환", () => {
    expect(hexToRgba("bad", 1, "0,0,0")).toBe("rgba(0,0,0,1)");
  });
});

describe("hexToRgbBase", () => {
  it("6자리 hex → 'r, g, b' 문자열 반환", () => {
    expect(hexToRgbBase("#8b5cf6")).toBe("139, 92, 246");
  });

  it("# 없는 hex 처리", () => {
    expect(hexToRgbBase("ffffff")).toBe("255, 255, 255");
  });

  it("잘못된 hex → 기본 fallback 반환", () => {
    expect(hexToRgbBase("invalid")).toBe("212, 175, 55");
  });

  it("커스텀 fallback 지정", () => {
    expect(hexToRgbBase("bad", "0, 0, 0")).toBe("0, 0, 0");
  });
});

