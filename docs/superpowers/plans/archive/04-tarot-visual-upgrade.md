> **Status**: 구현 완료 (방식 변경)
> **Note**: 작성 시점(2026-03-29) 기준 구현 계획. 실제 구현과 다른 주요 항목:
> - **SpriteAnimator 방식 교체**: 이 플랜의 스프라이트 시트(CSS background-position) 방식은 미채택
>   → 실제로는 02번 플랜의 **단일 누끼 이미지 + Framer Motion** 방식으로 구현
> - CharacterDisplay props: `characterId` prop이 실제로 SpriteAnimator에 전달됨
>
> **⚠️ 이 문서는 개발 히스토리 기록입니다.** 현재 구현 상태는 `CLAUDE.md`를 참조하세요.

# 타로 상담 페이지 비주얼 대개선 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 상담 세션 페이지를 비주얼 노벨 스타일 레이아웃으로 전면 개편하고, 캐릭터 스프라이트 애니메이션 + 미니멀 라인아트 카드 디자인을 적용한다.

**Architecture:** 세션 페이지를 상단 무대(캐릭터+카드) + 하단 대화창의 2영역 VN 레이아웃으로 교체. 캐릭터는 스프라이트 시트 기반 프레임 애니메이션, 카드는 SVG 라인아트 인라인 렌더링. 기존 Zustand 상태 구조와 Framer Motion 애니메이션 인프라를 그대로 활용.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Framer Motion 12, Tailwind CSS v4, Zustand 5

---

## 파일 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/character/SpriteAnimator.tsx` | 스프라이트 시트 프레임 재생기 컴포넌트 |
| `src/components/card/CardFace.tsx` | SVG 라인아트 카드 앞면 렌더링 |
| `src/components/card/CardBack.tsx` | 기하학 만다라 카드 뒷면 렌더링 |
| `src/components/chat/DialogueBox.tsx` | VN 스타일 대화창 (이름태그+대사+진행표시) |
| `src/components/effects/ParticleOverlay.tsx` | 떠다니는 빛 입자 효과 |
| `src/data/cards/symbols.ts` | 메이저 아르카나 22장 SVG path 데이터 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/tarot/session/page.tsx` | VN 레이아웃으로 전면 교체 |
| `src/components/character/CharacterDisplay.tsx` | SpriteAnimator 통합 |
| `src/components/card/CardItem.tsx` | CardFace/CardBack 통합 + 글로우 효과 |
| `src/components/card/CardDeck.tsx` | 호버/선택 인터랙션 개선 |
| `src/components/card/CardSpread.tsx` | spring 물리 + 플래시 이펙트 |
| `src/app/globals.css` | 스프라이트/파티클/VN keyframes 추가 |
| `src/app/layout.tsx` | 세리프 폰트 추가 (Noto Serif KR) |

---

## Task 1: 세리프 폰트 추가 및 글로벌 CSS 확장

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: layout.tsx에 Noto Serif KR 폰트 추가**

```tsx
// src/app/layout.tsx — import 추가
import { Noto_Sans_KR, Gothic_A1, Noto_Serif_KR } from "next/font/google";

// 기존 폰트 아래에 추가
const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

// html className에 추가
<html lang="ko" className={`dark ${notoSansKr.variable} ${gothicA1.variable} ${notoSerifKr.variable}`}>
```

- [ ] **Step 2: globals.css에 세리프 폰트 변수 및 신규 keyframes 추가**

```css
/* globals.css @theme 블록 내부에 추가 */

  /* Serif font */
  --font-serif: var(--font-noto-serif-kr), serif;

  /* Sprite animation */
  --animate-sprite-idle: sprite-idle 1.2s steps(6) infinite;
  --animate-sprite-talking: sprite-talking 0.8s steps(6) infinite;
  --animate-sprite-happy: sprite-happy 0.8s steps(4) forwards;
  --animate-sprite-serious: sprite-serious 0.8s steps(4) forwards;
  --animate-sprite-mystical: sprite-mystical 1.6s steps(8) infinite;
  --animate-sprite-surprised: sprite-surprised 0.6s steps(4) forwards;

  /* Particle */
  --animate-particle-float: particle-float 6s ease-in-out infinite;
  --animate-particle-glow: particle-glow 4s ease-in-out infinite alternate;

  /* VN dialogue */
  --animate-dialogue-arrow: dialogue-arrow 1s ease-in-out infinite;
  --animate-typing-dot: typing-dot 1.4s ease-in-out infinite;

  /* Card flash */
  --animate-card-flash: card-flash 0.6s ease-out forwards;

  @keyframes particle-float {
    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
    25% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
    50% { transform: translateY(-60px) translateX(-5px); opacity: 0.6; }
    75% { transform: translateY(-40px) translateX(15px); opacity: 0.3; }
  }

  @keyframes particle-glow {
    0% { box-shadow: 0 0 2px rgba(212, 175, 55, 0.3); }
    100% { box-shadow: 0 0 8px rgba(212, 175, 55, 0.8); }
  }

  @keyframes dialogue-arrow {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(4px); opacity: 0.5; }
  }

  @keyframes typing-dot {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }

  @keyframes card-flash {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
    100% { opacity: 0; transform: scale(1.2); }
  }
```

- [ ] **Step 3: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: 세리프 폰트 추가 및 스프라이트/파티클/VN keyframes 확장"
```

---

## Task 2: SpriteAnimator 컴포넌트 생성

**Files:**
- Create: `src/components/character/SpriteAnimator.tsx`

- [ ] **Step 1: SpriteAnimator 컴포넌트 작성**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

interface SpriteConfig {
  src: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  duration: number; // ms per full cycle
  loop: boolean;
}

const SPRITE_CONFIGS: Record<Mood, SpriteConfig> = {
  default: { src: "/images/characters/arcana/sprites/idle.png", frameCount: 6, frameWidth: 512, frameHeight: 768, duration: 1200, loop: true },
  smile: { src: "/images/characters/arcana/sprites/happy.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  serious: { src: "/images/characters/arcana/sprites/serious.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  surprised: { src: "/images/characters/arcana/sprites/surprised.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 600, loop: false },
  wink: { src: "/images/characters/arcana/sprites/happy.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  mystical: { src: "/images/characters/arcana/sprites/mystical.png", frameCount: 8, frameWidth: 512, frameHeight: 768, duration: 1600, loop: true },
};

interface SpriteAnimatorProps {
  mood: Mood;
  onAnimationEnd?: () => void;
  className?: string;
}

export function SpriteAnimator({ mood, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);

  const config = SPRITE_CONFIGS[mood];

  useEffect(() => {
    frameRef.current = 0;
    lastTimeRef.current = 0;

    const frameDuration = config.duration / config.frameCount;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        frameRef.current++;
        lastTimeRef.current = timestamp;

        if (frameRef.current >= config.frameCount) {
          if (config.loop) {
            frameRef.current = 0;
          } else {
            frameRef.current = config.frameCount - 1;
            onAnimationEnd?.();
            return;
          }
        }

        if (containerRef.current) {
          const offsetX = -(frameRef.current * config.frameWidth);
          containerRef.current.style.backgroundPosition = `${offsetX}px 0`;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mood, config, onAnimationEnd]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          ref={containerRef}
          className={`${className}`}
          style={{
            width: config.frameWidth,
            height: config.frameHeight,
            backgroundImage: `url(${config.src})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 0",
            backgroundSize: `${config.frameWidth * config.frameCount}px ${config.frameHeight}px`,
            imageRendering: "auto",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/SpriteAnimator.tsx
git commit -m "feat: SpriteAnimator 컴포넌트 — 스프라이트 시트 프레임 애니메이션 재생기"
```

---

## Task 3: CharacterDisplay를 SpriteAnimator로 교체

**Files:**
- Modify: `src/components/character/CharacterDisplay.tsx`

- [ ] **Step 1: CharacterDisplay 전면 교체**

```tsx
"use client";

import { useCallback } from "react";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  className?: string;
}

export function CharacterDisplay({ character, mood, className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();

  const handleAnimationEnd = useCallback(() => {
    // 1회 재생 동작 완료 후 idle로 복귀
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  return (
    <div className={`relative flex items-end justify-start ${className}`}>
      {/* 캐릭터 글로우 배경 */}
      <div className="absolute bottom-0 left-1/4 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />

      {/* 스프라이트 캐릭터 */}
      <div className="relative z-10 max-w-[280px] max-h-[420px] overflow-hidden">
        <SpriteAnimator
          mood={mood}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full scale-100 origin-bottom"
        />
      </div>

      {/* 캐릭터 이름 (무대 위 표시) */}
      <div className="absolute bottom-2 left-2 z-20">
        <span className="text-arcana-purple font-serif font-bold text-sm drop-shadow-lg">
          {character.name}
        </span>
        <span className="text-arcana-muted text-xs ml-1">{character.nameJp}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/character/CharacterDisplay.tsx
git commit -m "feat: CharacterDisplay를 SpriteAnimator 기반으로 교체"
```

---

## Task 4: CardBack 컴포넌트 — 기하학 만다라

**Files:**
- Create: `src/components/card/CardBack.tsx`

- [ ] **Step 1: CardBack 컴포넌트 작성**

```tsx
"use client";

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeDimensions = {
  sm: { w: 64, h: 96 },
  md: { w: 96, h: 144 },
  lg: { w: 128, h: 192 },
};

export function CardBack({ size = "md", className = "" }: CardBackProps) {
  const { w, h } = sizeDimensions[size];
  const cx = w / 2;
  const cy = h / 2;
  const r1 = Math.min(w, h) * 0.3;
  const r2 = r1 * 0.65;
  const r3 = r1 * 0.35;
  const starSize = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const cornerStarSize = size === "sm" ? 4 : size === "md" ? 5 : 6;
  const inset = size === "sm" ? 4 : size === "md" ? 6 : 8;

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
        <defs>
          <linearGradient id="cardBackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0a3e" />
            <stop offset="50%" stopColor="#0f0520" />
            <stop offset="100%" stopColor="#1a0a3e" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={w} height={h} fill="url(#cardBackGrad)" />

        {/* 외곽 보더 */}
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="6" fill="none" stroke="#d4af37" strokeWidth="1.5" />

        {/* 내부 보더 */}
        <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} rx="4" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />

        {/* 동심원 3겹 */}
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="0.75" />
        <circle cx={cx} cy={cy} r={r3} fill="rgba(139,92,246,0.15)" stroke="rgba(212,175,55,0.4)" strokeWidth="0.5" />

        {/* 십자 라인 */}
        <line x1={cx} y1={cy - r1} x2={cx} y2={cy + r1} stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
        <line x1={cx - r1} y1={cy} x2={cx + r1} y2={cy} stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />

        {/* 대각선 라인 */}
        <line x1={cx - r1 * 0.707} y1={cy - r1 * 0.707} x2={cx + r1 * 0.707} y2={cy + r1 * 0.707} stroke="rgba(139,92,246,0.25)" strokeWidth="0.5" />
        <line x1={cx + r1 * 0.707} y1={cy - r1 * 0.707} x2={cx - r1 * 0.707} y2={cy + r1 * 0.707} stroke="rgba(139,92,246,0.25)" strokeWidth="0.5" />

        {/* 중앙 별 */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize={starSize}>✦</text>

        {/* 4 모서리 별 */}
        <text x={inset + 4} y={inset + 8} fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={w - inset - 4} y={inset + 8} textAnchor="end" fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={inset + 4} y={h - inset - 4} fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={w - inset - 4} y={h - inset - 4} textAnchor="end" fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardBack.tsx
git commit -m "feat: CardBack 컴포넌트 — 기하학 만다라 SVG 뒷면"
```

---

## Task 5: 메이저 아르카나 SVG 심볼 데이터

**Files:**
- Create: `src/data/cards/symbols.ts`

- [ ] **Step 1: 22장 메이저 아르카나 SVG path 데이터 작성**

```ts
// 각 심볼은 viewBox="0 0 48 48" 기준의 SVG path
export interface CardSymbol {
  id: string;
  paths: string[];     // SVG path d 속성 배열
  strokeWidth?: number; // 기본 1.5
}

export const majorSymbols: Record<string, CardSymbol> = {
  "major-00": { // The Fool — 별 + 절벽
    paths: [
      "M24 6 L26.5 18 L38 20.5 L28 25 L30.5 37 L24 28.5 L17.5 37 L20 25 L10 20.5 L21.5 18 Z", // 8각 별
      "M6 42 Q14 36 24 40 Q34 36 42 42", // 절벽 라인
    ],
  },
  "major-01": { // The Magician — 무한대 + 지팡이
    paths: [
      "M14 16 C14 10 24 10 24 16 C24 22 34 22 34 16 C34 10 24 10 24 16 C24 22 14 22 14 16", // ∞
      "M24 22 L24 40", // 지팡이
      "M20 40 L28 40", // 테이블
    ],
  },
  "major-02": { // High Priestess — 초승달 + 기둥
    paths: [
      "M24 10 A10 10 0 0 1 24 30 A6 6 0 0 0 24 10", // 초승달
      "M12 14 L12 38", // 좌측 기둥
      "M36 14 L36 38", // 우측 기둥
    ],
  },
  "major-03": { // The Empress — 비너스 심볼
    paths: [
      "M24 8 A10 10 0 1 0 24 28 A10 10 0 1 0 24 8", // 원
      "M24 28 L24 42", // 세로선
      "M18 36 L30 36", // 가로선
    ],
  },
  "major-04": { // The Emperor — 앙크 + 왕좌
    paths: [
      "M24 8 A6 6 0 1 0 24 20 A6 6 0 1 0 24 8", // 원
      "M24 20 L24 38", // 세로선
      "M18 28 L30 28", // 가로선
      "M14 38 L34 38", // 왕좌 베이스
    ],
  },
  "major-05": { // The Hierophant — 삼중 십자가
    paths: [
      "M24 6 L24 42", // 세로
      "M18 14 L30 14", // 상단 가로
      "M16 24 L32 24", // 중간 가로
      "M18 34 L30 34", // 하단 가로
    ],
  },
  "major-06": { // The Lovers — 하트 + 화살
    paths: [
      "M24 16 C16 6 4 14 24 30 C44 14 32 6 24 16", // 하트
      "M24 4 L24 14", // 화살 상단
      "M20 8 L24 4 L28 8", // 화살촉
    ],
  },
  "major-07": { // The Chariot — 전차 바퀴
    paths: [
      "M12 28 A8 8 0 1 0 12 28.01", // 좌측 바퀴
      "M36 28 A8 8 0 1 0 36 28.01", // 우측 바퀴
      "M12 20 L24 8 L36 20", // 지붕
      "M12 20 L36 20", // 지붕 하단
    ],
  },
  "major-08": { // Strength — 무한대 + 사자
    paths: [
      "M16 12 C16 8 24 8 24 12 C24 16 32 16 32 12 C32 8 24 8 24 12 C24 16 16 16 16 12", // ∞
      "M16 24 C10 24 8 32 14 38 C18 42 30 42 34 38 C40 32 38 24 32 24 C28 24 24 28 24 32", // 사자 실루엣
    ],
  },
  "major-09": { // The Hermit — 랜턴 + 지팡이
    paths: [
      "M24 6 L20 14 L28 14 Z", // 랜턴 삼각
      "M24 14 L24 42", // 지팡이
      "M22 10 L26 10", // 랜턴 빛
    ],
    strokeWidth: 1.5,
  },
  "major-10": { // Wheel of Fortune — 바퀴
    paths: [
      "M24 6 A18 18 0 1 0 24 42 A18 18 0 1 0 24 6", // 외곽 원
      "M24 12 A12 12 0 1 0 24 36 A12 12 0 1 0 24 12", // 내부 원
      "M24 6 L24 42", "M6 24 L42 24", // 십자
    ],
  },
  "major-11": { // Justice — 천칭
    paths: [
      "M24 6 L24 36", // 중앙 기둥
      "M8 16 L40 16", // 가로 막대
      "M8 16 L4 28 L12 28 Z", // 좌측 접시
      "M40 16 L36 28 L44 28 Z", // 우측 접시
      "M18 36 L30 36", // 베이스
    ],
  },
  "major-12": { // The Hanged Man — 거꾸로 매달린 사람
    paths: [
      "M16 6 L32 6", // 상단 가로
      "M24 6 L24 16", // 매달린 줄
      "M24 16 A5 5 0 1 0 24 26", // 머리
      "M24 26 L24 36", // 몸
      "M24 30 L18 34", "M24 30 L30 34", // 팔
      "M24 36 L20 42", "M24 36 L28 42", // 다리
    ],
    strokeWidth: 1.2,
  },
  "major-13": { // Death — 해골 + 낫
    paths: [
      "M24 10 A6 6 0 1 0 24 22 A6 6 0 1 0 24 10", // 해골 원
      "M20 14 L20 14.01", "M28 14 L28 14.01", // 눈
      "M20 18 Q24 22 28 18", // 입
      "M10 8 Q8 24 24 32 L24 42", // 낫
    ],
  },
  "major-14": { // Temperance — 삼각형 + 물 흐름
    paths: [
      "M24 8 L38 36 L10 36 Z", // 삼각형
      "M18 24 Q24 20 30 24", // 물 흐름
      "M16 30 Q24 26 32 30", // 물 흐름 2
    ],
  },
  "major-15": { // The Devil — 역오각별
    paths: [
      "M24 38 L14 12 L40 28 L8 28 L34 12 Z", // 역오각별
    ],
  },
  "major-16": { // The Tower — 탑 + 번개
    paths: [
      "M18 42 L18 14 L24 8 L30 14 L30 42", // 탑
      "M24 8 L20 2", // 탑 꼭대기
      "M36 6 L28 16 L34 16 L26 26", // 번개
    ],
  },
  "major-17": { // The Star — 8각 별
    paths: [
      "M24 4 L26 18 L40 14 L30 22 L40 34 L26 28 L24 44 L22 28 L8 34 L18 22 L8 14 L22 18 Z", // 8각 별
    ],
  },
  "major-18": { // The Moon — 달 + 물
    paths: [
      "M24 6 A12 12 0 0 1 24 30 A8 8 0 0 0 24 6", // 초승달
      "M4 38 Q12 32 20 38 Q28 32 36 38 Q44 32 48 38", // 물결
    ],
  },
  "major-19": { // The Sun — 태양
    paths: [
      "M24 14 A10 10 0 1 0 24 34 A10 10 0 1 0 24 14", // 태양 원
      "M24 2 L24 10", "M24 38 L24 46", // 상하 광선
      "M12 24 L4 24", "M44 24 L36 24", // 좌우 광선
      "M15 15 L10 10", "M33 15 L38 10", // 대각선 광선
      "M15 33 L10 38", "M33 33 L38 38",
    ],
    strokeWidth: 1.5,
  },
  "major-20": { // Judgement — 트럼펫
    paths: [
      "M24 6 L24 20", // 트럼펫 상단
      "M18 20 L30 20 L34 36 L14 36 Z", // 트럼펫 벨
      "M20 36 L20 42", "M28 36 L28 42", // 하단 기둥
    ],
  },
  "major-21": { // The World — 월계관 + 원
    paths: [
      "M24 4 A20 20 0 1 0 24 44 A20 20 0 1 0 24 4", // 외곽 원
      "M24 10 A14 14 0 1 0 24 38 A14 14 0 1 0 24 10", // 내부 원
      "M24 18 L24 30", // 중앙 인물
      "M20 22 L28 22", // 팔
    ],
  },
};

// 마이너 아르카나 수트 심볼
export const suitSymbols: Record<string, CardSymbol> = {
  wands: {
    paths: [
      "M24 6 L24 42", // 지팡이
      "M20 12 Q24 8 28 12", // 상단 잎
      "M18 18 Q24 14 30 18", // 중단 잎
    ],
  },
  cups: {
    paths: [
      "M14 12 Q14 30 24 34 Q34 30 34 12", // 컵 본체
      "M14 12 L34 12", // 컵 상단
      "M20 34 L28 34", // 컵 하단
      "M24 34 L24 40", // 줄기
      "M18 40 L30 40", // 베이스
    ],
  },
  swords: {
    paths: [
      "M24 4 L24 40", // 칼날
      "M18 14 L30 14", // 가드
      "M22 14 L22 20 L26 20 L26 14", // 핸들
    ],
  },
  pentacles: {
    paths: [
      "M24 4 A20 20 0 1 0 24 44 A20 20 0 1 0 24 4", // 외곽 원
      "M24 8 L28 20 L38 20 L30 28 L33 40 L24 32 L15 40 L18 28 L10 20 L20 20 Z", // 오각별
    ],
  },
};
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/data/cards/symbols.ts
git commit -m "feat: 메이저 아르카나 22장 + 마이너 수트 4종 SVG 심볼 데이터"
```

---

## Task 6: CardFace 컴포넌트 — SVG 라인아트 앞면

**Files:**
- Create: `src/components/card/CardFace.tsx`

- [ ] **Step 1: CardFace 컴포넌트 작성**

```tsx
"use client";

import { TarotCard } from "@/types/card";
import { majorSymbols, suitSymbols } from "@/data/cards/symbols";

interface CardFaceProps {
  card: TarotCard;
  isReversed: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeDimensions = {
  sm: { w: 64, h: 96 },
  md: { w: 96, h: 144 },
  lg: { w: 128, h: 192 },
};

export function CardFace({ card, isReversed, size = "md", className = "" }: CardFaceProps) {
  const { w, h } = sizeDimensions[size];
  const symbol = card.type === "major"
    ? majorSymbols[card.id]
    : card.suit ? suitSymbols[card.suit] : null;

  const fontSize = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const titleSize = size === "sm" ? 5 : size === "md" ? 7 : 9;
  const numberSize = size === "sm" ? 7 : size === "md" ? 10 : 12;

  // 심볼 영역: 중앙에 원형 프레임
  const cx = w / 2;
  const cy = h * 0.42;
  const symbolRadius = Math.min(w, h) * 0.22;

  // 로마 숫자 변환
  const romanNumerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  const numeral = card.type === "major" ? romanNumerals[card.number] : `${card.number}`;

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${isReversed ? "rotate-180" : ""} ${className}`}
      style={{ width: w, height: h }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
        <defs>
          <linearGradient id={`cardFaceGrad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="50%" stopColor="#1a0a3e" />
            <stop offset="100%" stopColor="#0a0a1a" />
          </linearGradient>
          <linearGradient id={`borderGrad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={w} height={h} fill={`url(#cardFaceGrad-${card.id})`} />

        {/* 그라디언트 보더 */}
        <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="6" fill="none"
          stroke={`url(#borderGrad-${card.id})`} strokeWidth="1.5" />

        {/* 상단: 로마 숫자 */}
        <text x={cx} y={h * 0.1} textAnchor="middle" dominantBaseline="central"
          fill="#d4af37" fontSize={numberSize} fontFamily="serif" fontWeight="bold">
          {numeral}
        </text>

        {/* 원형 프레임 */}
        <circle cx={cx} cy={cy} r={symbolRadius} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.75" />

        {/* 방사형 미세 라인 (8방향) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + (symbolRadius + 2) * Math.cos(rad);
          const y1 = cy + (symbolRadius + 2) * Math.sin(rad);
          const x2 = cx + (symbolRadius + 6) * Math.cos(rad);
          const y2 = cy + (symbolRadius + 6) * Math.sin(rad);
          return (
            <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
          );
        })}

        {/* 심볼 */}
        {symbol && (
          <g transform={`translate(${cx - 24}, ${cy - 24}) scale(${symbolRadius / 24})`}>
            {symbol.paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#d4af37" strokeWidth={symbol.strokeWidth ?? 1.5}
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
        )}

        {/* 하단: 카드명 영문 */}
        <text x={cx} y={h * 0.82} textAnchor="middle" dominantBaseline="central"
          fill="#e2e8f0" fontSize={fontSize} fontFamily="serif" letterSpacing="1">
          {card.name.toUpperCase()}
        </text>

        {/* 최하단: 카드명 한글 */}
        <text x={cx} y={h * 0.92} textAnchor="middle" dominantBaseline="central"
          fill="#94a3b8" fontSize={fontSize - 2}>
          {card.nameKo}
        </text>
      </svg>

      {/* 역방향 표시 */}
      {isReversed && (
        <span className="absolute top-1 right-1 text-[8px] text-red-400 bg-red-900/40 px-1 rounded rotate-180">
          역
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardFace.tsx
git commit -m "feat: CardFace 컴포넌트 — SVG 라인아트 카드 앞면 렌더링"
```

---

## Task 7: CardItem 리팩토링 — CardFace/CardBack 통합

**Files:**
- Modify: `src/components/card/CardItem.tsx`

- [ ] **Step 1: CardItem을 새 컴포넌트 기반으로 교체**

```tsx
"use client";

import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardFace } from "./CardFace";
import { CardBack } from "./CardBack";

interface CardItemProps {
  card: TarotCard;
  isFlipped: boolean;
  isSelected: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = { sm: "w-16 h-24", md: "w-24 h-36", lg: "w-32 h-48" };

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", className = "" }: CardItemProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${sizeClasses[size]} ${className}`}
      style={{ perspective: "1000px" }}
    >
      {/* 호버 글로우 */}
      {!isFlipped && (
        <motion.div
          className="absolute -inset-1 rounded-xl opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          style={{
            background: "radial-gradient(ellipse, rgba(212,175,55,0.15), transparent 70%)",
            boxShadow: "0 0 20px rgba(212,175,55,0.2)",
          }}
        />
      )}

      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative"
      >
        {/* 카드 뒷면 */}
        <div
          className={`absolute inset-0 ${isSelected ? "ring-2 ring-arcana-gold shadow-lg shadow-arcana-gold/20" : ""}`}
          style={{ backfaceVisibility: "hidden", borderRadius: "0.5rem" }}
        >
          <CardBack size={size} className="w-full h-full" />
        </div>

        {/* 카드 앞면 */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "0.5rem" }}
        >
          <CardFace card={card} isReversed={isReversed} size={size} className="w-full h-full" />
        </div>
      </motion.div>

      {/* 뒤집기 플래시 이펙트 */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.4), transparent 70%)" }}
        />
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardItem.tsx
git commit -m "feat: CardItem — CardFace/CardBack 통합 + 글로우/플래시 이펙트"
```

---

## Task 8: ParticleOverlay 이펙트 컴포넌트

**Files:**
- Create: `src/components/effects/ParticleOverlay.tsx`

- [ ] **Step 1: ParticleOverlay 컴포넌트 작성**

```tsx
"use client";

import { useMemo } from "react";

interface ParticleOverlayProps {
  density?: "low" | "medium" | "high";
  className?: string;
}

interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
}

const DENSITY_COUNT = { low: 12, medium: 20, high: 32 };

const COLORS = [
  "rgba(212, 175, 55, 0.5)",    // gold
  "rgba(139, 92, 246, 0.4)",    // purple
  "rgba(255, 255, 255, 0.3)",   // white
  "rgba(99, 102, 241, 0.3)",    // indigo
];

export function ParticleOverlay({ density = "medium", className = "" }: ParticleOverlayProps) {
  const particles = useMemo<Particle[]>(() => {
    const count = DENSITY_COUNT[density];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 3,
      delay: `${Math.random() * 6}s`,
      duration: `${4 + Math.random() * 4}s`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }, [density]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-[particle-float_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            "--delay": p.delay,
            "--dur": p.duration,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/effects/ParticleOverlay.tsx
git commit -m "feat: ParticleOverlay — 떠다니는 빛 입자 이펙트 컴포넌트"
```

---

## Task 9: DialogueBox — VN 스타일 대화창

**Files:**
- Create: `src/components/chat/DialogueBox.tsx`

- [ ] **Step 1: DialogueBox 컴포넌트 작성**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types/session";

interface DialogueBoxProps {
  messages: ChatMessage[];
  characterName?: string;
  isTyping?: boolean;
  className?: string;
}

export function DialogueBox({ messages, characterName = "아르카나", isTyping = false, className = "" }: DialogueBoxProps) {
  const lastMessage = messages.filter((m) => m.role === "character").at(-1);
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const prevContentRef = useRef("");

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.content === prevContentRef.current) return;
    prevContentRef.current = lastMessage.content;
    setDisplayedText("");
    setIsComplete(false);

    let index = 0;
    const interval = setInterval(() => {
      if (index < lastMessage.content.length) {
        setDisplayedText(lastMessage.content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [lastMessage]);

  return (
    <div className={`relative ${className}`}>
      {/* 글래스모피즘 배경 */}
      <div className="absolute inset-0 bg-arcana-card/85 backdrop-blur-md border-t-2 border-arcana-purple/60 rounded-t-xl" />

      <div className="relative z-10 p-4 md:p-5">
        {/* 캐릭터 이름 태그 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="px-3 py-0.5 bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full">
            <span className="text-white text-xs font-serif font-bold">{characterName}</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-arcana-purple/40 to-transparent" />
        </div>

        {/* 대사 텍스트 */}
        <div className="min-h-[3.5rem] md:min-h-[4rem]">
          <AnimatePresence mode="wait">
            {isTyping ? (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 py-2"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-arcana-purple"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            ) : lastMessage ? (
              <motion.p
                key={lastMessage.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-arcana-text text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans"
              >
                {displayedText}
                {/* 타이핑 커서 */}
                {!isComplete && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-arcana-purple font-bold"
                  >
                    |
                  </motion.span>
                )}
              </motion.p>
            ) : (
              <p className="text-arcana-muted text-sm italic">카드를 선택하면 상담이 시작됩니다...</p>
            )}
          </AnimatePresence>
        </div>

        {/* 대사 완료 표시 (▼ 깜빡임) */}
        {isComplete && lastMessage && (
          <div className="flex justify-end mt-1">
            <motion.span
              animate={{ y: [0, 4, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-arcana-purple text-xs"
            >
              ▼
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/chat/DialogueBox.tsx
git commit -m "feat: DialogueBox — VN 스타일 대화창 (이름태그+타이핑+진행표시)"
```

---

## Task 10: 세션 페이지 전면 개편 — VN 레이아웃

**Files:**
- Modify: `src/app/tarot/session/page.tsx`

- [ ] **Step 1: session/page.tsx 전체 교체**

```tsx
"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CardDeck } from "@/components/card/CardDeck";
import { CardSpread } from "@/components/card/CardSpread";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharacterByService } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getSpreadForTopic } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";

const deckManager = new DeckManager();

export default function TarotSessionPage() {
  const router = useRouter();
  const character = getCharacterByService("tarot")!;
  const { currentMood, setMood, isTyping } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, requiredCards, selectedCards, chatMessages, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage, appendToLastMessage, setReadingResult, setLoading,
  } = useSessionStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  useEffect(() => {
    if (!topic) { router.push("/tarot"); return; }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    fetch("/api/tarot/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then((res) => res.json()).then((data) => { if (data.session) setSessionId(data.session.id); });

    setMood("smile");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: character.greeting, mood: "smile", timestamp: new Date() });

    setTimeout(() => {
      setAnimationPhase("spreading");
      setPhase("card-select");
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: `${requiredCards}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요`,
        mood: "mystical", timestamp: new Date(),
      });
      setMood("mystical");
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleCardSelect = useCallback((index: number) => {
    if (selectedCards.length >= requiredCards) return;
    const card = shuffledDeck[index];
    const isReversed = Math.random() > 0.5;
    const position = selectedCards.length;
    const selected: SelectedCard = { card, position, isReversed, selectedAt: new Date() };
    selectCard(selected);
    setSelectedIndices((prev) => [...prev, index]);
    setRevealedPositions((prev) => [...prev, position]);
    setMood("surprised");
    setTimeout(() => setMood("default"), 1000);
    if (selectedCards.length + 1 >= requiredCards) {
      const allSelected = [...selectedCards, selected];
      setTimeout(() => startReading(allSelected), 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, selectedCards, requiredCards]);

  const startReading = async (cards: SelectedCard[]) => {
    setPhase("reading"); setLoading(true); setMood("mystical");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요", mood: "mystical", timestamp: new Date() });
    const sessionId = useSessionStore.getState().sessionId;
    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })) }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const loadingMsgId = crypto.randomUUID();
      addChatMessage({ id: loadingMsgId, role: "character", content: "카드를 읽고 있어요...", mood: "mystical", timestamp: new Date() });

      let fullJson = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) fullJson += data.chunk;
            if (data.done && data.result) {
              setReadingResult(data.result);
              const currentSpread = topic ? getSpreadForTopic(topic) : null;
              if (data.result.cardInterpretations) {
                for (const interp of data.result.cardInterpretations) {
                  const card = cards.find(c => c.card.id === interp.cardId);
                  const posLabel = currentSpread?.positions[interp.position]?.labelKo || `위치 ${interp.position + 1}`;
                  addChatMessage({
                    id: crypto.randomUUID(), role: "character",
                    content: `[${posLabel}] ${card?.card.nameKo || ""}\n\n${interp.interpretation}`,
                    mood: "serious", timestamp: new Date(),
                  });
                }
              }
              if (data.result.overallReading) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `종합 해석\n\n${data.result.overallReading}`,
                  mood: "mystical", timestamp: new Date(),
                });
              }
              if (data.result.advice) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `조언\n\n${data.result.advice}`,
                  mood: "smile", timestamp: new Date(),
                });
              }
              setPhase("result"); setMood("smile");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드의 메시지를 읽는 데 문제가 생겼어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
      setMood("surprised");
    }
    setLoading(false);
  };

  const spread = topic ? getSpreadForTopic(topic) : null;
  const particleDensity = phase === "reading" || phase === "result" ? "high" : "medium";

  return (
    <div className="relative h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        {/* 비네팅 */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      {/* 파티클 오버레이 */}
      <ParticleOverlay density={particleDensity} className="z-10" />

      {/* === 상단 무대 (70~75%) === */}
      <div className="relative flex-1 min-h-0 flex items-end z-20">
        {/* 캐릭터 (좌측 하단 앵커) */}
        <div className="absolute bottom-0 left-0 z-30 w-[35%] md:w-[30%] max-w-[280px]">
          <CharacterDisplay character={character} mood={currentMood} />
        </div>

        {/* 카드 영역 (중앙~우측) */}
        <div className="flex-1 flex items-center justify-center ml-[30%] md:ml-[25%] pb-4">
          <AnimatePresence mode="wait">
            {phase === "card-select" && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <CardDeck
                  cards={shuffledDeck.slice(0, 12)}
                  isSpread={animationPhase === "spreading"}
                  selectedIndices={selectedIndices}
                  onCardSelect={handleCardSelect}
                />
              </motion.div>
            )}
            {(phase === "reading" || phase === "result") && spread && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
              >
                <CardSpread
                  selectedCards={selectedCards}
                  spread={spread}
                  revealedPositions={revealedPositions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* === 하단 대화창 (25~30%) === */}
      <div className="relative z-30 flex-shrink-0">
        <DialogueBox
          messages={chatMessages}
          characterName={character.name}
          isTyping={isLoading && phase === "reading"}
        />

        {/* 결과 후 액션 버튼 */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-arcana-card/90 backdrop-blur-sm px-4 pb-4 flex gap-3"
          >
            <button
              onClick={() => {
                useSessionStore.getState().reset();
                useCardAnimationStore.getState().reset();
                router.push("/tarot");
              }}
              className="flex-1 py-2.5 rounded-full bg-arcana-surface border border-arcana-border text-sm hover:border-arcana-purple transition-colors font-serif"
            >
              새로운 상담
            </button>
            <button className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm hover:opacity-90 transition-opacity font-serif">
              결과 공유하기
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/tarot/session/page.tsx
git commit -m "feat: 세션 페이지 VN 레이아웃 전면 개편 — 상단 무대 + 하단 대화창"
```

---

## Task 11: CardDeck 호버/선택 인터랙션 개선

**Files:**
- Modify: `src/components/card/CardDeck.tsx`

- [ ] **Step 1: CardDeck 개선**

```tsx
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardDeckProps {
  cards: TarotCard[];
  isSpread: boolean;
  selectedIndices: number[];
  onCardSelect: (index: number) => void;
  maxDisplay?: number;
}

export function CardDeck({ cards, isSpread, selectedIndices, onCardSelect, maxDisplay = 12 }: CardDeckProps) {
  const displayCards = useMemo(() => cards.slice(0, maxDisplay), [cards, maxDisplay]);

  return (
    <div className="relative w-full flex items-center justify-center min-h-[180px] md:min-h-[200px]">
      {displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const angle = isSpread ? (index - totalCards / 2) * (180 / totalCards / 2) : 0;
        const xOffset = isSpread ? (index - totalCards / 2) * 36 : (index - totalCards / 2) * 2;
        const yOffset = isSpread ? Math.abs(index - totalCards / 2) * 6 : index * -0.5;

        return (
          <motion.div
            key={card.id}
            initial={{ x: 0, y: 50, rotate: 0, opacity: 0 }}
            animate={{
              x: xOffset,
              y: isSelected ? -40 : yOffset,
              rotate: angle,
              opacity: isSelected ? 0.3 : 1,
              scale: isSelected ? 0.9 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: isSpread ? index * 0.04 : 0,
            }}
            className="absolute"
            style={{ zIndex: isSelected ? 0 : index }}
          >
            <CardItem
              card={card}
              isFlipped={false}
              isSelected={isSelected}
              onClick={() => !isSelected && onCardSelect(index)}
              size="md"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardDeck.tsx
git commit -m "feat: CardDeck — 선택 시 부상 효과 + spring 물리 개선"
```

---

## Task 12: CardSpread spring 물리 개선

**Files:**
- Modify: `src/components/card/CardSpread.tsx`

- [ ] **Step 1: CardSpread 개선**

```tsx
"use client";

import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition } from "@/types/session";
import { CardItem } from "./CardItem";

interface CardSpreadProps {
  selectedCards: SelectedCard[];
  spread: SpreadDefinition;
  revealedPositions: number[];
}

export function CardSpread({ selectedCards, spread, revealedPositions }: CardSpreadProps) {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[4/3]">
      {spread.positions.map((pos) => {
        const selectedCard = selectedCards.find((sc) => sc.position === pos.index);
        const isRevealed = revealedPositions.includes(pos.index);

        return (
          <motion.div
            key={pos.index}
            initial={{ opacity: 0, scale: 0.3, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: pos.index * 0.25,
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {selectedCard ? (
              <div className="flex flex-col items-center gap-1">
                <CardItem
                  card={selectedCard.card}
                  isFlipped={isRevealed}
                  isSelected={true}
                  isReversed={selectedCard.isReversed}
                  size="md"
                />
                <span className="text-arcana-gold/70 text-xs font-serif">{pos.labelKo}</span>
              </div>
            ) : (
              <div className="w-24 h-36 rounded-lg border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5">
                <span className="text-arcana-muted text-xs font-serif">{pos.labelKo}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/card/CardSpread.tsx
git commit -m "feat: CardSpread — spring 물리 개선 + 골드 라벨 + 대시 보더 개선"
```

---

## Task 13: 스프라이트 시트 플레이스홀더 이미지 생성

**Files:**
- Create: `public/images/characters/arcana/sprites/` (6개 PNG 파일)

스프라이트 시트가 아직 없으므로, SpriteAnimator가 에러 없이 동작하도록 플레이스홀더를 생성한다. 각 플레이스홀더는 프레임 수에 맞는 가로 길이의 단색 이미지이다.

- [ ] **Step 1: 플레이스홀더 스프라이트 디렉토리 생성 및 스크립트 작성**

```bash
mkdir -p public/images/characters/arcana/sprites
```

- [ ] **Step 2: 간단한 Node.js 스크립트로 플레이스홀더 SVG 생성**

각 스프라이트에 대해 프레임 수만큼의 칸을 가진 SVG 파일을 생성한다. 이 SVG들은 나중에 Grok AI로 생성한 실제 PNG 스프라이트 시트로 교체될 것이다.

```bash
# idle (6프레임, 3072x768)
cat > public/images/characters/arcana/sprites/idle.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="3072" height="768" viewBox="0 0 3072 768">
  <rect width="3072" height="768" fill="#1a0a3e"/>
  <g fill="none" stroke="#8b5cf6" stroke-width="2">
    <circle cx="256" cy="300" r="60"/><text x="256" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 1</text>
    <circle cx="768" cy="300" r="60"/><text x="768" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 2</text>
    <circle cx="1280" cy="300" r="60"/><text x="1280" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 3</text>
    <circle cx="1792" cy="300" r="60"/><text x="1792" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 4</text>
    <circle cx="2304" cy="300" r="60"/><text x="2304" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 5</text>
    <circle cx="2816" cy="300" r="60"/><text x="2816" y="310" text-anchor="middle" fill="#8b5cf6" font-size="20">IDLE 6</text>
  </g>
</svg>
SVGEOF
```

나머지 5개도 동일 패턴으로 생성 (talking 6프레임, happy 4프레임, serious 4프레임, mystical 8프레임, surprised 4프레임). SpriteAnimator의 `src` 경로를 `.svg`에서도 동작하도록 확인.

- [ ] **Step 3: SpriteAnimator에서 SVG도 지원하도록 확인**

SpriteAnimator는 `backgroundImage: url(...)` 방식이므로 SVG도 정상 동작한다. 단, 실제 운영 시에는 PNG 스프라이트 시트로 교체해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add public/images/characters/arcana/sprites/
git commit -m "feat: 스프라이트 시트 플레이스홀더 SVG 생성 (Grok AI 이미지로 교체 예정)"
```

---

## Task 14: 최종 통합 빌드 및 검증

**Files:** (전체)

- [ ] **Step 1: TypeScript 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: Lint 체크**

Run: `pnpm lint`
Expected: 에러 없음 (경고는 허용)

- [ ] **Step 3: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 개발 서버에서 시각적 확인**

Run: `pnpm dev`
확인 항목:
1. `/tarot` 주제 선택 → 세션 진입 시 VN 레이아웃 표시
2. 캐릭터가 좌하단에 스프라이트(플레이스홀더)로 표시
3. 카드 덱이 만다라 뒷면으로 표시
4. 카드 호버 시 글로우 + 부상 효과
5. 카드 선택 시 뒤집기 + 플래시 이펙트
6. 하단 대화창에 캐릭터 이름 태그 + 타이핑 효과
7. 파티클 효과가 배경에 떠다님
8. 비네팅 효과로 가장자리 어두움

- [ ] **Step 5: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "fix: 통합 빌드 검증 후 수정사항"
```
