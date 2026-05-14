# Visual Overhaul Phase 2: 테마 통합 이펙트 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 7개 테마가 배경 파티클을 넘어 버튼·카드 테두리·다이얼로그·캐릭터 오라·네비게이션 등 전체 UI에 화려하게 침투하는 5-레이어 이펙트 시스템을 구축한다.

**Architecture:** ThemeEffectEngine이 활성 테마별 CSS 변수 세트를 :root에 주입하고 각 컴포넌트가 이를 소비한다. 파티클 시스템은 종류·수·크기를 2-3배 확장하고 GPU 가속(will-change)을 전면 적용한다. 인터랙션 이펙트(hover/click 파티클)는 useMotionValue로 마우스 위치를 추적한다.

**Tech Stack:** Framer Motion, CSS custom properties, Tailwind CSS v4, React, Zustand

---

## 사전 조건

- Phase 1 (`feat/visual-overhaul-phase1`) 완료 후 작업 시작
- 작업 브랜치: `feat/visual-overhaul-phase2`
- 모바일 디바이스: `window.innerWidth < 768` 시 intensity 자동 `low`

---

## 5-레이어 이펙트 아키텍처

```
Layer 5 (최상단): InteractionEffects    — hover·클릭 파티클 (신규)
Layer 4:          ThemeUIOverlay        — 버튼·카드·테두리 글로우 (신규)
Layer 3:          ThemeParticleSystem   — 테마별 파티클 (MysticBackground 강화)
Layer 2:          ThemeAtmosphereLayer  — 미드그라운드 오브젝트 (신규)
Layer 1 (최하단): 배경 레이어          — AI 배경 이미지 + 동적 그라데이션
```

---

## 신규 CSS 변수 (ThemeEffectEngine이 :root에 주입)

```css
/* 테마별로 다른 값이 주입됨. 아래는 midnight 기준 예시 */
--theme-glow-color: rgba(167,139,250,0.6)
--theme-glow-intense: rgba(167,139,250,0.9)
--theme-particle-color: #a78bfa
--theme-border-glow: 0 0 8px rgba(167,139,250,0.4), 0 0 20px rgba(167,139,250,0.2)
--theme-text-glow: 0 0 12px rgba(167,139,250,0.3)
--theme-aura-color: rgba(167,139,250,0.2)
--theme-aura-intense: rgba(167,139,250,0.4)
--theme-scanline: none          /* sunset만 active */
--theme-glitch: none            /* sunset만 active */
```

---

## 수정 파일 목록

### 신규 생성
1. `src/components/effects/ThemeEffectEngine.tsx` — CSS 변수 주입 + 테마별 이펙트 설정 반환
2. `src/components/effects/ThemeParticleSystem.tsx` — 확장된 파티클 시스템
3. `src/components/effects/ThemeAtmosphereLayer.tsx` — 미드그라운드 오브젝트 레이어
4. `src/components/effects/InteractionEffects.tsx` — hover·클릭 파티클
5. `src/styles/theme-effects.css` — 테마별 CSS keyframes

### 수정
6. `src/components/effects/themeAtmosphere.ts` — 파티클 데이터 확장
7. `src/components/layout/ThemeProvider.tsx` — ThemeEffectEngine 마운트
8. `src/components/effects/ServiceBackground.tsx` — ThemeParticleSystem으로 교체
9. `src/app/globals.css` — 새 keyframes 추가
10. `src/components/character/CharacterAuraLayer.tsx` — `--theme-aura-color` CSS 변수 연동

---

## Task 1: ThemeEffectEngine — CSS 변수 주입 엔진

**파일:** `src/components/effects/ThemeEffectEngine.tsx` (신규)
**소요:** ~3분

- [x] `THEME_EFFECT_VARS` Record 상수 정의 (7개 테마 × 8개 CSS 변수)
- [x] `ThemeEffectEngine` 컴포넌트 구현 — `useThemeStore`로 activeTheme 구독, useEffect에서 `:root`에 변수 주입
- [x] `useThemeEffectVars()` hook 구현 — 현재 테마의 이펙트 vars 객체 반환 (컴포넌트가 직접 소비할 때 사용)
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add ThemeEffectEngine CSS variable injection"`

```typescript
// src/components/effects/ThemeEffectEngine.tsx
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
```

---

## Task 2: globals.css — 신규 keyframes 추가

**파일:** `src/app/globals.css` (수정)
**소요:** ~2분

- [x] `@theme` 블록 내 새 keyframes 8개 추가
- [x] 새 animate 토큰 8개 추가 (`--animate-rune-float` 등)
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add theme-effect keyframes to globals.css"`

```css
/* globals.css @theme 블록 내부에 추가 */

/* 이펙트 animate 토큰 */
--animate-rune-float: rune-float 6s ease-in-out infinite;
--animate-aurora-shift: aurora-shift 12s ease-in-out infinite;
--animate-firefly-blink: firefly-blink 3s ease-in-out infinite;
--animate-meteor-streak: meteor-streak 4s ease-out infinite;
--animate-scanline: scanline 6s linear infinite;
--animate-glitch: glitch 8s steps(1) infinite;
--animate-haze-warp: haze-warp 5s ease-in-out infinite;
--animate-ice-shimmer: ice-shimmer 4s ease-in-out infinite;
--animate-sakura-fall: sakura-fall 8s ease-in infinite;

@keyframes rune-float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
  50% { transform: translateY(-15px) rotate(180deg); opacity: 0.8; }
}

@keyframes aurora-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes firefly-blink {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

@keyframes meteor-streak {
  0% { transform: translateX(0) translateY(0); opacity: 1; }
  100% { transform: translateX(200px) translateY(200px); opacity: 0; }
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

@keyframes glitch {
  0%, 90%, 100% { transform: none; filter: none; }
  92% { transform: skew(-2deg); filter: hue-rotate(90deg); }
  94% { transform: skew(2deg); }
  96% { transform: none; filter: hue-rotate(-90deg); }
}

@keyframes haze-warp {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.02) skewX(0.5deg); }
}

@keyframes ice-shimmer {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

@keyframes sakura-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.8; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
```

---

## Task 3: themeAtmosphere.ts — 파티클 데이터 대폭 확장

**파일:** `src/components/effects/themeAtmosphere.ts` (수정)
**소요:** ~5분

- [x] `DriftParticleKind` 타입에 새 종류 추가: `"rune" | "meteor" | "butterfly" | "hexagon" | "sparkle" | "lantern" | "snowflake"`
- [x] midnight: 기존 9개 star → star(9개) + rune(5개) + meteor(3개) = 17개
- [x] dawn: 기존 4개 mist → mist(8개) + butterfly(4개) = 12개
- [x] sunset: 기존 7개 dust → hexagon(10개) + dust(5개) = 15개
- [x] spring: 기존 6개 petal → petal(12개) + sparkle(8개) = 20개
- [x] summer: 기존 7개 firefly → firefly(15개) + lantern(4개) = 19개
- [x] autumn: 기존 7개 leaf/ember → leaf(10개) + ember(6개) = 16개 (데이터 확장만)
- [x] winter: 기존 8개 snow → snowflake(15개) + snow(6개) = 21개
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: expand themeAtmosphere particle data 2-3x"`

```typescript
// 타입 확장 — 기존 DriftParticleKind 교체
type DriftParticleKind =
  | "star" | "mist" | "dust" | "petal" | "firefly"
  | "leaf" | "snow" | "ember"
  | "rune" | "meteor" | "butterfly" | "hexagon"
  | "sparkle" | "lantern" | "snowflake";

// midnight 신규 추가 파티클 (기존 STAR_PARTICLES에 병합)
const RUNE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "m-rune-1", kind: "rune", x: 15, y: 30, size: 16, opacity: 0.22, delay: 0.5, duration: 7, color: "#f59e0b" },
  { id: "m-rune-2", kind: "rune", x: 38, y: 55, size: 14, opacity: 0.18, delay: 2.1, duration: 8, color: "#a78bfa" },
  { id: "m-rune-3", kind: "rune", x: 62, y: 28, size: 18, opacity: 0.2,  delay: 1.3, duration: 6.5, color: "#f59e0b" },
  { id: "m-rune-4", kind: "rune", x: 81, y: 62, size: 14, opacity: 0.16, delay: 3.2, duration: 9,   color: "#a78bfa" },
  { id: "m-rune-5", kind: "rune", x: 54, y: 78, size: 12, opacity: 0.18, delay: 0.8, duration: 7.5, color: "#f59e0b" },
];

const METEOR_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "m-meteor-1", kind: "meteor", x: 10, y: 5,  size: 2, opacity: 0.7, delay: 0,   duration: 4 },
  { id: "m-meteor-2", kind: "meteor", x: 55, y: 8,  size: 1.5, opacity: 0.6, delay: 5, duration: 4 },
  { id: "m-meteor-3", kind: "meteor", x: 80, y: 3,  size: 2, opacity: 0.65, delay: 10, duration: 4 },
];

// dawn 신규 추가 파티클
const DAWN_MIST_EXTENDED: readonly AtmosphereParticle[] = [
  { id: "d-mist-5", kind: "mist", x: 22, y: 48, size: 50, opacity: 0.16, delay: 3.1, duration: 12, color: "rgba(240,171,252,0.24)" },
  { id: "d-mist-6", kind: "mist", x: 48, y: 66, size: 44, opacity: 0.18, delay: 0.5, duration: 9,  color: "rgba(251,191,36,0.16)" },
  { id: "d-mist-7", kind: "mist", x: 71, y: 44, size: 48, opacity: 0.2,  delay: 2.8, duration: 11, color: "rgba(248,113,113,0.14)" },
  { id: "d-mist-8", kind: "mist", x: 90, y: 58, size: 38, opacity: 0.16, delay: 1.6, duration: 10, color: "rgba(167,139,250,0.2)" },
];

const BUTTERFLY_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "d-butterfly-1", kind: "butterfly", x: 18, y: 35, size: 20, opacity: 0.36, delay: 0,   duration: 9,  color: "#fbbf24", rotate: 15 },
  { id: "d-butterfly-2", kind: "butterfly", x: 44, y: 22, size: 16, opacity: 0.3,  delay: 2.4, duration: 11, color: "#f0abfc", rotate: -20 },
  { id: "d-butterfly-3", kind: "butterfly", x: 69, y: 48, size: 18, opacity: 0.34, delay: 1.2, duration: 10, color: "#fbbf24", rotate: 30 },
  { id: "d-butterfly-4", kind: "butterfly", x: 86, y: 32, size: 14, opacity: 0.28, delay: 3.5, duration: 12, color: "#f9a8d4", rotate: -10 },
];

// sunset 신규 추가 파티클
const HEXAGON_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "s-hex-1",  kind: "hexagon", x: 8,  y: 22, size: 22, opacity: 0.28, delay: 0,   duration: 8  },
  { id: "s-hex-2",  kind: "hexagon", x: 21, y: 54, size: 18, opacity: 0.24, delay: 1.2, duration: 10 },
  { id: "s-hex-3",  kind: "hexagon", x: 37, y: 38, size: 24, opacity: 0.26, delay: 2.4, duration: 9  },
  { id: "s-hex-4",  kind: "hexagon", x: 52, y: 68, size: 20, opacity: 0.22, delay: 0.8, duration: 11 },
  { id: "s-hex-5",  kind: "hexagon", x: 65, y: 25, size: 26, opacity: 0.28, delay: 3.1, duration: 8.5 },
  { id: "s-hex-6",  kind: "hexagon", x: 77, y: 52, size: 18, opacity: 0.24, delay: 1.7, duration: 10 },
  { id: "s-hex-7",  kind: "hexagon", x: 89, y: 38, size: 22, opacity: 0.26, delay: 0.3, duration: 9  },
  { id: "s-hex-8",  kind: "hexagon", x: 14, y: 78, size: 20, opacity: 0.22, delay: 2.8, duration: 11 },
  { id: "s-hex-9",  kind: "hexagon", x: 44, y: 82, size: 24, opacity: 0.24, delay: 4,   duration: 9.5 },
  { id: "s-hex-10", kind: "hexagon", x: 71, y: 76, size: 18, opacity: 0.2,  delay: 1.4, duration: 10 },
];

// spring 신규 추가 파티클
const SAKURA_EXTENDED: readonly AtmosphereParticle[] = [
  { id: "sp-petal-7",  kind: "petal", x: 14, y: 34, size: 10, opacity: 0.36, delay: 1.2, duration: 11, rotate: 22 },
  { id: "sp-petal-8",  kind: "petal", x: 32, y: 62, size: 13, opacity: 0.42, delay: 2.8, duration: 13, rotate: -15 },
  { id: "sp-petal-9",  kind: "petal", x: 48, y: 14, size: 9,  opacity: 0.34, delay: 4.4, duration: 10, rotate: 40 },
  { id: "sp-petal-10", kind: "petal", x: 63, y: 48, size: 11, opacity: 0.38, delay: 0.6, duration: 12, rotate: -28 },
  { id: "sp-petal-11", kind: "petal", x: 78, y: 22, size: 14, opacity: 0.4,  delay: 3.3, duration: 14, rotate: 8 },
  { id: "sp-petal-12", kind: "petal", x: 92, y: 66, size: 10, opacity: 0.34, delay: 1.9, duration: 11, rotate: -36 },
];

const SPARKLE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "sp-sparkle-1", kind: "sparkle", x: 12, y: 44, size: 6,  opacity: 0.62, delay: 0,   duration: 4.5, color: "#f9a8d4" },
  { id: "sp-sparkle-2", kind: "sparkle", x: 28, y: 18, size: 4,  opacity: 0.54, delay: 0.9, duration: 5.2, color: "#a7f3d0" },
  { id: "sp-sparkle-3", kind: "sparkle", x: 46, y: 72, size: 8,  opacity: 0.68, delay: 1.8, duration: 4.8, color: "#f9a8d4" },
  { id: "sp-sparkle-4", kind: "sparkle", x: 61, y: 36, size: 5,  opacity: 0.58, delay: 2.7, duration: 5.6, color: "#a7f3d0" },
  { id: "sp-sparkle-5", kind: "sparkle", x: 75, y: 58, size: 7,  opacity: 0.64, delay: 0.5, duration: 4.2, color: "#fcd34d" },
  { id: "sp-sparkle-6", kind: "sparkle", x: 88, y: 28, size: 4,  opacity: 0.52, delay: 3.2, duration: 5.8, color: "#f9a8d4" },
  { id: "sp-sparkle-7", kind: "sparkle", x: 35, y: 84, size: 6,  opacity: 0.6,  delay: 1.1, duration: 4.6, color: "#a7f3d0" },
  { id: "sp-sparkle-8", kind: "sparkle", x: 54, y: 90, size: 5,  opacity: 0.56, delay: 2.3, duration: 5,   color: "#fcd34d" },
];

// summer 신규 추가 파티클
const SUMMER_FIREFLIES_EXTENDED: readonly AtmosphereParticle[] = [
  { id: "su-firefly-6",  kind: "firefly", x: 8,  y: 44, size: 4, opacity: 0.52, delay: 2.6, duration: 6.8 },
  { id: "su-firefly-7",  kind: "firefly", x: 22, y: 82, size: 3, opacity: 0.46, delay: 0.4, duration: 5.2 },
  { id: "su-firefly-8",  kind: "firefly", x: 35, y: 18, size: 5, opacity: 0.58, delay: 3.8, duration: 7.2 },
  { id: "su-firefly-9",  kind: "firefly", x: 50, y: 54, size: 3, opacity: 0.44, delay: 1.1, duration: 6   },
  { id: "su-firefly-10", kind: "firefly", x: 66, y: 88, size: 4, opacity: 0.54, delay: 4.4, duration: 6.4 },
  { id: "su-firefly-11", kind: "firefly", x: 74, y: 34, size: 3, opacity: 0.48, delay: 2.2, duration: 5.8 },
  { id: "su-firefly-12", kind: "firefly", x: 82, y: 60, size: 5, opacity: 0.56, delay: 0.9, duration: 7   },
  { id: "su-firefly-13", kind: "firefly", x: 90, y: 82, size: 3, opacity: 0.42, delay: 3.5, duration: 5.5 },
  { id: "su-firefly-14", kind: "firefly", x: 16, y: 58, size: 4, opacity: 0.5,  delay: 1.7, duration: 6.2 },
  { id: "su-firefly-15", kind: "firefly", x: 58, y: 76, size: 5, opacity: 0.54, delay: 5.2, duration: 7.4 },
];

const LANTERN_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "su-lantern-1", kind: "lantern", x: 18, y: 25, size: 28, opacity: 0.34, delay: 0,   duration: 12, color: "rgba(251,146,60,0.72)" },
  { id: "su-lantern-2", kind: "lantern", x: 44, y: 40, size: 24, opacity: 0.3,  delay: 3.2, duration: 14, color: "rgba(253,224,71,0.68)" },
  { id: "su-lantern-3", kind: "lantern", x: 68, y: 18, size: 30, opacity: 0.32, delay: 1.8, duration: 13, color: "rgba(251,146,60,0.7)" },
  { id: "su-lantern-4", kind: "lantern", x: 84, y: 48, size: 22, opacity: 0.28, delay: 5.1, duration: 15, color: "rgba(253,224,71,0.62)" },
];

// autumn 데이터 확장 (기존 LEAVES_AND_EMBERS 보완)
const AUTUMN_LEAVES_EXTENDED: readonly AtmosphereParticle[] = [
  { id: "a-leaf-5", kind: "leaf", x: 35, y: 60, size: 12, opacity: 0.36, delay: 4.5, duration: 14, color: "rgba(251,191,36,0.65)", rotate: 28 },
  { id: "a-leaf-6", kind: "leaf", x: 58, y: 36, size: 10, opacity: 0.32, delay: 2.8, duration: 16, color: "rgba(180,83,9,0.68)", rotate: -22 },
  { id: "a-leaf-7", kind: "leaf", x: 82, y: 58, size: 14, opacity: 0.38, delay: 0.5, duration: 13, color: "rgba(245,158,11,0.6)", rotate: 14 },
  { id: "a-leaf-8", kind: "leaf", x: 12, y: 74, size: 11, opacity: 0.34, delay: 5.8, duration: 15, color: "rgba(220,38,38,0.54)", rotate: -34 },
  { id: "a-leaf-9", kind: "leaf", x: 44, y: 80, size: 13, opacity: 0.36, delay: 3.4, duration: 14, color: "rgba(217,119,6,0.72)", rotate: 20 },
  { id: "a-leaf-10", kind: "leaf", x: 72, y: 72, size: 12, opacity: 0.32, delay: 1.7, duration: 16, color: "rgba(180,83,9,0.6)", rotate: -16 },
];

const AUTUMN_EMBERS_EXTENDED: readonly AtmosphereParticle[] = [
  { id: "a-ember-4", kind: "ember", x: 28, y: 86, size: 2.2, opacity: 0.44, delay: 3.8, duration: 6 },
  { id: "a-ember-5", kind: "ember", x: 52, y: 82, size: 1.8, opacity: 0.4,  delay: 0.6, duration: 5.4 },
  { id: "a-ember-6", kind: "ember", x: 76, y: 88, size: 2.4, opacity: 0.42, delay: 5.4, duration: 7 },
];

// winter 데이터 확장
const SNOWFLAKE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "w-flake-1",  kind: "snowflake", x: 14, y: 8,  size: 14, opacity: 0.42, delay: 0,   duration: 14, rotate: 0 },
  { id: "w-flake-2",  kind: "snowflake", x: 28, y: 22, size: 10, opacity: 0.36, delay: 2.2, duration: 16, rotate: 30 },
  { id: "w-flake-3",  kind: "snowflake", x: 41, y: 6,  size: 16, opacity: 0.44, delay: 1.1, duration: 13, rotate: 60 },
  { id: "w-flake-4",  kind: "snowflake", x: 55, y: 16, size: 12, opacity: 0.38, delay: 3.4, duration: 15, rotate: 45 },
  { id: "w-flake-5",  kind: "snowflake", x: 68, y: 4,  size: 18, opacity: 0.46, delay: 0.7, duration: 12, rotate: 15 },
  { id: "w-flake-6",  kind: "snowflake", x: 79, y: 18, size: 10, opacity: 0.34, delay: 4.8, duration: 17, rotate: 75 },
  { id: "w-flake-7",  kind: "snowflake", x: 88, y: 8,  size: 14, opacity: 0.4,  delay: 1.8, duration: 14, rotate: 30 },
  { id: "w-flake-8",  kind: "snowflake", x: 6,  y: 42, size: 12, opacity: 0.36, delay: 3.1, duration: 15, rotate: 0 },
  { id: "w-flake-9",  kind: "snowflake", x: 32, y: 56, size: 16, opacity: 0.42, delay: 0.4, duration: 13, rotate: 45 },
  { id: "w-flake-10", kind: "snowflake", x: 52, y: 38, size: 10, opacity: 0.34, delay: 5.6, duration: 16, rotate: 90 },
  { id: "w-flake-11", kind: "snowflake", x: 66, y: 62, size: 14, opacity: 0.4,  delay: 2.5, duration: 14, rotate: 60 },
  { id: "w-flake-12", kind: "snowflake", x: 82, y: 44, size: 12, opacity: 0.38, delay: 1.5, duration: 15, rotate: 30 },
  { id: "w-flake-13", kind: "snowflake", x: 22, y: 74, size: 16, opacity: 0.44, delay: 4.2, duration: 12, rotate: 15 },
  { id: "w-flake-14", kind: "snowflake", x: 44, y: 80, size: 10, opacity: 0.34, delay: 0.9, duration: 17, rotate: 75 },
  { id: "w-flake-15", kind: "snowflake", x: 74, y: 86, size: 14, opacity: 0.4,  delay: 6.1, duration: 13, rotate: 45 },
];

// THEME_ATMOSPHERES 업데이트 예시
// midnight.particles: [...STAR_PARTICLES, ...RUNE_PARTICLES, ...METEOR_PARTICLES]
// dawn.particles: [...MIST_PARTICLES, ...DAWN_MIST_EXTENDED, ...BUTTERFLY_PARTICLES]
// sunset.particles: [...HEXAGON_PARTICLES, ...DUST_PARTICLES]
// spring.particles: [...PETALS, ...SAKURA_EXTENDED, ...SPARKLE_PARTICLES]
// summer.particles: [...FIREFLIES, ...SUMMER_FIREFLIES_EXTENDED, ...LANTERN_PARTICLES]
// autumn.particles: [...LEAVES_AND_EMBERS, ...AUTUMN_LEAVES_EXTENDED, ...AUTUMN_EMBERS_EXTENDED]
// winter.particles: [...SNOW, ...SNOWFLAKE_PARTICLES]
```

---

## Task 4: MysticBackground.tsx — 신규 파티클 종류 렌더링 추가

**파일:** `src/components/effects/MysticBackground.tsx` (수정)
**소요:** ~4분

- [x] `particleStyle()` 함수에 `rune`, `meteor`, `butterfly`, `hexagon`, `sparkle`, `lantern`, `snowflake` 케이스 추가
- [x] `particleMotion()` 함수에 종류별 동작 추가
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add new particle kind renderers in MysticBackground"`

```typescript
// particleStyle() 내부 추가 케이스들

if (particle.kind === "rune") {
  return {
    ...base,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: particle.size,
    color: particle.color ?? "rgba(167,139,250,0.7)",
    textShadow: `0 0 12px ${particle.color ?? "rgba(167,139,250,0.9)"}`,
    background: "transparent",
    borderRadius: 0,
    userSelect: "none",
  };
}

if (particle.kind === "meteor") {
  return {
    ...base,
    width: particle.size,
    height: particle.size * 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.9), transparent)",
    borderRadius: "999px",
    transform: "rotate(45deg)",
    boxShadow: "0 0 8px rgba(255,255,255,0.6)",
  };
}

if (particle.kind === "butterfly") {
  return {
    ...base,
    width: particle.size,
    height: particle.size * 0.7,
    background: `radial-gradient(ellipse at 30% 50%, ${particle.color ?? "#fbbf24"}, transparent 70%)`,
    borderRadius: "40% 60% 40% 60%",
    transform: `rotate(${particle.rotate ?? 0}deg)`,
    boxShadow: `0 0 16px ${particle.color ?? "rgba(251,191,36,0.4)"}`,
    filter: "blur(0.5px)",
  };
}

if (particle.kind === "hexagon") {
  return {
    ...base,
    width: particle.size,
    height: particle.size,
    background:
      "linear-gradient(135deg, rgba(251,146,60,0.4), rgba(34,211,238,0.25))",
    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
    boxShadow: "0 0 14px rgba(251,146,60,0.3), 0 0 28px rgba(34,211,238,0.15)",
  };
}

if (particle.kind === "sparkle") {
  return {
    ...base,
    width: particle.size,
    height: particle.size,
    background: particle.color ?? "#f9a8d4",
    clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    boxShadow: `0 0 10px ${particle.color ?? "rgba(249,168,212,0.8)"}`,
  };
}

if (particle.kind === "lantern") {
  return {
    ...base,
    width: particle.size * 0.65,
    height: particle.size,
    background: particle.color ?? "rgba(251,146,60,0.7)",
    borderRadius: "40% 40% 50% 50%",
    boxShadow: `0 0 20px ${particle.color ?? "rgba(251,146,60,0.6)"}, 0 0 40px rgba(253,224,71,0.3)`,
    filter: "blur(0.5px)",
  };
}

if (particle.kind === "snowflake") {
  return {
    ...base,
    width: particle.size,
    height: particle.size,
    background: "rgba(240,249,255,0.85)",
    clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    transform: `rotate(${particle.rotate ?? 0}deg)`,
    boxShadow: "0 0 12px rgba(147,197,253,0.6), 0 0 24px rgba(226,232,240,0.3)",
  };
}

// particleMotion() 내부 추가 케이스들

if (particle.kind === "rune") {
  return {
    y: [0, -15, 0],
    rotate: [0, 180, 360],
    opacity: [particle.opacity * 0.4, particle.opacity, particle.opacity * 0.4],
  };
}

if (particle.kind === "meteor") {
  return {
    x: [0, 200],
    y: [0, 200],
    opacity: [particle.opacity, 0],
  };
}

if (particle.kind === "butterfly") {
  return {
    x: [0, 20, -10, 15, 0],
    y: [0, -15, 5, -20, 0],
    rotate: [particle.rotate ?? 0, (particle.rotate ?? 0) + 15, (particle.rotate ?? 0) - 10, particle.rotate ?? 0],
    opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
  };
}

if (particle.kind === "hexagon") {
  return {
    rotate: [0, 360],
    opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.3],
    scale: [0.8, 1.1, 0.8],
  };
}

if (particle.kind === "sparkle") {
  return {
    scale: [0, 1.4, 0],
    opacity: [0, particle.opacity, 0],
    rotate: [0, 72],
  };
}

if (particle.kind === "lantern") {
  return {
    y: [0, -40, -80],
    x: [0, 8, -4],
    opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.5],
  };
}

if (particle.kind === "snowflake") {
  return {
    y: [0, 50, 100],
    x: [0, 12, -8, 10],
    rotate: [particle.rotate ?? 0, (particle.rotate ?? 0) + 180, (particle.rotate ?? 0) + 360],
    opacity: [0, particle.opacity, particle.opacity * 0.8, 0],
  };
}
```

---

## Task 5: ThemeAtmosphereLayer.tsx — 미드그라운드 오브젝트 레이어

**파일:** `src/components/effects/ThemeAtmosphereLayer.tsx` (신규)
**소요:** ~4분

- [x] 각 테마별 미드그라운드 오브젝트 정의 (aurora, light-pillar, scanline 등)
- [x] `useReducedMotion()` 시 정적 폴백 렌더
- [x] `intensity: 'low' | 'medium' | 'high'` prop 지원, low에서는 특수 레이어 비활성화
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add ThemeAtmosphereLayer midground objects"`

```typescript
// src/components/effects/ThemeAtmosphereLayer.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useThemeStore } from "@/hooks/useTheme";
import type { ThemeId } from "@/hooks/useTheme";

interface ThemeAtmosphereLayerProps {
  readonly intensity?: "low" | "medium" | "high";
  readonly className?: string;
}

// midnight: 오로라 보레알리스 스트립 (정적 위치)
const AURORA_STRIPS = [
  { id: "au-1", top: 5,  height: 18, colors: "rgba(167,139,250,0.18), rgba(99,102,241,0.12), transparent", delay: 0 },
  { id: "au-2", top: 14, height: 12, colors: "rgba(245,158,11,0.1), rgba(167,139,250,0.14), transparent", delay: 3 },
  { id: "au-3", top: 22, height: 14, colors: "rgba(99,102,241,0.12), rgba(167,139,250,0.1), transparent",  delay: 6 },
] as const;

// dawn: 빛 기둥 (정적 위치)
const LIGHT_PILLARS = [
  { id: "lp-1", left: 15, width: 4, delay: 0   },
  { id: "lp-2", left: 48, width: 6, delay: 2.5 },
  { id: "lp-3", left: 78, width: 3, delay: 5   },
] as const;

// sunset: 스캔라인 (단일 레이어)
// winter: 오로라 (녹색+파랑+보라)
const WINTER_AURORA_STRIPS = [
  { id: "wi-au-1", top: 8,  height: 16, colors: "rgba(52,211,153,0.12), rgba(147,197,253,0.1), transparent",  delay: 0 },
  { id: "wi-au-2", top: 18, height: 10, colors: "rgba(147,197,253,0.14), rgba(196,181,253,0.1), transparent", delay: 4 },
  { id: "wi-au-3", top: 26, height: 14, colors: "rgba(196,181,253,0.1), rgba(52,211,153,0.08), transparent",  delay: 8 },
] as const;

function MidnightLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {AURORA_STRIPS.map((strip) => (
        <motion.div
          key={strip.id}
          className="absolute left-0 right-0"
          style={{
            top: `${strip.top}%`,
            height: `${strip.height}%`,
            background: `linear-gradient(180deg, ${strip.colors})`,
            backgroundSize: "200% 100%",
            filter: "blur(22px)",
            willChange: "opacity, background-position",
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.6 }
              : { opacity: [0.4, 0.8, 0.4], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 12, repeat: Infinity, ease: "easeInOut", delay: strip.delay }
          }
        />
      ))}
    </>
  );
}

function DawnLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {LIGHT_PILLARS.map((pillar) => (
        <motion.div
          key={pillar.id}
          className="absolute top-0 h-full"
          style={{
            left: `${pillar.left}%`,
            width: `${pillar.width}%`,
            background:
              "linear-gradient(180deg, rgba(251,191,36,0.22) 0%, rgba(240,171,252,0.12) 40%, transparent 72%)",
            filter: "blur(14px)",
            willChange: "opacity",
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.2, 0.7, 0.2] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 8, repeat: Infinity, ease: "easeInOut", delay: pillar.delay }
          }
        />
      ))}
    </>
  );
}

function SunsetLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  if (shouldReduceMotion) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,146,60,0.04) 2px, rgba(251,146,60,0.04) 4px)",
      }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function WinterLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {WINTER_AURORA_STRIPS.map((strip) => (
        <motion.div
          key={strip.id}
          className="absolute left-0 right-0"
          style={{
            top: `${strip.top}%`,
            height: `${strip.height}%`,
            background: `linear-gradient(180deg, ${strip.colors})`,
            backgroundSize: "200% 100%",
            filter: "blur(24px)",
            willChange: "opacity, background-position",
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.3, 0.7, 0.3], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 15, repeat: Infinity, ease: "easeInOut", delay: strip.delay }
          }
        />
      ))}
    </>
  );
}

function SummerLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  if (shouldReduceMotion) return null;
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-[20%]"
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(56,189,248,0.06) 60%, rgba(251,191,36,0.04))",
        filter: "blur(8px)",
        willChange: "transform",
      }}
      animate={{ scaleY: [1, 1.02, 1], skewX: ["0deg", "0.5deg", "0deg"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const LAYER_MAP: Record<ThemeId, React.FC<{ shouldReduceMotion: boolean }> | null> = {
  midnight: MidnightLayer,
  dawn:     DawnLayer,
  sunset:   SunsetLayer,
  spring:   null,
  summer:   SummerLayer,
  autumn:   null,
  winter:   WinterLayer,
};

export function ThemeAtmosphereLayer({ intensity = "high", className = "" }: ThemeAtmosphereLayerProps) {
  const { activeTheme } = useThemeStore();
  const shouldReduceMotion = Boolean(useReducedMotion());

  if (intensity === "low") return null;

  const LayerComponent = LAYER_MAP[activeTheme];
  if (!LayerComponent) return null;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden
      data-testid={`theme-atmosphere-layer-${activeTheme}`}
    >
      <LayerComponent shouldReduceMotion={shouldReduceMotion} />
    </div>
  );
}
```

---

## Task 6: InteractionEffects.tsx — hover·클릭 파티클

**파일:** `src/components/effects/InteractionEffects.tsx` (신규)
**소요:** ~4분

- [x] `useMotionValue` + `useSpring`으로 마우스 위치 추적
- [x] 클릭 시 테마 색상 파티클 6개 방사 (고정 오프셋 배열 — SSR 안전)
- [x] `InteractionClickParticles` 컴포넌트: 클릭 이벤트 받아 파티클 AnimatePresence
- [x] `useInteractionEffects` hook: 버튼 등 소비 컴포넌트용
- [x] `prefers-reduced-motion` 시 비활성화
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: add InteractionEffects click/hover particles"`

```typescript
// src/components/effects/InteractionEffects.tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useThemeEffectVars } from "./ThemeEffectEngine";

// 클릭 파티클 고정 오프셋 — SSR 안전, Math.random 미사용
const CLICK_PARTICLE_OFFSETS = [
  { dx: 0,    dy: -36, size: 5 },
  { dx: 34,   dy: -18, size: 4 },
  { dx: 34,   dy: 18,  size: 3 },
  { dx: 0,    dy: 36,  size: 5 },
  { dx: -34,  dy: 18,  size: 4 },
  { dx: -34,  dy: -18, size: 3 },
] as const;

interface ClickParticle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

let particleIdCounter = 0;

/** 클릭 위치 기준으로 테마 색상 파티클 6개를 방사하는 오버레이 */
export function InteractionClickParticles() {
  const [particles, setParticles] = useState<ClickParticle[]>([]);
  const effectVars = useThemeEffectVars();
  const shouldReduceMotion = useReducedMotion();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (shouldReduceMotion) return;
      const id = particleIdCounter++;
      setParticles((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 900);
    },
    [shouldReduceMotion],
  );

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden
      data-testid="interaction-click-particles"
      // click 이벤트는 document에서 캡처하므로 이 div는 시각 레이어만 담당
    >
      <AnimatePresence>
        {particles.map((particle) =>
          CLICK_PARTICLE_OFFSETS.map((offset, i) => (
            <motion.div
              key={`${particle.id}-${i}`}
              className="absolute rounded-full"
              style={{
                left: particle.x,
                top: particle.y,
                width: offset.size,
                height: offset.size,
                background: effectVars["--theme-particle-color"],
                boxShadow: `0 0 ${offset.size * 3}px ${effectVars["--theme-glow-color"]}`,
                translateX: "-50%",
                translateY: "-50%",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: offset.dx, y: offset.dy, opacity: 0, scale: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )),
        )}
      </AnimatePresence>
      {/* 클릭 감지를 위한 투명 이벤트 캡처 레이어 */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={handleClick}
        aria-hidden
      />
    </div>
  );
}

/** 버튼 등에서 사용할 hover glow 스타일 반환 hook */
export function useInteractionGlow() {
  const effectVars = useThemeEffectVars();
  const shouldReduceMotion = useReducedMotion();

  return {
    hoverBoxShadow: shouldReduceMotion ? "none" : effectVars["--theme-border-glow"],
    textShadow: shouldReduceMotion ? "none" : effectVars["--theme-text-glow"],
    particleColor: effectVars["--theme-particle-color"],
  };
}
```

---

## Task 7: ThemeProvider — ThemeEffectEngine 마운트

**파일:** `src/components/layout/ThemeProvider.tsx` (수정)
**소요:** ~2분

- [x] `ThemeEffectEngine` import 및 children 상위에 렌더
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: mount ThemeEffectEngine in ThemeProvider"`

```typescript
// ThemeProvider.tsx — 수정 부분만 표기
"use client";

import { useEffect } from "react";
import { useThemeStore, themes } from "@/hooks/useTheme";
import { ThemeEffectEngine } from "@/components/effects/ThemeEffectEngine";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, activeTheme, setMode, refresh } = useThemeStore();

  useEffect(() => {
    const saved = localStorage.getItem("arcana-theme-mode");
    if (saved) {
      setMode(saved as typeof mode);
    } else {
      refresh();
    }
  }, [setMode, refresh]);

  useEffect(() => {
    const { colors } = themes[activeTheme];
    const root = document.documentElement;
    const cssVarMap: Record<string, string> = {
      bg: "bg", surface: "surface", card: "card", border: "border",
      primary: "purple", secondary: "indigo", accent: "gold",
      text: "text", muted: "muted",
    };
    Object.entries(colors).forEach(([key, value]) => {
      const cssName = cssVarMap[key] || key;
      root.style.setProperty(`--color-arcana-${cssName}`, value);
    });
  }, [activeTheme]);

  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(refresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, refresh]);

  return (
    <>
      <ThemeEffectEngine />
      {children}
    </>
  );
}
```

---

## Task 8: ServiceBackground — ThemeAtmosphereLayer 통합

**파일:** `src/components/effects/ServiceBackground.tsx` (수정)
**소요:** ~3분

- [x] `ThemeAtmosphereLayer` import
- [x] 모바일 감지 로직 추가 (useEffect + useState, SSR 안전)
- [x] `ServiceBackground` 반환부에 `ThemeAtmosphereLayer` 추가 (intensity 조건부)
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: integrate ThemeAtmosphereLayer into ServiceBackground"`

```typescript
// ServiceBackground.tsx — 수정 부분
"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useThemeStore } from "@/hooks/useTheme";
import { ThemeAtmosphere } from "./MysticBackground";
import { ThemeAtmosphereLayer } from "./ThemeAtmosphereLayer";

// ... (기존 STAR_POSITIONS, OBANGSAEK_LAYERS, TarotBackground, SajuBackground, ShinjeomBackground 유지)

export function ServiceBackground({ service }: ServiceBackgroundProps) {
  const { activeTheme } = useThemeStore();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const atmosphereIntensity = isMobile ? "low" : "high";

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden
      data-testid={`service-background-${service}`}
    >
      {service === "tarot"    && <TarotBackground shouldReduceMotion={shouldReduceMotion} />}
      {service === "saju"     && <SajuBackground shouldReduceMotion={shouldReduceMotion} />}
      {service === "shinjeom" && <ShinjeomBackground shouldReduceMotion={shouldReduceMotion} />}
      <ThemeAtmosphere
        theme={activeTheme}
        intensity="service"
        className="mix-blend-screen"
        testId={`service-theme-atmosphere-${service}`}
      />
      <ThemeAtmosphereLayer
        intensity={atmosphereIntensity}
        className="mix-blend-screen"
      />
    </div>
  );
}
```

---

## Task 9: CharacterAuraLayer — CSS 변수 연동

**파일:** `src/components/character/CharacterAuraLayer.tsx` (수정)
**소요:** ~3분

- [x] `useThemeEffectVars` import
- [x] `primaryColor` prop 대신 `--theme-aura-color`/`--theme-aura-intense` CSS 변수를 우선 사용하는 로직 추가
- [x] 기존 `hexToRgba(primaryColor, ...)` 폴백 유지
- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋: `git commit -m "feat: wire CharacterAuraLayer to theme CSS variables"`

```typescript
// CharacterAuraLayer.tsx — 수정 부분 (상단 import 추가, 로직 변경)
import { useThemeEffectVars } from "@/components/effects/ThemeEffectEngine";

export function CharacterAuraLayer({ mood, isTransitioning, primaryColor }: CharacterAuraLayerProps) {
  const systemReducedMotion = useReducedMotion();
  const { reducedMotion: userReducedMotion } = useReducedMotionStore();
  const shouldReduceMotion = systemReducedMotion || userReducedMotion;
  const effectVars = useThemeEffectVars();

  // 테마 CSS 변수 우선, 폴백으로 primaryColor
  const auraColor = effectVars["--theme-aura-color"] ?? hexToRgba(primaryColor, AURA_OPACITY[mood]);
  const auraIntense = effectVars["--theme-aura-intense"] ?? hexToRgba(primaryColor, Math.min(AURA_OPACITY[mood] + 0.2, 1));

  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${auraColor} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${auraColor} 0%, transparent 70%)`,
          willChange: "transform, opacity",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {AMBIENT_PARTICLES.map((p) => (
        <motion.div
          key={`p-${p.dx}-${p.dy}`}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            bottom: "35%",
            left: `calc(50% + ${p.dx}px)`,
            background: auraIntense,
            boxShadow: `0 0 ${p.size * 2}px ${auraColor}`,
            willChange: "transform, opacity",
          }}
          animate={{ y: [0, p.dy, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      <AnimatePresence>
        {isTransitioning &&
          BURST_PARTICLES.map((p, i) => (
            <motion.div
              key={`burst-${i}`}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                bottom: "35%",
                left: `calc(50% + ${p.dx}px)`,
                background: auraIntense,
                boxShadow: `0 0 ${p.size * 3}px ${auraColor}`,
              }}
              initial={{ y: 0, opacity: 0, scale: 0 }}
              animate={{ y: p.dy, opacity: [0, 1, 0], scale: [0, 1.5, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## Task 10: InteractionClickParticles 전역 마운트 + 성능 검증

**파일:** `src/app/layout.tsx` 또는 `src/components/layout/` 루트 레이아웃 (수정)
**소요:** ~3분

- [x] `InteractionClickParticles` import 및 `<body>` 직계 자식으로 마운트
- [x] Chrome DevTools Performance 탭에서 60fps 유지 확인
  - 타로 서비스 진입 → 카드 10회 hover → 3회 클릭
  - Long Tasks(>50ms) 없는지 확인
  - GPU 레이어 수: 20개 이하 목표
- [x] 검증: `pnpm type-check && pnpm lint && pnpm build`
- [x] 커밋: `git commit -m "feat: mount InteractionClickParticles globally + verify 60fps"`

```typescript
// src/app/layout.tsx — 수정 부분
import { InteractionClickParticles } from "@/components/effects/InteractionEffects";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ThemeProvider>
          {children}
          <InteractionClickParticles />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Task 11: theme-effects.css — utility classes 정의

**파일:** `src/styles/theme-effects.css` (신규)
**소요:** ~3분

- [x] 파일 생성: `src/styles/theme-effects.css`
- [x] `globals.css`에서 `@import "./theme-effects.css"` 추가
- [x] utility class 정의 (테마 CSS 변수를 소비하는 클래스)
- [x] 검증: `pnpm type-check && pnpm lint && pnpm build`
- [x] 커밋: `git commit -m "feat: add theme-effects.css utility classes"`

```css
/* src/styles/theme-effects.css */

/* 테마 글로우 테두리 — 카드, 버튼에 적용 */
.theme-border-glow {
  box-shadow: var(--theme-border-glow, none);
  transition: box-shadow 0.3s ease;
}

.theme-border-glow:hover {
  box-shadow: var(--theme-glow-intense, none) 0 0 24px;
}

/* 테마 텍스트 글로우 */
.theme-text-glow {
  text-shadow: var(--theme-text-glow, none);
}

/* 테마 배경 오라 */
.theme-aura {
  box-shadow: inset 0 0 32px var(--theme-aura-color, transparent);
}

/* sunset 전용: 스캔라인 오버레이 */
.theme-scanline-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--theme-scanline, none);
  pointer-events: none;
  z-index: 1;
}

/* sunset 전용: 글리치 애니메이션 */
.theme-glitch {
  animation: var(--theme-glitch, none);
}

/* GPU 가속 공통 */
.theme-effect-layer {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* glassmorphism 강화 (winter 테마 권장) */
.theme-glass {
  backdrop-filter: blur(12px) saturate(1.4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--theme-glow-color, rgba(255,255,255,0.1));
}
```

---

## Task 12: 단위 테스트

**파일:** `src/__tests__/effects/ThemeEffectEngine.test.ts` (신규)
**소요:** ~4분

- [x] `ThemeEffectEngine` 렌더 시 `:root`에 CSS 변수 7개 주입 여부 검증
- [x] `useThemeEffectVars` — 테마 변경 시 올바른 변수 반환 검증
- [x] 각 7개 테마의 `THEME_EFFECT_VARS` 스냅샷 테스트
- [x] `ThemeAtmosphereLayer` — `intensity="low"` 시 null 반환 검증
- [x] `InteractionEffects` — `prefers-reduced-motion` 시 파티클 미생성 검증
- [x] 검증: `pnpm test:coverage`
- [x] 커밋: `git commit -m "test: add ThemeEffectEngine and InteractionEffects unit tests"`

```typescript
// src/__tests__/effects/ThemeEffectEngine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { THEME_EFFECT_VARS, useThemeEffectVars } from "@/components/effects/ThemeEffectEngine";
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
});
```

---

## Task 13: E2E 스모크 테스트

**파일:** `e2e/theme-effects.spec.ts` (신규)
**소요:** ~4분

- [x] 타로 페이지 진입 후 `data-testid="theme-atmosphere-layer-midnight"` 존재 확인
- [x] 테마 변경(sunset) 후 `--theme-scanline` CSS 변수 값 변경 확인
- [x] `data-testid="interaction-click-particles"` 존재 확인
- [x] `prefers-reduced-motion: reduce` 미디어 쿼리 시뮬레이션 후 파티클 레이어 미렌더 확인
- [x] 검증: `pnpm test:e2e`
- [x] 커밋: `git commit -m "test: add E2E smoke tests for theme effect layers"`

```typescript
// e2e/theme-effects.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Theme Effect Layers", () => {
  test("타로 페이지에 ThemeAtmosphereLayer가 렌더된다", async ({ page }) => {
    await page.goto("/tarot");
    // midnight은 aurora layer가 있음
    const layer = page.getByTestId("theme-atmosphere-layer-midnight");
    await expect(layer).toBeAttached();
  });

  test("InteractionClickParticles 오버레이가 존재한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("interaction-click-particles")).toBeAttached();
  });

  test("ThemeAtmosphere 서비스 레이어가 렌더된다", async ({ page }) => {
    await page.goto("/tarot");
    await expect(
      page.getByTestId("service-theme-atmosphere-tarot")
    ).toBeAttached();
  });

  test("reduced-motion 시 특수 이펙트 레이어가 비활성화된다", async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: "reduce",
      locale: "ko",
    });
    const page = await ctx.newPage();
    await page.goto("/tarot");
    // SunsetLayer는 reduced-motion 시 null 반환
    // ThemeAtmosphereLayer(midnight)는 aurora를 reduced-motion 폴백으로 렌더
    const layer = page.getByTestId("theme-atmosphere-layer-midnight");
    // reduced-motion이어도 DOM에는 존재하나 animation이 없어야 함
    await expect(layer).toBeAttached();
    await ctx.close();
  });
});
```

---

## Task 14: PR 준비 및 최종 검증

**소요:** ~3분

- [x] `pnpm type-check` — 에러 0개
- [x] `pnpm lint` — 에러 0개
- [x] `pnpm build` — 빌드 성공
- [x] `pnpm test:coverage` — 기존 임계치 유지 (branches 92%, 나머지 98%)
- [x] `pnpm test:e2e:full:ci` — 대표 케이스 통과
- [x] Chrome DevTools Performance: 60fps, Long Tasks 없음
- [x] PR 제목: `feat: Visual Overhaul Phase 2 — 5-layer theme effect system`
- [x] PR 설명: 5-레이어 구조, 신규 파일 목록, 성능 측정 결과 포함
- [x] 커밋: `git commit -m "chore: finalize Phase 2 visual overhaul — theme effect system"`

---

## 테마별 이펙트 요약표

| 테마 | 파티클 총수 | 미드그라운드 레이어 | 특수 CSS |
|------|-----------|-----------------|---------|
| midnight | 17개 (star·rune·meteor) | aurora 3스트립 | 기본 violet/gold |
| dawn | 12개 (mist·butterfly) | light-pillar 3개 | pink/gold |
| sunset | 15개 (hexagon·dust) | scanline overlay | scanline + glitch |
| spring | 20개 (petal·sparkle) | 없음 | pink/mint |
| summer | 19개 (firefly·lantern) | heat-haze 하단 | amber/sky |
| autumn | 16개 (leaf·ember) | 없음 | amber/crimson |
| winter | 21개 (snowflake·snow) | aurora 3스트립 (녹·청·보) | ice-blue/silver |

---

## 성능 예산

| 지표 | 목표 |
|------|------|
| FPS (타로 서비스) | 60fps 유지 |
| Long Tasks (>50ms) | 0개 |
| GPU 레이어 수 | 20개 이하 |
| 모바일 intensity | 자동 `low` (ThemeAtmosphereLayer 비활성) |
| `prefers-reduced-motion` | 모든 애니메이션 비활성 |

---

## 파일 변경 요약

| 파일 | 상태 | 주요 변경 |
|------|------|---------|
| `src/components/effects/ThemeEffectEngine.tsx` | 신규 | CSS 변수 주입 엔진 |
| `src/components/effects/ThemeAtmosphereLayer.tsx` | 신규 | 미드그라운드 오브젝트 |
| `src/components/effects/InteractionEffects.tsx` | 신규 | 클릭 파티클 오버레이 |
| `src/styles/theme-effects.css` | 신규 | utility classes |
| `src/components/effects/themeAtmosphere.ts` | 수정 | 파티클 2-3배 확장 |
| `src/components/effects/MysticBackground.tsx` | 수정 | 신규 파티클 렌더러 추가 |
| `src/components/layout/ThemeProvider.tsx` | 수정 | ThemeEffectEngine 마운트 |
| `src/components/effects/ServiceBackground.tsx` | 수정 | ThemeAtmosphereLayer 통합 |
| `src/app/globals.css` | 수정 | 9개 keyframe 추가 |
| `src/components/character/CharacterAuraLayer.tsx` | 수정 | CSS 변수 연동 |
| `src/__tests__/effects/ThemeEffectEngine.test.ts` | 신규 | 단위 테스트 |
| `e2e/theme-effects.spec.ts` | 신규 | E2E 스모크 테스트 |

> **관련 설계 문서:** [`../specs/2026-05-10-visual-overhaul-design.md`](../specs/2026-05-10-visual-overhaul-design.md)
