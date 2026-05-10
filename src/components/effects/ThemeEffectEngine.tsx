"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/hooks/useTheme";
import type { ThemeId } from "@/hooks/useTheme";

type ThemeEffectVars = {
  readonly "--theme-glow-color": string;
  readonly "--theme-glow-intense": string;
  readonly "--theme-particle-color": string;
  readonly "--theme-border-glow": string;
  readonly "--theme-text-glow": string;
  readonly "--theme-aura-color": string;
  readonly "--theme-aura-intense": string;
  readonly "--theme-scanline": string;
  readonly "--theme-glitch": string;
};

export const THEME_EFFECT_VARS: Record<ThemeId, ThemeEffectVars> = {
  midnight: {
    "--theme-glow-color": "rgba(167,139,250,0.6)",
    "--theme-glow-intense": "rgba(167,139,250,0.9)",
    "--theme-particle-color": "#a78bfa",
    "--theme-border-glow": "0 0 8px rgba(167,139,250,0.4), 0 0 20px rgba(167,139,250,0.2)",
    "--theme-text-glow": "0 0 12px rgba(167,139,250,0.3)",
    "--theme-aura-color": "rgba(167,139,250,0.2)",
    "--theme-aura-intense": "rgba(167,139,250,0.5)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
  dawn: {
    "--theme-glow-color": "rgba(240,171,252,0.6)",
    "--theme-glow-intense": "rgba(240,171,252,0.9)",
    "--theme-particle-color": "#f0abfc",
    "--theme-border-glow": "0 0 8px rgba(240,171,252,0.4), 0 0 20px rgba(251,191,36,0.15)",
    "--theme-text-glow": "0 0 12px rgba(240,171,252,0.3)",
    "--theme-aura-color": "rgba(240,171,252,0.2)",
    "--theme-aura-intense": "rgba(240,171,252,0.45)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
  sunset: {
    "--theme-glow-color": "rgba(251,146,60,0.6)",
    "--theme-glow-intense": "rgba(251,146,60,0.9)",
    "--theme-particle-color": "#fb923c",
    "--theme-border-glow": "0 0 8px rgba(251,146,60,0.4), 0 0 20px rgba(34,211,238,0.2)",
    "--theme-text-glow": "0 0 12px rgba(251,146,60,0.3)",
    "--theme-aura-color": "rgba(251,146,60,0.2)",
    "--theme-aura-intense": "rgba(251,146,60,0.45)",
    "--theme-scanline":
      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,146,60,0.03) 2px, rgba(251,146,60,0.03) 4px)",
    "--theme-glitch": "glitch 8s infinite",
  },
  spring: {
    "--theme-glow-color": "rgba(249,168,212,0.6)",
    "--theme-glow-intense": "rgba(249,168,212,0.9)",
    "--theme-particle-color": "#f9a8d4",
    "--theme-border-glow": "0 0 8px rgba(249,168,212,0.4), 0 0 20px rgba(167,243,208,0.2)",
    "--theme-text-glow": "0 0 12px rgba(249,168,212,0.3)",
    "--theme-aura-color": "rgba(249,168,212,0.2)",
    "--theme-aura-intense": "rgba(249,168,212,0.45)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
  summer: {
    "--theme-glow-color": "rgba(56,189,248,0.6)",
    "--theme-glow-intense": "rgba(56,189,248,0.9)",
    "--theme-particle-color": "#38bdf8",
    "--theme-border-glow": "0 0 8px rgba(56,189,248,0.4), 0 0 20px rgba(251,191,36,0.2)",
    "--theme-text-glow": "0 0 12px rgba(56,189,248,0.3)",
    "--theme-aura-color": "rgba(56,189,248,0.2)",
    "--theme-aura-intense": "rgba(56,189,248,0.45)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
  autumn: {
    "--theme-glow-color": "rgba(217,119,6,0.6)",
    "--theme-glow-intense": "rgba(217,119,6,0.9)",
    "--theme-particle-color": "#d97706",
    "--theme-border-glow": "0 0 8px rgba(217,119,6,0.4), 0 0 20px rgba(220,38,38,0.2)",
    "--theme-text-glow": "0 0 12px rgba(217,119,6,0.3)",
    "--theme-aura-color": "rgba(217,119,6,0.2)",
    "--theme-aura-intense": "rgba(217,119,6,0.45)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
  winter: {
    "--theme-glow-color": "rgba(147,197,253,0.6)",
    "--theme-glow-intense": "rgba(147,197,253,0.9)",
    "--theme-particle-color": "#93c5fd",
    "--theme-border-glow": "0 0 8px rgba(147,197,253,0.4), 0 0 20px rgba(226,232,240,0.2)",
    "--theme-text-glow": "0 0 12px rgba(147,197,253,0.3)",
    "--theme-aura-color": "rgba(147,197,253,0.2)",
    "--theme-aura-intense": "rgba(147,197,253,0.45)",
    "--theme-scanline": "none",
    "--theme-glitch": "none",
  },
};

/** :root에 테마별 CSS 이펙트 변수를 주입한다. ThemeProvider 하위에 배치한다. */
export function ThemeEffectEngine() {
  const { activeTheme } = useThemeStore();

  useEffect(() => {
    const vars = THEME_EFFECT_VARS[activeTheme];
    const root = document.documentElement;
    (Object.entries(vars) as [string, string][]).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }, [activeTheme]);

  return null;
}

/** 현재 테마의 이펙트 변수 객체를 반환한다 (컴포넌트 직접 소비용). */
export function useThemeEffectVars(): ThemeEffectVars {
  const { activeTheme } = useThemeStore();
  return THEME_EFFECT_VARS[activeTheme];
}
