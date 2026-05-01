# Visual FX Revitalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 컴포넌트 구조를 유지하면서 안개·룬 배경(MysticBackground), 오라·파티클(CharacterAuraLayer), 글로우 버스트 전환(GlowBurstRing), idle 루프 drop-shadow를 레이어로 추가해 신비롭고 몰입감 있는 시각 경험을 구현한다.

**Architecture:** 신규 컴포넌트 2개(MysticBackground, CharacterAuraLayer)를 독립 파일로 생성하고, GlowBurstRing은 CharacterDisplay 내 인라인 정의, SpriteAnimator는 idle 애니메이션에 drop-shadow만 추가한다. 페이지 파일에는 `<MysticBackground service="..." />` 한 줄씩만 삽입하여 기존 로직에 영향을 주지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion v12, TypeScript strict, Tailwind CSS v4

---

## 파일 구조

| 파일 | 유형 | 역할 |
|---|---|---|
| `src/components/effects/MysticBackground.tsx` | **신규** | SVG 안개 + 별자리선 + 서비스별 룬 심볼 |
| `src/components/character/CharacterAuraLayer.tsx` | **신규** | 오라 글로우 링 + mood 반응 파티클 (고정 offset) |
| `src/components/character/CharacterDisplay.tsx` | **수정** | GlowBurstRing 인라인 정의 + CharacterAuraLayer 통합 + isTransitioning 상태 |
| `src/components/character/SpriteAnimator.tsx` | **수정** | LOOP_MOTION에 drop-shadow filter 추가 |
| `src/components/home/HeroSection.tsx` | **수정** | `<MysticBackground service="home" />` 삽입 |
| `src/app/tarot/session/page.tsx` | **수정** | `<MysticBackground service="tarot" />` 삽입 |
| `src/app/saju/session/page.tsx` | **수정** | `<MysticBackground service="saju" />` 삽입 |
| `src/app/shinjeom/session/page.tsx` | **수정** | `<MysticBackground service="shinjeom" />` 삽입 |

> **참고 — 테스트 전략:** `src/components/**`는 vitest.config.ts에서 명시적으로 제외(E2E 커버). 신규 컴포넌트는 단위 테스트 대신 `pnpm type-check + pnpm build` + 브라우저 수동 확인으로 검증한다.

---

## Task 1: MysticBackground 컴포넌트 생성

**Files:**
- Create: `src/components/effects/MysticBackground.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
"use client";

import { motion } from "framer-motion";

type Service = "home" | "tarot" | "saju" | "shinjeom";

interface MysticBackgroundProps {
  readonly service: Service;
}

const MIST_COLOR: Record<Service, string> = {
  home:     "rgba(88,28,135,0.12)",
  tarot:    "rgba(88,28,135,0.18)",
  saju:     "rgba(146,64,14,0.15)",
  shinjeom: "rgba(30,58,138,0.15)",
};

// 별 위치 (고정값 — SSR 안전, Math.random 미사용)
const STAR_POINTS = [
  { cx: 8,  cy: 12, r: 0.8 },
  { cx: 23, cy: 8,  r: 0.5 },
  { cx: 45, cy: 15, r: 0.8 },
  { cx: 72, cy: 7,  r: 0.5 },
  { cx: 88, cy: 18, r: 0.8 },
  { cx: 5,  cy: 75, r: 0.5 },
  { cx: 92, cy: 65, r: 0.8 },
  { cx: 60, cy: 85, r: 0.5 },
];

// 별자리 연결선
const CONSTELLATION_LINES = [
  { x1: 8,  y1: 12, x2: 23, y2: 8  },
  { x1: 23, y1: 8,  x2: 45, y2: 15 },
  { x1: 45, y1: 15, x2: 72, y2: 7  },
  { x1: 72, y1: 7,  x2: 88, y2: 18 },
];

// 서비스별 룬 심볼 텍스트
const RUNE_SYMBOLS: Record<Service, string[]> = {
  home:     [],
  tarot:    ["✦", "✧", "✦"],
  saju:     ["☰", "☱", "☲", "☳"],
  shinjeom: ["☯", "✦", "◯"],
};

// 룬 위치 (고정 — SSR 안전)
const RUNE_POSITIONS = [
  { top: "20%", left: "8%",  fontSize: 14, opacity: 0.15 },
  { top: "60%", left: "5%",  fontSize: 12, opacity: 0.12 },
  { top: "30%", left: "87%", fontSize: 14, opacity: 0.15 },
  { top: "70%", left: "89%", fontSize: 12, opacity: 0.12 },
];

export function MysticBackground({ service }: MysticBackgroundProps) {
  const mistColor = MIST_COLOR[service];
  const runes = RUNE_SYMBOLS[service];
  const filterId = `turbulence-${service}`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
      {/* SVG feTurbulence 안개 필터 정의 */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.008"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* 안개 레이어 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2/5"
        style={{ filter: `url(#${filterId})` }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${mistColor} 60%, ${mistColor} 100%)`,
            filter: "blur(12px)",
          }}
        />
      </motion.div>

      {/* 별자리 SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {STAR_POINTS.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.cx} cy={s.cy} r={s.r}
            fill="rgba(212,175,55,0.5)"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}
        {CONSTELLATION_LINES.map((l, i) => (
          <motion.path
            key={i}
            d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
            stroke="rgba(167,139,250,0.2)"
            strokeWidth="0.3"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 + i * 0.4, ease: "easeOut" }}
          />
        ))}
      </svg>

      {/* 서비스별 룬 심볼 */}
      {runes.map((rune, i) => {
        const pos = RUNE_POSITIONS[i];
        if (!pos) return null;
        return (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{ top: pos.top, left: pos.left, fontSize: pos.fontSize, color: `rgba(167,139,250,${pos.opacity})` }}
            animate={{ opacity: [pos.opacity * 0.6, pos.opacity, pos.opacity * 0.6], rotate: [0, 3, 0, -3, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            {rune}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: prefers-reduced-motion 지원 추가**

`src/components/effects/MysticBackground.tsx` 를 아래와 같이 수정한다.

import 줄 변경:
```tsx
import { motion, useReducedMotion } from "framer-motion";
```

`export function MysticBackground` 본문 첫 줄에 추가:
```tsx
  const shouldReduceMotion = useReducedMotion();
```

안개 레이어 `animate` prop 변경:
```tsx
        animate={shouldReduceMotion ? { opacity: 0.7 } : { opacity: [0.6, 1, 0.6] }}
```

별 `animate` prop 변경:
```tsx
            animate={shouldReduceMotion ? { opacity: 0.4 } : { opacity: [0.3, 0.8, 0.3] }}
```

룬 심볼 렌더 블록 변경 (`motion.div` → 조건부):
```tsx
        return shouldReduceMotion ? (
          <div
            key={i}
            className="absolute select-none"
            style={{ top: pos.top, left: pos.left, fontSize: pos.fontSize, color: `rgba(167,139,250,${pos.opacity})` }}
          >
            {rune}
          </div>
        ) : (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{ top: pos.top, left: pos.left, fontSize: pos.fontSize, color: `rgba(167,139,250,${pos.opacity})` }}
            animate={{ opacity: [pos.opacity * 0.6, pos.opacity, pos.opacity * 0.6], rotate: [0, 3, 0, -3, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            {rune}
          </motion.div>
        );
```

- [ ] **Step 3: 타입 검사**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm type-check
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/effects/MysticBackground.tsx
git commit -m "feat: MysticBackground 컴포넌트 추가 — 안개·별자리·룬 배경 레이어 (prefers-reduced-motion 지원)"
```

---

## Task 2: CharacterAuraLayer 컴포넌트 생성

**Files:**
- Create: `src/components/character/CharacterAuraLayer.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

interface CharacterAuraLayerProps {
  readonly mood: Mood;
  readonly isTransitioning: boolean;
}

// mood별 오라 색상
const AURA_COLOR: Record<Mood, string> = {
  default:   "rgba(139,92,246,0.5)",
  smile:     "rgba(212,175,55,0.6)",
  mystical:  "rgba(139,92,246,0.8)",
  serious:   "rgba(99,102,241,0.5)",
  surprised: "rgba(251,146,60,0.5)",
  wink:      "rgba(244,114,182,0.5)",
};

// 상시 파티클 고정 offset (SSR 안전 — Math.random 미사용)
const AMBIENT_PARTICLES = [
  { dx: -24, dy: -60, size: 3, delay: 0 },
  { dx: 0,   dy: -70, size: 2, delay: 1.2 },
  { dx: 24,  dy: -55, size: 3, delay: 2.1 },
] as const;

// burst 파티클 고정 offset
const BURST_PARTICLES = [
  { dx: -30, dy: -75, size: 4, delay: 0 },
  { dx: -12, dy: -85, size: 3, delay: 0.08 },
  { dx: 6,   dy: -80, size: 4, delay: 0.15 },
  { dx: 22,  dy: -72, size: 3, delay: 0.05 },
  { dx: 36,  dy: -65, size: 4, delay: 0.12 },
] as const;

export function CharacterAuraLayer({ mood, isTransitioning }: CharacterAuraLayerProps) {
  const color = AURA_COLOR[mood];

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
      {/* 오라 글로우 링 — 호흡 루프 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${color} 0%, transparent 70%)`,
          willChange: "transform",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 상시 파티클 3개 */}
      {AMBIENT_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            bottom: "35%",
            left: `calc(50% + ${p.dx}px)`,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            willChange: "transform",
          }}
          animate={{ y: [0, p.dy, p.dy * 1.2], opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: p.delay }}
        />
      ))}

      {/* burst 파티클 5개 — isTransitioning 시 렌더 */}
      <AnimatePresence>
        {isTransitioning && BURST_PARTICLES.map((p, i) => (
          <motion.div
            key={`burst-${i}`}
            className="absolute rounded-full"
            style={{
              width: p.size, height: p.size,
              bottom: "35%",
              left: `calc(50% + ${p.dx}px)`,
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}`,
            }}
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{ y: p.dy, opacity: [0, 1, 0], scale: [0, 1.5, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: prefers-reduced-motion 지원 추가**

`src/components/character/CharacterAuraLayer.tsx` 를 아래와 같이 수정한다.

import 줄 변경:
```tsx
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

`export function CharacterAuraLayer` 본문 첫 줄에 추가:
```tsx
  const shouldReduceMotion = useReducedMotion();
```

`return` 바로 위에 reduced-motion 조기 반환 추가:
```tsx
  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${color} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/character/CharacterAuraLayer.tsx
git commit -m "feat: CharacterAuraLayer 컴포넌트 추가 — 오라 글로우 + mood 반응 파티클 (prefers-reduced-motion 지원)"
```

---

## Task 3: SpriteAnimator idle 루프 drop-shadow 업그레이드

**Files:**
- Modify: `src/components/character/SpriteAnimator.tsx`

현재 `LOOP_MOTION`의 `float`, `float-strong`, `bounce`, `breathe`에 `filter` 키가 없음. `mystical`은 이미 있음. 4가지 타입에 drop-shadow를 추가한다.

- [ ] **Step 1: LOOP_MOTION 수정**

[src/components/character/SpriteAnimator.tsx](src/components/character/SpriteAnimator.tsx) 의 `LOOP_MOTION` 상수를 아래로 교체한다:

```ts
const LOOP_MOTION: Record<string, Record<string, number[] | string[]>> = {
  float: {
    y: [0, -6, 0],
    scale: [1, 1.01, 1],
    filter: [
      "drop-shadow(0 0 6px rgba(139,92,246,0.25))",
      "drop-shadow(0 0 16px rgba(139,92,246,0.60))",
      "drop-shadow(0 0 6px rgba(139,92,246,0.25))",
    ],
  },
  "float-strong": {
    y: [0, -8, 0],
    scale: [1, 1.015, 1],
    filter: [
      "drop-shadow(0 0 8px rgba(139,92,246,0.30))",
      "drop-shadow(0 0 22px rgba(139,92,246,0.70))",
      "drop-shadow(0 0 8px rgba(139,92,246,0.30))",
    ],
  },
  bounce: {
    y: [0, -12, 0],
    scale: [1, 1.02, 1],
    filter: [
      "drop-shadow(0 0 6px rgba(212,175,55,0.20))",
      "drop-shadow(0 0 18px rgba(212,175,55,0.55))",
      "drop-shadow(0 0 6px rgba(212,175,55,0.20))",
    ],
  },
  breathe: {
    y: [0, -2, 0, -1, 0],
    scale: [1, 1.005, 1, 1.003, 1],
    opacity: [1, 1, 1, 0.88, 1],
    filter: [
      "drop-shadow(0 0 4px rgba(139,92,246,0.20))",
      "drop-shadow(0 0 12px rgba(139,92,246,0.50))",
      "drop-shadow(0 0 4px rgba(139,92,246,0.20))",
      "drop-shadow(0 0 8px rgba(139,92,246,0.35))",
      "drop-shadow(0 0 4px rgba(139,92,246,0.20))",
    ],
  },
  mystical: {
    y: [0, -10, 0],
    scale: [1, 1.02, 1],
    filter: [
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
      "drop-shadow(0 0 20px rgba(139,92,246,0.6))",
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
    ],
  },
};
```

- [ ] **Step 2: 타입 검사 + 기존 테스트 통과 확인**

```bash
pnpm type-check && pnpm test
```

Expected: 타입 에러 없음, 기존 672개 테스트 모두 PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/SpriteAnimator.tsx
git commit -m "style: SpriteAnimator idle 루프에 drop-shadow 글로우 추가"
```

---

## Task 4: CharacterDisplay — GlowBurstRing + CharacterAuraLayer 통합

**Files:**
- Modify: `src/components/character/CharacterDisplay.tsx`

GlowBurstRing은 `overflow-hidden` 마스크 div 밖에 위치해야 버스트 링이 클리핑되지 않음. CharacterDisplay 루트 div 안에 직접 배치한다.

- [ ] **Step 1: CharacterDisplay.tsx 전체 교체**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { CharacterAuraLayer } from "./CharacterAuraLayer";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  readonly character: CharacterConfig;
  readonly mood: Mood;
  readonly className?: string;
}

// mood별 버스트 링 색상
const BURST_COLOR: Record<Mood, string> = {
  default:   "rgba(139,92,246,0.7)",
  smile:     "rgba(212,175,55,0.8)",
  mystical:  "rgba(139,92,246,0.9)",
  serious:   "rgba(99,102,241,0.7)",
  surprised: "rgba(251,146,60,0.8)",
  wink:      "rgba(244,114,182,0.8)",
};

function GlowBurstRing({ mood }: { readonly mood: Mood }) {
  const color = BURST_COLOR[mood];
  return (
    <motion.div
      className="absolute pointer-events-none z-20"
      style={{
        inset: "-5%",
        borderRadius: "45%",
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 16px ${color}, 0 0 32px ${color}`,
      }}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 2.5, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
  );
}

export function CharacterDisplay({ character, mood, className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isMountedRef = useRef(false);

  // mood 변경 시 isTransitioning true → 500ms 후 false (첫 마운트 스킵)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    setIsTransitioning(true);
    const t = setTimeout(() => { setIsTransitioning(false); }, 500);
    return () => { clearTimeout(t); };
  }, [mood]);

  const handleAnimationEnd = useCallback(() => {
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* 기존 하단 ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 md:w-64 md:h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />

      {/* CharacterAuraLayer — overflow-hidden 밖 */}
      <CharacterAuraLayer mood={mood} isTransitioning={isTransitioning} />

      {/* GlowBurstRing — mood 전환 시 1회 재생, overflow-hidden 밖 */}
      <AnimatePresence>
        {isTransitioning && (
          <GlowBurstRing key={`burst-${mood}`} mood={mood} />
        )}
      </AnimatePresence>

      {/* 마스크 div (기존 유지) */}
      <div
        className="relative z-10 w-full h-full overflow-hidden"
        style={{
          WebkitMaskImage: [
            "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
            "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
            "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
            "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
          ].join(", "),
          WebkitMaskComposite: "destination-in, destination-in, destination-in" as string,
          maskImage: [
            "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
            "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
            "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
            "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
          ].join(", "),
          maskComposite: "intersect, intersect, intersect",
        }}
      >
        <SpriteAnimator
          characterId={character.id}
          mood={mood}
          idleAnimation={character.idleAnimation}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

```bash
pnpm type-check
```

Expected: 에러 없음.

- [ ] **Step 3: 빌드 검사**

```bash
pnpm build
```

Expected: Build 성공.

- [ ] **Step 4: 커밋**

```bash
git add src/components/character/CharacterDisplay.tsx
git commit -m "feat: CharacterDisplay에 GlowBurstRing·CharacterAuraLayer 통합"
```

---

## Task 5: HeroSection에 MysticBackground 삽입

**Files:**
- Modify: `src/components/home/HeroSection.tsx`

- [ ] **Step 1: import 추가**

[src/components/home/HeroSection.tsx](src/components/home/HeroSection.tsx) 의 import 블록 끝에 추가:

```tsx
import { MysticBackground } from "@/components/effects/MysticBackground";
```

- [ ] **Step 2: JSX 삽입**

HeroSection.tsx 에서 `<ParticleOverlay density={particleDensity} className="z-10" />` 다음 줄에 삽입:

```tsx
      <MysticBackground service="home" />
```

변경 후 해당 블록:
```tsx
      <ParticleOverlay density={particleDensity} className="z-10" />
      <MysticBackground service="home" />

      <div className="flex-1 flex flex-col md:flex-row items-center z-20 px-4 md:px-8">
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/HeroSection.tsx
git commit -m "style: HeroSection에 MysticBackground 삽입"
```

---

## Task 6: 세션 페이지 3개에 MysticBackground 삽입

**Files:**
- Modify: `src/app/tarot/session/page.tsx`
- Modify: `src/app/saju/session/page.tsx`
- Modify: `src/app/shinjeom/session/page.tsx`

### 타로 세션 페이지

- [ ] **Step 1: import 추가 (tarot)**

[src/app/tarot/session/page.tsx](src/app/tarot/session/page.tsx) import 블록에 추가:

```tsx
import { MysticBackground } from "@/components/effects/MysticBackground";
```

- [ ] **Step 2: JSX 삽입 (tarot)**

tarot session page.tsx 의 `<ParticleOverlay` 블록 (378~383번째 줄 근방) 바로 다음에 삽입:

```tsx
      <MysticBackground service="tarot" />
```

변경 후:
```tsx
      <ParticleOverlay
        density={particleDensity}
        colorScheme={effectTheme ? { primary: effectTheme.primary, secondary: effectTheme.secondary, accent: effectTheme.accent } : undefined}
        particleStyle={effectTheme?.particleStyle}
        className="z-10"
      />
      <MysticBackground service="tarot" />
```

### 사주 세션 페이지

- [ ] **Step 3: import 추가 (saju)**

[src/app/saju/session/page.tsx](src/app/saju/session/page.tsx) import 블록에 추가:

```tsx
import { MysticBackground } from "@/components/effects/MysticBackground";
```

- [ ] **Step 4: JSX 삽입 (saju)**

saju session page.tsx 의 `<ParticleOverlay density={phase === "reading" ? "high" : "low"} className="z-10" />` 다음에 삽입:

```tsx
      <ParticleOverlay density={phase === "reading" ? "high" : "low"} className="z-10" />
      <MysticBackground service="saju" />
```

### 신점 세션 페이지

- [ ] **Step 5: import 추가 (shinjeom)**

[src/app/shinjeom/session/page.tsx](src/app/shinjeom/session/page.tsx) import 블록에 추가:

```tsx
import { MysticBackground } from "@/components/effects/MysticBackground";
```

- [ ] **Step 6: JSX 삽입 (shinjeom)**

shinjeom session page.tsx 의 `<ParticleOverlay density="low" className="z-10" />` 다음에 삽입:

```tsx
      <ParticleOverlay density="low" className="z-10" />
      <MysticBackground service="shinjeom" />
```

- [ ] **Step 7: 타입 검사**

```bash
pnpm type-check
```

Expected: 에러 없음.

- [ ] **Step 8: 커밋**

```bash
git add src/app/tarot/session/page.tsx src/app/saju/session/page.tsx src/app/shinjeom/session/page.tsx
git commit -m "style: 세션 페이지 3개에 MysticBackground 삽입 (타로·사주·신점)"
```

---

## Task 7: 전체 검증

- [ ] **Step 1: 전체 로컬 검증**

```bash
pnpm type-check && pnpm lint && pnpm test && pnpm build
```

Expected:
- type-check: 에러 없음
- lint: 경고/에러 없음
- test: 기존 672개 테스트 모두 PASS (신규 컴포넌트는 제외됨)
- build: 빌드 성공

- [ ] **Step 2: 개발 서버 실행 및 수동 시각 검증**

```bash
pnpm dev
```

브라우저에서 확인할 항목:
1. **홈 (/)**: 별자리 선 그려지는 연출 + 캐릭터 오라 호흡 + 하단 안개
2. **타로 세션 (/tarot → 캐릭터 선택 → 세션 시작)**: 별·점성술 룬 + idle glow
3. **사주 세션 (/saju → 세션 시작)**: 팔괘 룬 + 안개
4. **신점 세션 (/shinjeom → 세션 시작)**: ☯ 룬 + 강한 안개
5. **mood 전환**: idle→mystical 전환 시 글로우 버스트 링 폭발 + 파티클 burst 확인

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: Visual FX Revitalization 전체 구현 완료"
```

---

## 완료 기준 체크리스트

- [ ] `pnpm type-check` 에러 없음
- [ ] `pnpm lint` 경고/에러 없음
- [ ] `pnpm test` 672개 PASS (신규 비율 변동 없음)
- [ ] `pnpm build` 빌드 성공
- [ ] 홈·타로·사주·신점 세션 페이지에서 MysticBackground 시각 확인
- [ ] mood 전환 시 GlowBurstRing + CharacterAuraLayer burst 파티클 동작 확인
- [ ] SpriteAnimator idle drop-shadow 글로우 호흡 확인
