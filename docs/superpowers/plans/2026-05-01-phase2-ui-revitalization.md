# Phase 2 UI Revitalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터별 아이들 루프 애니메이션 3종 파일럿(arcana·hoshi·rei) + 서비스별 배경 분위기(타로·사주·신점) 구현

**Architecture:** `SpriteAnimator`에 `idleAnimation` prop 추가하여 캐릭터별 idle 모션을 선택, `CharacterDisplay`에서 `character.idleAnimation` 전달. 서비스 배경은 `ServiceBackground` 독립 컴포넌트로 분리하여 각 서비스 페이지에 삽입.

**Tech Stack:** TypeScript strict, Framer Motion v12, Next.js 16 App Router, Tailwind CSS v4

---

## File Map

| 상태 | 파일 | 역할 |
|---|---|---|
| Modify | `src/types/character.ts` | `IdleAnimationType` 유니온 타입 추가, `CharacterConfig.idleAnimation` 타입 강화 |
| Modify | `src/data/characters/index.ts` | arcana→"float-strong", hoshi→"bounce", rei→"breathe" (나머지→"float" 유지) |
| Modify | `src/components/character/SpriteAnimator.tsx` | `idleAnimation` prop, LOOP_MOTION/LOOP_TRANSITIONS 확장, 캐릭터별 루프 선택 |
| Modify | `src/components/character/CharacterDisplay.tsx` | `character.idleAnimation`을 SpriteAnimator에 전달 |
| Create | `src/components/effects/ServiceBackground.tsx` | 타로/사주/신점 서비스별 배경 컴포넌트 |
| Modify | `src/app/tarot/page.tsx` | ServiceBackground service="tarot" 삽입 |
| Modify | `src/app/saju/page.tsx` | ServiceBackground service="saju" 삽입 |
| Modify | `src/app/shinjeom/page.tsx` | ServiceBackground service="shinjeom" 삽입 |

---

### Task 1: `IdleAnimationType` 타입 + 캐릭터 데이터 업데이트

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/data/characters/index.ts`

- [ ] **Step 1: `character.ts`에 `IdleAnimationType` 추가**

`src/types/character.ts` 전체 교체:

```ts
export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";
export type Gender = "female" | "male";
export type GenderFilter = "female" | "male" | "all";
export type ParticleStyle = "sparkle" | "flame" | "petal" | "star" | "snowflake" | "lightning" | "bubble" | "rune";
export type IdleAnimationType = "float" | "float-strong" | "bounce" | "breathe";

export interface EffectTheme {
  primary: string;
  secondary: string;
  accent: string;
  particleStyle: ParticleStyle;
}

export interface CharacterConfig {
  id: string;
  name: string;
  nameJp: string;
  gender: Gender;
  greeting: string;
  expressions: Record<Mood, string>;
  idleAnimation: IdleAnimationType;
  personality: string;
  description: string;
  speciality: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
  effectTheme: EffectTheme;
}
```

- [ ] **Step 2: 캐릭터 데이터 3개 업데이트**

`src/data/characters/index.ts`에서:
- arcana (id: "arcana"): `idleAnimation: "float"` → `idleAnimation: "float-strong"`
- hoshi (id: "hoshi"): `idleAnimation: "float"` → `idleAnimation: "bounce"`
- rei (id: "rei"): `idleAnimation: "float"` → `idleAnimation: "breathe"`
- 나머지 9개 캐릭터: `idleAnimation: "float"` 유지

확인: `grep -n "idleAnimation" src/data/characters/index.ts` 실행 시 arcana·hoshi·rei만 다른 값이어야 함

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 0 errors (idleAnimation 타입이 string → IdleAnimationType으로 좁혀지면서 기존 "float" 값은 모두 유효)

- [ ] **Step 4: 커밋**

```bash
git add src/types/character.ts src/data/characters/index.ts
git commit -m "feat: IdleAnimationType 유니온 타입 + 캐릭터별 아이들 애니메이션 값 설정"
```

---

### Task 2: `SpriteAnimator` 퍼캐릭터 아이들 + `CharacterDisplay` 연결

**Files:**
- Modify: `src/components/character/SpriteAnimator.tsx`
- Modify: `src/components/character/CharacterDisplay.tsx`

- [ ] **Step 1: SpriteAnimator 전체 교체**

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mood, IdleAnimationType } from "@/types/character";

interface MoodConfig {
  loop: boolean;
  displayDuration: number;
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  default: { loop: true, displayDuration: 0 },
  smile: { loop: false, displayDuration: 2000 },
  serious: { loop: false, displayDuration: 2000 },
  surprised: { loop: false, displayDuration: 1500 },
  wink: { loop: false, displayDuration: 1500 },
  mystical: { loop: true, displayDuration: 0 },
};

const MOOD_TO_FILE: Record<Mood, string> = {
  default: "idle",
  smile: "smile",
  serious: "serious",
  surprised: "surprised",
  wink: "wink",
  mystical: "mystical",
};

const LOOP_MOTION: Record<string, Record<string, number[] | string[]>> = {
  // idle animation 타입별 (mood === "default"일 때 적용)
  float: {
    y: [0, -6, 0],
    scale: [1, 1.01, 1],
  },
  "float-strong": {
    y: [0, -8, 0],
    scale: [1, 1.015, 1],
  },
  bounce: {
    y: [0, -12, 0],
    scale: [1, 1.02, 1],
  },
  breathe: {
    y: [0, -2, 0, -1, 0],
    scale: [1, 1.005, 1, 1.003, 1],
    opacity: [1, 1, 1, 0.88, 1],
  },
  // mood 전용 (mystical)
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

const LOOP_TRANSITIONS: Record<string, { duration: number; repeat: number; ease: string }> = {
  float: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  "float-strong": { duration: 3, repeat: Infinity, ease: "easeInOut" },
  bounce: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  breathe: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  mystical: { duration: 4, repeat: Infinity, ease: "easeInOut" },
};

const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.95, 1.03, 1], y: [5, -3, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.9, 1.05, 1], y: [10, -5, 0] },
  wink: { scale: [0.95, 1.02, 1], y: [3, -2, 0] },
};

interface SpriteAnimatorProps {
  readonly characterId: string;
  readonly mood: Mood;
  readonly idleAnimation?: IdleAnimationType;
  readonly onAnimationEnd?: () => void;
  readonly className?: string;
}

export function SpriteAnimator({ characterId, mood, idleAnimation = "float", onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];
  const fileName = MOOD_TO_FILE[mood];
  const imageSrc = `/images/characters/${characterId}/nukki/${fileName}.png`;

  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;
    const timer = setTimeout(() => { onAnimationEnd(); }, config.displayDuration);
    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const activeLoopKey = mood === "default" ? idleAnimation : mood;
  const loopAnim = LOOP_MOTION[activeLoopKey] ?? LOOP_MOTION.float;
  const loopTransition = LOOP_TRANSITIONS[activeLoopKey] ?? LOOP_TRANSITIONS.float;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <div className={`relative ${className}`}>
    <AnimatePresence mode="sync">
      <motion.div
        key={`${characterId}-${mood}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        {!isLooping && enterAnim ? (
          <motion.div animate={enterAnim} transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full h-full">
            <Image src={imageSrc} alt="character" fill sizes="50vw"
              className="object-contain object-center" priority />
          </motion.div>
        ) : (
          <motion.div
            animate={loopAnim}
            transition={loopTransition}
            className="relative w-full h-full"
          >
            <Image src={imageSrc} alt="character" fill sizes="50vw"
              className="object-contain object-center" priority />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: CharacterDisplay에 idleAnimation 전달**

`src/components/character/CharacterDisplay.tsx`에서 `SpriteAnimator` 호출 부분:

```tsx
<SpriteAnimator
  characterId={character.id}
  mood={mood}
  idleAnimation={character.idleAnimation}
  onAnimationEnd={handleAnimationEnd}
  className="w-full h-full"
/>
```

(기존에 없던 `idleAnimation={character.idleAnimation}` 한 줄 추가)

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add src/components/character/SpriteAnimator.tsx src/components/character/CharacterDisplay.tsx
git commit -m "feat: SpriteAnimator 퍼캐릭터 idle 애니메이션 지원 (float-strong·bounce·breathe)"
```

---

### Task 3: `ServiceBackground` 컴포넌트 생성

**Files:**
- Create: `src/components/effects/ServiceBackground.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
"use client";

import { motion } from "framer-motion";

type ServiceType = "tarot" | "saju" | "shinjeom";

interface ServiceBackgroundProps {
  readonly service: ServiceType;
}

// 타로 별자리: 황금비 배치로 SSR 안전한 정적 배열 (Math.random 금지)
const STAR_POSITIONS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,
  y: (i * 97.317) % 100,
  size: 1 + (i % 3) * 0.5,
  duration: 2 + (i % 5),
  delay: (i % 7) * 0.4,
}));

// 신점 오방색 레이어 (청·적·황·흑·백)
const OBANGSAEK_LAYERS = [
  { color: "#1E3A8A", angle: 135, delay: 0 },
  { color: "#991B1B", angle: 225, delay: 1.2 },
  { color: "#92400E", angle: 315, delay: 2.4 },
  { color: "#1C1917", angle: 45, delay: 3.6 },
  { color: "#D1D5DB", angle: 180, delay: 4.8 },
];

function TarotBackground() {
  return (
    <>
      {/* 심층 인디고 기반 */}
      <div className="absolute inset-0" style={{ backgroundColor: "#0F0A2E" }} />
      {/* 중앙 방사형 그로우 */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(88,28,135,0.4) 0%, transparent 70%)" }}
      />
      {/* 별 파티클 */}
      {STAR_POSITIONS.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: star.duration, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
        />
      ))}
    </>
  );
}

function SajuBackground() {
  return (
    <>
      {/* 먹빛 기반 */}
      <div className="absolute inset-0" style={{ backgroundColor: "#1A1209" }} />
      {/* 琥珀 앰버 하단 그로우 — 호흡 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 90%, rgba(217,119,6,0.35) 0%, transparent 65%)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 상단 미묘한 그린 그라데이션 (사주 — 오행 목기) */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 40% 30% at 50% 10%, rgba(6,95,70,0.2) 0%, transparent 60%)" }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </>
  );
}

function ShinjeomBackground() {
  return (
    <>
      {/* 기저 다크 */}
      <div className="absolute inset-0" style={{ backgroundColor: "#120A18" }} />
      {/* 오방색 5레이어 순환 */}
      {OBANGSAEK_LAYERS.map((layer) => (
        <motion.div
          key={layer.color}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${layer.angle}deg, ${layer.color}28 0%, transparent 55%)`,
          }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: layer.delay }}
        />
      ))}
      {/* 중앙 영적 그로우 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 60%)" }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export function ServiceBackground({ service }: ServiceBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {service === "tarot" && <TarotBackground />}
      {service === "saju" && <SajuBackground />}
      {service === "shinjeom" && <ShinjeomBackground />}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 0 errors

- [ ] **Step 3: 커밋**

```bash
git add src/components/effects/ServiceBackground.tsx
git commit -m "feat: ServiceBackground 컴포넌트 — 타로(별자리)·사주(앰버)·신점(오방색) 배경"
```

---

### Task 4: 서비스 페이지 배경 연결

**Files:**
- Modify: `src/app/tarot/page.tsx`
- Modify: `src/app/saju/page.tsx`
- Modify: `src/app/shinjeom/page.tsx`

각 페이지에서:
1. `ServiceBackground` import 추가
2. 기존 `fixed inset-0 -z-10` 배경 div를 `<ServiceBackground service="..." />` 로 교체

- [ ] **Step 1: tarot/page.tsx 수정**

import 줄 추가 (기존 import 블록 마지막에):
```tsx
import { ServiceBackground } from "@/components/effects/ServiceBackground";
```

`TarotPageContent` return 내 배경 div 교체:
```tsx
// 기존 (제거):
// <div className="fixed inset-0 -z-10">
//   <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
//   <div className="absolute inset-0 bg-arcana-bg/50" />
//   <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)" }} />
// </div>

// 교체 후:
<ServiceBackground service="tarot" />
```

`tarot/page.tsx`에서 `Image` import가 배경 이미지 제거 후 더 이상 사용되지 않는지 확인. 다른 곳에서 `Image`를 사용하지 않는다면 import에서 제거.
(실제로는 `tarot/page.tsx`에 다른 Image 사용 없음 → import 제거)

- [ ] **Step 2: saju/page.tsx 수정**

```tsx
import { ServiceBackground } from "@/components/effects/ServiceBackground";
```

배경 div 교체:
```tsx
// 기존 (제거):
// <div className="fixed inset-0 -z-10">
//   <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
//   <div className="absolute inset-0 bg-arcana-bg/50" />
// </div>

// 교체 후:
<ServiceBackground service="saju" />
```

`saju/page.tsx`의 `Image` import 사용 여부 확인 후 미사용 시 제거.

- [ ] **Step 3: shinjeom/page.tsx 수정**

```tsx
import { ServiceBackground } from "@/components/effects/ServiceBackground";
```

배경 div 교체:
```tsx
// 기존 (제거):
// <div className="fixed inset-0 -z-10">
//   <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority  sizes="100vw" />
//   <div className="absolute inset-0 bg-arcana-bg/60" />
// </div>

// 교체 후:
<ServiceBackground service="shinjeom" />
```

`shinjeom/page.tsx`의 `Image` import 사용 여부 확인 후 미사용 시 제거.

- [ ] **Step 4: 타입 체크 + 린트 + 빌드**

```bash
pnpm type-check && pnpm lint && pnpm build
```

Expected: 0 errors, 0 lint warnings

- [ ] **Step 5: 커밋**

```bash
git add src/app/tarot/page.tsx src/app/saju/page.tsx src/app/shinjeom/page.tsx
git commit -m "style: 서비스별 배경 분위기 적용 — tarot/saju/shinjeom"
```

---

## 자기 검토 (Self-Review)

### Spec 커버리지
- [x] arcana float-strong (y -8px, 3s) → Task 1+2
- [x] hoshi bounce (y -12px, 1.5s) → Task 1+2
- [x] rei breathe (near-still + opacity dip) → Task 1+2
- [x] 타로 배경: 심층 인디고 + 별 파티클 → Task 3
- [x] 사주 배경: 먹빛 + 앰버 글로우 → Task 3
- [x] 신점 배경: 오방색 사이클 그라데이션 → Task 3

### Placeholder 스캔
- 없음

### 타입 일관성
- `IdleAnimationType` Task 1에서 정의 → Task 2 `SpriteAnimator` props에서 사용 ✓
- `ServiceType` Task 3에서 정의 → Task 4 페이지에서 사용 ✓
- `character.idleAnimation` Task 1에서 `IdleAnimationType`으로 강화 → Task 2 `CharacterDisplay`에서 전달 ✓
