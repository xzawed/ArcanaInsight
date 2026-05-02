import { describe, it, expect } from "vitest";
import { hexToRgba, hexToRgbComponents } from "./color-utils";

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
});

describe("hexToRgbComponents", () => {
  it("6자리 hex → 'r,g,b' 컴포넌트 문자열 반환", () => {
    expect(hexToRgbComponents("#8b5cf6")).toBe("139,92,246");
  });

  it("# 없는 hex 처리", () => {
    expect(hexToRgbComponents("ffffff")).toBe("255,255,255");
  });

  it("검정색 처리", () => {
    expect(hexToRgbComponents("#000000")).toBe("0,0,0");
  });

  it("빨간색 처리", () => {
    expect(hexToRgbComponents("#ff0000")).toBe("255,0,0");
  });

  it("잘못된 hex → fallback 반환", () => {
    expect(hexToRgbComponents("invalid")).toBe("139,92,246");
  });

  it("커스텀 fallback 지정", () => {
    expect(hexToRgbComponents("bad", "0,0,0")).toBe("0,0,0");
  });
});
