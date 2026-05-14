import { describe, it, expect } from "vitest";
import { THEME_EFFECT_VARS } from "@/components/effects/ThemeEffectEngine";
import type { ThemeId } from "@/hooks/useTheme";

const ALL_THEMES: ThemeId[] = ["midnight", "dawn", "sunset", "spring", "summer", "autumn", "winter"];

const REQUIRED_VARS = [
  "--theme-glow-color",
  "--theme-glow-intense",
  "--theme-particle-color",
  "--theme-border-glow",
  "--theme-text-glow",
  "--theme-aura-color",
  "--theme-aura-intense",
] as const;

describe("THEME_EFFECT_VARS", () => {
  it("7개 테마 모두 정의되어 있다", () => {
    ALL_THEMES.forEach((theme) => {
      expect(THEME_EFFECT_VARS[theme]).toBeDefined();
    });
  });

  it("각 테마에 필수 CSS 변수 7개가 모두 존재한다", () => {
    ALL_THEMES.forEach((theme) => {
      REQUIRED_VARS.forEach((varName) => {
        expect(THEME_EFFECT_VARS[theme][varName]).toBeTruthy();
      });
    });
  });

  it("sunset만 --theme-scanline이 활성화된다", () => {
    expect(THEME_EFFECT_VARS.sunset["--theme-scanline"]).not.toBe("none");
    const otherThemes = ALL_THEMES.filter((t) => t !== "sunset");
    otherThemes.forEach((theme) => {
      expect(THEME_EFFECT_VARS[theme]["--theme-scanline"]).toBe("none");
    });
  });

  it("sunset만 --theme-glitch가 활성화된다", () => {
    expect(THEME_EFFECT_VARS.sunset["--theme-glitch"]).not.toBe("none");
    const otherThemes = ALL_THEMES.filter((t) => t !== "sunset");
    otherThemes.forEach((theme) => {
      expect(THEME_EFFECT_VARS[theme]["--theme-glitch"]).toBe("none");
    });
  });

  it("각 테마의 --theme-particle-color가 hex 또는 rgb 형식이다", () => {
    ALL_THEMES.forEach((theme) => {
      const color = THEME_EFFECT_VARS[theme]["--theme-particle-color"];
      expect(color).toMatch(/^#[0-9a-f]{6}$|^rgba?\(/i);
    });
  });

  it("midnight --theme-glow-color는 보라색 계열이다", () => {
    expect(THEME_EFFECT_VARS.midnight["--theme-glow-color"]).toContain("167,139,250");
  });

  it("winter --theme-glow-color는 파란색 계열이다", () => {
    expect(THEME_EFFECT_VARS.winter["--theme-glow-color"]).toContain("147,197,253");
  });

  it("--theme-aura-color와 --theme-aura-intense가 구분된다", () => {
    ALL_THEMES.forEach((theme) => {
      const auraColor = THEME_EFFECT_VARS[theme]["--theme-aura-color"];
      const auraIntense = THEME_EFFECT_VARS[theme]["--theme-aura-intense"];
      // 두 값이 같지 않아야 한다 (intense가 더 불투명)
      expect(auraColor).not.toBe(auraIntense);
    });
  });
});
