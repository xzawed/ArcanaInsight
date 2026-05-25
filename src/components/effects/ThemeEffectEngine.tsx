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
  // --t-* 리치 색상 팔레트 (Phase 1+)
  readonly "--t-bg-1": string;
  readonly "--t-bg-2": string;
  readonly "--t-bg-3": string;
  readonly "--t-glow": string;
  readonly "--t-glow-2": string;
  readonly "--t-accent": string;
  readonly "--t-ink": string;
  readonly "--t-ink-2": string;
  readonly "--t-card": string;
  readonly "--t-stroke": string;
  readonly "--t-haze": string;
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
    "--t-bg-1": "#0a0a1a",
    "--t-bg-2": "#12122a",
    "--t-bg-3": "#1a1a3e",
    "--t-glow": "rgba(167,139,250,0.7)",
    "--t-glow-2": "rgba(99,102,241,0.5)",
    "--t-accent": "#f59e0b",
    "--t-ink": "#e2e8f0",
    "--t-ink-2": "#94a3b8",
    "--t-card": "rgba(26,26,62,0.85)",
    "--t-stroke": "rgba(42,42,94,0.6)",
    "--t-haze": "rgba(10,10,26,0.45)",
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
    "--t-bg-1": "#1a0f1e",
    "--t-bg-2": "#241828",
    "--t-bg-3": "#2e1f38",
    "--t-glow": "rgba(240,171,252,0.7)",
    "--t-glow-2": "rgba(192,132,252,0.5)",
    "--t-accent": "#fbbf24",
    "--t-ink": "#f5e6ff",
    "--t-ink-2": "#b891d4",
    "--t-card": "rgba(46,31,56,0.85)",
    "--t-stroke": "rgba(74,45,94,0.6)",
    "--t-haze": "rgba(26,15,30,0.45)",
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
    "--t-bg-1": "#1a0f0a",
    "--t-bg-2": "#2a1810",
    "--t-bg-3": "#3a2218",
    "--t-glow": "rgba(251,146,60,0.7)",
    "--t-glow-2": "rgba(249,115,22,0.5)",
    "--t-accent": "#fcd34d",
    "--t-ink": "#fff1e6",
    "--t-ink-2": "#c4a882",
    "--t-card": "rgba(58,34,24,0.85)",
    "--t-stroke": "rgba(94,58,42,0.6)",
    "--t-haze": "rgba(26,15,10,0.45)",
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
    "--t-bg-1": "#140f18",
    "--t-bg-2": "#1e1525",
    "--t-bg-3": "#2a1e35",
    "--t-glow": "rgba(249,168,212,0.7)",
    "--t-glow-2": "rgba(236,72,153,0.5)",
    "--t-accent": "#a7f3d0",
    "--t-ink": "#fce7f3",
    "--t-ink-2": "#b8a0c8",
    "--t-card": "rgba(42,30,53,0.85)",
    "--t-stroke": "rgba(74,48,96,0.6)",
    "--t-haze": "rgba(20,15,24,0.45)",
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
    "--t-bg-1": "#0a1628",
    "--t-bg-2": "#0f1f38",
    "--t-bg-3": "#162a4a",
    "--t-glow": "rgba(56,189,248,0.7)",
    "--t-glow-2": "rgba(14,165,233,0.5)",
    "--t-accent": "#fbbf24",
    "--t-ink": "#e0f2fe",
    "--t-ink-2": "#7cb8d4",
    "--t-card": "rgba(22,42,74,0.85)",
    "--t-stroke": "rgba(30,58,110,0.6)",
    "--t-haze": "rgba(10,22,40,0.45)",
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
    "--t-bg-1": "#1a100a",
    "--t-bg-2": "#261810",
    "--t-bg-3": "#34201a",
    "--t-glow": "rgba(217,119,6,0.7)",
    "--t-glow-2": "rgba(180,83,9,0.5)",
    "--t-accent": "#dc2626",
    "--t-ink": "#fef3c7",
    "--t-ink-2": "#b8956a",
    "--t-card": "rgba(52,32,26,0.85)",
    "--t-stroke": "rgba(90,56,40,0.6)",
    "--t-haze": "rgba(26,16,10,0.45)",
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
    "--t-bg-1": "#0c1220",
    "--t-bg-2": "#141e30",
    "--t-bg-3": "#1c2840",
    "--t-glow": "rgba(147,197,253,0.7)",
    "--t-glow-2": "rgba(96,165,250,0.5)",
    "--t-accent": "#e2e8f0",
    "--t-ink": "#f0f4ff",
    "--t-ink-2": "#8ea4c4",
    "--t-card": "rgba(28,40,64,0.85)",
    "--t-stroke": "rgba(42,58,90,0.6)",
    "--t-haze": "rgba(12,18,32,0.45)",
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
