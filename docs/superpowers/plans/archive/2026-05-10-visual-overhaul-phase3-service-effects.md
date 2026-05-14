# Visual Overhaul Phase 3: 서비스 페이지 이펙트 강화 + 카드 텍스트 비노출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 타로 카드 스프레드·뒤집기·셔플 등 서비스 플로우 전반의 애니메이션을 극적으로 강화하고, 카드 앞면 이미지는 보이되 AI 리딩 완료 전까지 하단 텍스트(카드명·문구)를 숨기는 기능을 구현한다.

**Architecture:** CardFace에 showLabel prop을 추가해 SVG 텍스트 요소를 조건부 렌더링한다. useReadingReveal hook이 카드별 reveal 상태를 관리하고, AI 리딩 완료 시 AnimatePresence로 텍스트를 fade-in 한다. ShuffleCeremony·CardSpread·CardItem의 Framer Motion 애니메이션을 전면 강화한다.

**Tech Stack:** Framer Motion, React, CSS keyframes, Next.js dynamic import

---

## 사전 조건

- Phase 2 (`feat/visual-overhaul-phase2`) 완료 후 작업 시작
- 작업 브랜치: `feat/visual-overhaul-phase3`
- 모바일: `window.innerWidth < 768` 시 파티클/ripple intensity 자동 축소

---

## 카드 텍스트 비노출 규칙

| 단계(phase) | 카드 이미지 | 하단 텍스트 |
|------------|-----------|------------|
| shuffle | 뒷면 | 없음 |
| card-select (spread) | 앞면 ✓ | 숨김 |
| reading (AI 진행 중) | 앞면 ✓ | 숨김 |
| result (AI 완료) | 앞면 ✓ | 카드별 reveal 애니메이션 |

---

## 수정 파일 목록

### 신규 생성
1. `src/hooks/useReadingReveal.ts` — 카드별 reveal 상태 관리 (Zustand store)
2. `src/components/tarot/CardFlipEffect.tsx` — 뒤집기 시 빛 폭발 + 8방향 파티클
3. `src/components/tarot/CardSpreadEffects.tsx` — 착지 ripple + 마법진 오버레이 래퍼
4. `src/components/saju/SajuChartReveal.tsx` — 사주 차트 순차 등장 래퍼
5. `src/components/shinjeom/ShinjeomEnergyEffect.tsx` — 오방색 에너지 인트로

### 수정
6. `src/components/card/CardFace.tsx` — showLabel prop 추가 (126-134줄 SVG 텍스트 조건부)
7. `src/components/card/CardItem.tsx` — showLabel prop 추가 + CardFace에 전달
8. `src/components/tarot/ShuffleCeremony.tsx` — Canvas 셔플 애니메이션 전면 강화
9. `src/components/card/CardSpread.tsx` — CardSpreadEffects 통합 + showLabel 전달
10. `src/app/tarot/session/page.tsx` — showLabel 전달 + useReadingReveal 통합
11. `src/app/saju/session/page.tsx` — SajuChartReveal 통합
12. `src/app/shinjeom/session/page.tsx` — ShinjeomEnergyEffect 통합

### 테스트
13. `src/__tests__/components/card/CardFace.showLabel.test.tsx` — showLabel=false 단위 테스트
14. `e2e/tarot-text-reveal.spec.ts` — 카드 텍스트 숨김→등장 E2E

---

## Task 1: 브랜치 생성 및 useReadingReveal hook 구현

- [x] 브랜치 생성: `git checkout -b feat/visual-overhaul-phase3`
- [x] `src/hooks/useReadingReveal.ts` 파일 생성:

```typescript
// src/hooks/useReadingReveal.ts
import { create } from "zustand";

interface ReadingRevealState {
  revealedCardIds: Set<string>;
  revealCard: (cardId: string) => void;
  revealAll: () => void;
  resetReveal: () => void;
}

export const useReadingReveal = create<ReadingRevealState>((set) => ({
  revealedCardIds: new Set(),
  revealCard: (cardId) =>
    set((s) => ({ revealedCardIds: new Set([...s.revealedCardIds, cardId]) })),
  revealAll: () => set({ revealedCardIds: new Set(["all"]) }),
  resetReveal: () => set({ revealedCardIds: new Set() }),
}));
```

- [x] 검증: `pnpm type-check`
- [x] 커밋:
  ```bash
  git add src/hooks/useReadingReveal.ts
  git commit -m "feat: add useReadingReveal Zustand hook for card-by-card text reveal state"
  ```

---

## Task 2: CardFace.tsx — showLabel prop 추가

`src/components/card/CardFace.tsx`의 interface와 SVG 텍스트 블록을 수정한다.

- [x] interface에 `showLabel?: boolean` 추가, 함수 시그니처에 destructure 추가:

```typescript
// 변경 전 (12-20줄)
interface CardFaceProps {
  readonly card: TarotCard;
  readonly isReversed: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
}
```

```typescript
// 변경 후
interface CardFaceProps {
  readonly card: TarotCard;
  readonly isReversed: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
  /** false이면 카드 하단 텍스트(카드명·문구)를 숨긴다. 기본값: true */
  readonly showLabel?: boolean;
}
```

- [x] 함수 시그니처 수정 (`src/components/card/CardFace.tsx` 28줄):

```typescript
// 변경 전
export function CardFace({ card, isReversed, size = "md", width, height, className = "", skinId }: CardFaceProps) {
```

```typescript
// 변경 후
export function CardFace({ card, isReversed, size = "md", width, height, className = "", skinId, showLabel = true }: CardFaceProps) {
```

- [x] SVG 텍스트 블록(126-134줄)을 조건부 렌더링으로 교체:

```typescript
// 변경 전 (126-134줄)
        <text x={cx} y={h * 0.82} textAnchor="middle" dominantBaseline="central"
          fill="#e2e8f0" fontSize={fontSize} fontFamily="serif" letterSpacing="1">
          {card.name.toUpperCase()}
        </text>

        <text x={cx} y={h * 0.92} textAnchor="middle" dominantBaseline="central"
          fill="#94a3b8" fontSize={fontSize - 2}>
          {getCardName(card, locale)}
        </text>
```

```typescript
// 변경 후
        {showLabel && (
          <>
            <text x={cx} y={h * 0.82} textAnchor="middle" dominantBaseline="central"
              fill="#e2e8f0" fontSize={fontSize} fontFamily="serif" letterSpacing="1">
              {card.name.toUpperCase()}
            </text>
            <text x={cx} y={h * 0.92} textAnchor="middle" dominantBaseline="central"
              fill="#94a3b8" fontSize={fontSize - 2}>
              {getCardName(card, locale)}
            </text>
          </>
        )}
```

- [x] 스킨 이미지 경로(51-73줄)의 `return` 블록에도 showLabel을 반영한다. 스킨 이미지는 파일 자체에 텍스트가 없으므로 별도 처리 불필요 — 주석만 추가:

```typescript
// skinId 분기: 이미지 파일 자체에 카드명이 없으므로 showLabel은 SVG 전용.
// 스킨 사용 시 텍스트 숨김은 기본 적용됨.
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/card/CardFace.tsx
  git commit -m "feat(card): add showLabel prop to CardFace — conditionally hide card name/text in SVG"
  ```

---

## Task 3: CardItem.tsx — showLabel prop 전달

- [x] `src/components/card/CardItem.tsx` interface에 `showLabel?: boolean` 추가:

```typescript
// 변경 전 (9-21줄)
interface CardItemProps {
  readonly card: TarotCard;
  readonly isFlipped: boolean;
  readonly isSelected: boolean;
  readonly isReversed?: boolean;
  readonly onClick?: () => void;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
  readonly glowColor?: string;
}
```

```typescript
// 변경 후
interface CardItemProps {
  readonly card: TarotCard;
  readonly isFlipped: boolean;
  readonly isSelected: boolean;
  readonly isReversed?: boolean;
  readonly onClick?: () => void;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
  readonly glowColor?: string;
  /** false이면 카드 하단 텍스트를 숨긴다 (CardFace에 전달). 기본값: true */
  readonly showLabel?: boolean;
}
```

- [x] 함수 시그니처 수정 (25줄):

```typescript
// 변경 전
export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId, glowColor }: CardItemProps) {
```

```typescript
// 변경 후
export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId, glowColor, showLabel = true }: CardItemProps) {
```

- [x] CardFace 렌더링(99줄)에 showLabel 전달:

```typescript
// 변경 전
          <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} className="w-full h-full" skinId={skinId} />
```

```typescript
// 변경 후
          <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} className="w-full h-full" skinId={skinId} showLabel={showLabel} />
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/card/CardItem.tsx
  git commit -m "feat(card): propagate showLabel prop from CardItem to CardFace"
  ```

---

## Task 4: CardFace showLabel 단위 테스트

- [x] `src/__tests__/components/card/CardFace.showLabel.test.tsx` 생성:

```typescript
// src/__tests__/components/card/CardFace.showLabel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardFace } from "@/components/card/CardFace";
import type { TarotCard } from "@/types/card";

vi.mock("@/hooks/useLocaleStore", () => ({
  useLocaleStore: (sel: (s: { locale: string }) => unknown) => sel({ locale: "ko" }),
}));
vi.mock("@/lib/storage", () => ({ getCardImageUrl: () => "" }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} alt={String(props.alt ?? "")} /> }));

const mockCard: TarotCard = {
  id: "fool",
  name: "The Fool",
  number: 0,
  type: "major",
  suit: undefined,
  uprightMeaning: "새로운 시작",
  reversedMeaning: "무모함",
  keywords: ["자유"],
  description: "광대",
};

describe("CardFace showLabel prop", () => {
  it("showLabel 기본값(true)일 때 카드명 텍스트가 렌더링된다", () => {
    const { container } = render(
      <CardFace card={mockCard} isReversed={false} />
    );
    const texts = container.querySelectorAll("text");
    const hasCardName = Array.from(texts).some(
      (el) => el.textContent?.includes("THE FOOL")
    );
    expect(hasCardName).toBe(true);
  });

  it("showLabel=false일 때 영문 카드명 텍스트가 없다", () => {
    const { container } = render(
      <CardFace card={mockCard} isReversed={false} showLabel={false} />
    );
    const texts = container.querySelectorAll("text");
    const hasCardName = Array.from(texts).some(
      (el) => el.textContent?.includes("THE FOOL")
    );
    expect(hasCardName).toBe(false);
  });

  it("showLabel=false일 때 숫자(로마 숫자)는 여전히 렌더링된다", () => {
    const { container } = render(
      <CardFace card={mockCard} isReversed={false} showLabel={false} />
    );
    const texts = container.querySelectorAll("text");
    // numeral "0"은 showLabel과 무관하게 항상 표시
    const hasNumeral = Array.from(texts).some(
      (el) => el.textContent === "0"
    );
    expect(hasNumeral).toBe(true);
  });

  it("showLabel=true일 때 로케일 카드명도 렌더링된다", () => {
    const { container } = render(
      <CardFace card={mockCard} isReversed={false} showLabel={true} />
    );
    // getCardName이 mock locale "ko"로 동작 — 텍스트 element가 2개 이상 존재
    const textEls = container.querySelectorAll("text");
    // numeral + 영문명 + 로케일명 최소 3개
    expect(textEls.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [x] 검증: `pnpm test:coverage -- --testPathPattern="CardFace.showLabel"`
- [x] 커밋:
  ```bash
  git add "src/__tests__/components/card/CardFace.showLabel.test.tsx"
  git commit -m "test(card): add unit tests for CardFace showLabel prop"
  ```

---

## Task 5: CardFlipEffect.tsx 구현

- [x] `src/components/tarot/CardFlipEffect.tsx` 생성:

```typescript
// src/components/tarot/CardFlipEffect.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CardFlipEffectProps {
  /** true이면 빛 폭발 + 파티클 이펙트 재생 */
  readonly isFlipping: boolean;
  /** 테마 주색상 (hex 또는 CSS 색상). 기본: "#a78bfa" */
  readonly color?: string;
  readonly onFlipComplete?: () => void;
}

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/**
 * 카드 뒤집힐 때 빛 폭발 + 8방향 파티클 이펙트.
 * 부모 요소에 `position: relative` 필수.
 */
export function CardFlipEffect({ isFlipping, color = "#a78bfa", onFlipComplete }: CardFlipEffectProps) {
  return (
    <AnimatePresence onExitComplete={onFlipComplete}>
      {isFlipping && (
        <>
          {/* 중앙 빛 폭발 */}
          <motion.div
            key="burst"
            className="absolute inset-0 rounded-lg pointer-events-none z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.5, 2.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background: `radial-gradient(ellipse, ${color}99, ${color}40 40%, transparent 70%)`,
            }}
          />
          {/* 링 파문 */}
          <motion.div
            key="ring"
            className="absolute inset-0 rounded-lg pointer-events-none z-10"
            initial={{ opacity: 0.8, scale: 0.6 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              border: `2px solid ${color}`,
              borderRadius: "0.5rem",
            }}
          />
          {/* 8방향 파티클 */}
          {PARTICLE_ANGLES.map((angle) => (
            <motion.div
              key={`particle-${angle}`}
              className="absolute pointer-events-none z-10"
              style={{
                width: 3,
                height: 20,
                background: `linear-gradient(to top, ${color}, transparent)`,
                borderRadius: "9999px",
                top: "50%",
                left: "50%",
                transformOrigin: "50% 100%",
                rotate: angle,
                translateX: "-50%",
                translateY: "-100%",
              }}
              initial={{ scaleY: 0, opacity: 1 }}
              animate={{
                scaleY: [0, 1, 0],
                opacity: [1, 0.8, 0],
                y: [0, -30, -55],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/tarot/CardFlipEffect.tsx
  git commit -m "feat(effects): add CardFlipEffect component — light burst + 8-direction particles on card flip"
  ```

---

## Task 6: CardItem.tsx — CardFlipEffect 통합

CardItem이 뒤집힐 때(`isFlipped`가 false→true로 바뀔 때) CardFlipEffect를 1회 재생한다.

- [x] `src/components/card/CardItem.tsx`에 import 추가 및 flip 감지 state 추가:

```typescript
// 추가 import
import { useEffect, useRef, useState } from "react";
import { CardFlipEffect } from "@/components/tarot/CardFlipEffect";
```

- [x] 함수 내부 hook 추가 (기존 useMotionValue 아래):

```typescript
  // 뒤집힘 감지: false → true 전환 시 1회 이펙트 재생
  const prevFlippedRef = useRef(isFlipped);
  const [showFlipEffect, setShowFlipEffect] = useState(false);
  useEffect(() => {
    if (!prevFlippedRef.current && isFlipped) {
      setShowFlipEffect(true);
    }
    prevFlippedRef.current = isFlipped;
  }, [isFlipped]);
```

- [x] 반환 JSX의 `motion.div` 루트 안에 CardFlipEffect 추가 (isFlipped && 블록 바로 위):

```typescript
      {/* 뒤집기 빛 폭발 이펙트 */}
      <CardFlipEffect
        isFlipping={showFlipEffect}
        color={glowColor ?? "#a78bfa"}
        onFlipComplete={() => setShowFlipEffect(false)}
      />
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/card/CardItem.tsx
  git commit -m "feat(card): integrate CardFlipEffect into CardItem — play on flip transition"
  ```

---

## Task 7: ShuffleCeremony.tsx — 셔플 애니메이션 전면 강화

ShuffleCeremony는 Canvas 기반(`useRef + requestAnimationFrame`)이므로 기존 패턴을 유지하면서 궤적 잔상(trail)과 완료 시 빛 폭발을 추가한다.

- [x] `src/components/tarot/ShuffleCeremony.tsx` 파일을 열어 기존 `drawCard` 함수 아래에 trail 드로어 추가:

```typescript
/** 카드 이동 경로 잔상: 이전 위치를 투명도 감쇠로 그린다 */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Array<{ x: number; y: number; angle: number }>,
  w: number, h: number,
  rgb: string,
) {
  trail.forEach((pt, i) => {
    const alpha = (i / trail.length) * 0.18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.angle);
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${rgb},0.5)`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = `rgba(${rgb},0.25)`;
    ctx.fill();
    ctx.restore();
  });
}
```

- [x] 각 카드 state에 `trail` 배열 추가하고, 셔플 단계마다 이전 위치를 push(최대 6개 유지):

```typescript
// 카드 상태 타입에 trail 추가 (기존 cards state 배열 내부)
type CardState = {
  x: number; y: number; angle: number; alpha: number; glow: number;
  trail: Array<{ x: number; y: number; angle: number }>;
};

// 셔플 루프 내 position 갱신 직전:
card.trail.push({ x: card.x, y: card.y, angle: card.angle });
if (card.trail.length > 6) card.trail.shift();
```

- [x] drawCard 호출 직전에 drawTrail 호출 삽입:

```typescript
drawTrail(ctx, card.trail, cw, ch, rgb);
drawCard(ctx, card.x, card.y, cw, ch, card.angle, card.alpha, card.glow, rgb, img);
```

- [x] 완료(onComplete) 직전 burst 이펙트: 0.3초 동안 전체 카드에 글로우 max로 설정하는 단계 추가:

```typescript
// TOTAL_S 이후 burst 단계 (기존 onComplete 호출 직전)
// burst 단계: 0.3초간 glow=1 유지 후 onComplete 실행
const BURST_DURATION = 0.3;
// rAF 루프 내 phase === "burst" 분기 추가:
if (phase === "burst") {
  cards.forEach((c) => { c.glow = 1 - (elapsed / BURST_DURATION); });
  if (elapsed >= BURST_DURATION) {
    onComplete();
  }
}
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/tarot/ShuffleCeremony.tsx
  git commit -m "feat(shuffle): add motion trail and burst flash to ShuffleCeremony canvas animation"
  ```

---

## Task 8: CardSpreadEffects.tsx 구현

착지 ripple과 마법진 SVG 오버레이를 제공하는 래퍼 컴포넌트를 만든다.

- [x] `src/components/tarot/CardSpreadEffects.tsx` 생성:

```typescript
// src/components/tarot/CardSpreadEffects.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CardLandRippleProps {
  /** 카드가 착지(mount)된 직후 true로 트리거 */
  readonly isLanding: boolean;
  readonly color?: string;
}

/** 카드 착지 시 물결 ripple 이펙트. 부모에 `position: relative` 필수. */
export function CardLandRipple({ isLanding, color = "#a78bfa" }: CardLandRippleProps) {
  return (
    <AnimatePresence>
      {isLanding && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ border: `1.5px solid ${color}`, zIndex: 5 }}
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.6 + i * 0.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

interface MagicCircleOverlayProps {
  /** 전체 스프레드가 완성된 후 true */
  readonly isActive: boolean;
  readonly color?: string;
  readonly size?: number;
}

/**
 * 스프레드 완성 후 화면 중앙에 점멸하는 마법진 SVG 오버레이.
 * CardSpread 컨테이너 내부 최하단 z-0으로 배치.
 */
export function MagicCircleOverlay({ isActive, color = "#a78bfa", size = 240 }: MagicCircleOverlayProps) {
  const r1 = size / 2;
  const r2 = r1 * 0.75;
  const r3 = r1 * 0.45;
  const cx = r1;
  const cy = r1;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.18, 0.12, 0.18] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], repeat: Infinity, repeatType: "mirror" }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* 바깥 원 */}
            <circle cx={cx} cy={cy} r={r1 - 4} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
            {/* 중간 원 */}
            <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth="0.75" opacity="0.5" />
            {/* 안쪽 원 */}
            <circle cx={cx} cy={cy} r={r3} fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
            {/* 6각형 꼭짓점 연결선 */}
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = cx + r2 * Math.cos(rad);
              const y1 = cy + r2 * Math.sin(rad);
              const x2 = cx + r2 * Math.cos(rad + (2 * Math.PI) / 3);
              const y2 = cy + r2 * Math.sin(rad + (2 * Math.PI) / 3);
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.5" opacity="0.3" />;
            })}
            {/* 방사선 */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={`ray-${deg}`}
                  x1={cx + r3 * Math.cos(rad)} y1={cy + r3 * Math.sin(rad)}
                  x2={cx + r1 * Math.cos(rad)} y2={cy + r1 * Math.sin(rad)}
                  stroke={color} strokeWidth="0.4" opacity="0.2"
                />
              );
            })}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/tarot/CardSpreadEffects.tsx
  git commit -m "feat(effects): add CardLandRipple and MagicCircleOverlay to CardSpreadEffects"
  ```

---

## Task 9: CardSpread.tsx — 착지 ripple + 마법진 오버레이 + showLabel 전달

- [x] `src/components/card/CardSpread.tsx`에 import 추가:

```typescript
import { CardLandRipple, MagicCircleOverlay } from "@/components/tarot/CardSpreadEffects";
```

- [x] `CardSpreadProps` interface에 prop 추가:

```typescript
interface CardSpreadProps {
  readonly selectedCards: SelectedCard[];
  readonly spread: SpreadDefinition;
  readonly revealedPositions: number[];
  readonly glowColor?: string;
  /** false이면 모든 카드의 하단 텍스트 숨김. 기본값: true */
  readonly showLabel?: boolean;
}
```

- [x] 함수 시그니처 수정:

```typescript
function CardSpread({ selectedCards, spread, revealedPositions, glowColor, showLabel = true }: CardSpreadProps) {
```

- [x] 내부 `landedSet` state 추가 (착지 ripple 트리거용):

```typescript
  // 착지 ripple: 새로 추가된 카드 index를 0.8초간 landedSet에 보관
  const [landedSet, setLandedSet] = useState<Set<number>>(new Set());
  useEffect(() => {
    const newPositions = selectedCards.map((sc) => sc.position);
    setLandedSet(new Set(newPositions));
    const timer = setTimeout(() => setLandedSet(new Set()), 800);
    return () => clearTimeout(timer);
  }, [selectedCards.length]); // selectedCards.length 변경 시만 트리거
```

- [x] 스프레드 완성 여부 계산:

```typescript
  const isSpreadComplete = spread.positions.length > 0 &&
    selectedCards.length >= spread.positions.length;
```

- [x] 컨테이너 div에 `MagicCircleOverlay` 추가 (첫 번째 자식으로):

```typescript
    <div ref={containerRef} className="relative w-full h-full">
      <MagicCircleOverlay
        isActive={isSpreadComplete}
        color={glowColor ?? "#a78bfa"}
        size={Math.min(containerWidth, containerHeight) * 0.6}
      />
      {/* ... 기존 카드 렌더링 */}
```

- [x] `CardItem` 렌더링(164줄 부근)에 `showLabel`과 `CardLandRipple` 추가:

```typescript
                  <div className="relative">
                    {/* 착지 ripple */}
                    <CardLandRipple
                      isLanding={landedSet.has(pos.index)}
                      color={glowColor ?? "#a78bfa"}
                    />
                    <CardItem
                      card={selectedCard.card}
                      isFlipped={isRevealed}
                      isSelected={true}
                      isReversed={selectedCard.isReversed}
                      width={layout.cardW}
                      height={layout.cardH}
                      skinId={selectedSkinId}
                      glowColor={glowColor}
                      showLabel={showLabel}
                    />
                  </div>
```

- [x] React.memo comparator에 `showLabel` 추가 (201-206줄 부근):

```typescript
  (prev, next) =>
    prev.spread === next.spread &&
    prev.glowColor === next.glowColor &&
    prev.showLabel === next.showLabel &&
    prev.selectedCards === next.selectedCards &&
    prev.revealedPositions.length === next.revealedPositions.length &&
    prev.revealedPositions.every((v, i) => v === next.revealedPositions[i]),
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/card/CardSpread.tsx
  git commit -m "feat(spread): add showLabel prop, CardLandRipple on card placement, MagicCircleOverlay on completion"
  ```

---

## Task 10: tarot/session/page.tsx — showLabel + useReadingReveal 통합

- [x] `src/app/tarot/session/page.tsx` import 추가:

```typescript
import { useReadingReveal } from "@/hooks/useReadingReveal";
```

- [x] 컴포넌트 내부 hook 호출 추가 (기존 상태 선언 블록 아래):

```typescript
  const { revealedCardIds, revealAll, resetReveal } = useReadingReveal();
```

- [x] phase가 바뀔 때 reset: `useEffect` 추가:

```typescript
  useEffect(() => {
    if (phase === "shuffle" || phase === "card-select") {
      resetReveal();
    }
  }, [phase, resetReveal]);
```

- [x] `readingResult` 완성 시 `revealAll` 호출: 기존 `setReadingResult` 호출 바로 아래에 추가:

```typescript
  // 기존 코드: setReadingResult(result);
  setReadingResult(result);
  revealAll(); // 리딩 완료 → 카드 텍스트 공개
```

- [x] `phase === "reading"` 또는 `phase === "card-select"` 블록에서 `CardSpread`에 `showLabel` 전달:

```typescript
  // showLabel: result가 없으면(리딩 미완료) 텍스트 숨김
  const showCardLabel = revealedCardIds.has("all");
```

```typescript
  // CardSpread 렌더링 시:
  <CardSpread
    selectedCards={selectedCards}
    spread={spread}
    revealedPositions={revealedPositions}
    glowColor={character?.primaryColor}
    showLabel={showCardLabel}
  />
```

- [x] 검증: `pnpm type-check && pnpm lint && pnpm build`
- [x] 커밋:
  ```bash
  git add src/app/tarot/session/page.tsx
  git commit -m "feat(tarot-session): integrate useReadingReveal — hide card labels until AI reading completes"
  ```

---

## Task 11: SajuChartReveal.tsx 구현 + saju/session/page.tsx 통합

- [x] `src/components/saju/SajuChartReveal.tsx` 생성:

```typescript
// src/components/saju/SajuChartReveal.tsx
"use client";

import { motion } from "framer-motion";

interface SajuChartRevealProps {
  readonly children: React.ReactNode;
  /** 공개 여부: false이면 블러+불투명 처리 */
  readonly isRevealed: boolean;
  /** 순차 등장 지연 (초). 기본: 0 */
  readonly delay?: number;
}

/**
 * 사주 차트 섹션을 순차적으로 등장시키는 래퍼.
 * isRevealed=false → 블러+반투명, true → 애니메이션 등장.
 */
export function SajuChartReveal({ children, isRevealed, delay = 0 }: SajuChartRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      animate={
        isRevealed
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0.15, y: 12, filter: "blur(6px)" }
      }
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

interface SajuRevealSequenceProps {
  readonly children: React.ReactNode[];
  /** true이면 children을 순차 등장 */
  readonly isRevealed: boolean;
  /** 아이템 간 지연 (초). 기본: 0.15 */
  readonly staggerDelay?: number;
}

/** children 배열을 stagger로 순차 등장시키는 래퍼 */
export function SajuRevealSequence({ children, isRevealed, staggerDelay = 0.15 }: SajuRevealSequenceProps) {
  return (
    <>
      {children.map((child, i) => (
        <SajuChartReveal key={i} isRevealed={isRevealed} delay={i * staggerDelay}>
          {child}
        </SajuChartReveal>
      ))}
    </>
  );
}
```

- [x] `src/app/saju/session/page.tsx`에서 결과 렌더링 블록(SajuChart, OhaengGraph, DaeunTimeline)을 `SajuRevealSequence`로 감싸기:

```typescript
// import 추가
import { SajuRevealSequence } from "@/components/saju/SajuChartReveal";
```

```typescript
// 결과 섹션 내부 (readingResult가 있고 sajuResult가 있는 블록):
<SajuRevealSequence isRevealed={!!readingResult} staggerDelay={0.2}>
  {[
    <SajuChart key="chart" sajuResult={sajuResult} />,
    <OhaengGraph key="ohaeng" ohaeng={sajuResult.ohaeng} />,
    <DaeunTimeline key="daeun" daeunData={sajuResult.daeun} />,
  ]}
</SajuRevealSequence>
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/saju/SajuChartReveal.tsx src/app/saju/session/page.tsx
  git commit -m "feat(saju): add SajuChartReveal sequential reveal wrapper and integrate into saju session page"
  ```

---

## Task 12: ShinjeomEnergyEffect.tsx 구현 + shinjeom/session/page.tsx 통합

- [x] `src/components/shinjeom/ShinjeomEnergyEffect.tsx` 생성:

```typescript
// src/components/shinjeom/ShinjeomEnergyEffect.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ShinjeomEnergyEffectProps {
  /** true이면 인트로 이펙트 재생 */
  readonly isActive: boolean;
  readonly onComplete?: () => void;
}

// 오방색: 청(동), 백(서), 적(남), 흑(북), 황(중앙)
const OHAENG_COLORS = [
  "#3b82f6", // 청(靑) — 동
  "#f1f5f9", // 백(白) — 서
  "#ef4444", // 적(赤) — 남
  "#1e293b", // 흑(黑) — 북
  "#eab308", // 황(黃) — 중앙
] as const;

const DIRECTION_ANGLES = [270, 90, 180, 0, null] as const; // 동/서/남/북/중앙

/**
 * 신점 세션 진입 시 오방색 에너지 인트로 이펙트.
 * 5개 에너지 줄기가 사방에서 중앙으로 모여드는 2초짜리 애니메이션.
 */
export function ShinjeomEnergyEffect({ isActive, onComplete }: ShinjeomEnergyEffectProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isActive) { setDone(false); return; }
    const timer = setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 2200);
    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && !done && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* 오방색 에너지 줄기 */}
          {OHAENG_COLORS.map((color, i) => {
            const angle = DIRECTION_ANGLES[i];
            const isCentral = angle === null;
            return isCentral ? (
              /* 중앙 황색: 원형 확산 */
              <motion.div
                key={`energy-${i}`}
                className="absolute rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  background: `radial-gradient(circle, ${color}cc, transparent 70%)`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2.5, 1.5], opacity: [0, 1, 0.6] }}
                transition={{ duration: 1.8, delay: 0.6, ease: "easeOut" }}
              />
            ) : (
              /* 사방 에너지: 방향별 줄기 */
              <motion.div
                key={`energy-${i}`}
                className="absolute"
                style={{
                  width: 4,
                  height: "55%",
                  background: `linear-gradient(to bottom, transparent, ${color}cc, ${color})`,
                  borderRadius: "9999px",
                  transformOrigin: "50% 100%",
                  rotate: angle,
                  top: angle === 180 ? "auto" : 0,
                  bottom: angle === 180 ? 0 : "auto",
                  left: "50%",
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0.6], opacity: [0, 1, 0.5] }}
                transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
              />
            );
          })}
          {/* 중앙 팔괘 원형 테두리 */}
          <motion.div
            className="absolute rounded-full border-2"
            style={{ width: 120, height: 120, borderColor: "#eab308" }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: [0, 0.7, 0], rotate: 360 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [x] `src/app/shinjeom/session/page.tsx`에서 세션 진입 시(첫 AI 응답 시작 전) `ShinjeomEnergyEffect` 렌더링:

```typescript
// import 추가
import { ShinjeomEnergyEffect } from "@/components/shinjeom/ShinjeomEnergyEffect";
```

```typescript
// 컴포넌트 내부 state 추가
const [showEnergyEffect, setShowEnergyEffect] = useState(true);
```

```typescript
// JSX 최상단(MysticBackground 아래)에 추가:
<ShinjeomEnergyEffect
  isActive={showEnergyEffect}
  onComplete={() => setShowEnergyEffect(false)}
/>
```

- [x] 검증: `pnpm type-check && pnpm lint`
- [x] 커밋:
  ```bash
  git add src/components/shinjeom/ShinjeomEnergyEffect.tsx src/app/shinjeom/session/page.tsx
  git commit -m "feat(shinjeom): add ohaeng energy intro effect for shinjeom session entry"
  ```

---

## Task 13: E2E 테스트 — 카드 텍스트 숨김→등장 시나리오

- [x] `e2e/tarot-text-reveal.spec.ts` 생성:

```typescript
// e2e/tarot-text-reveal.spec.ts
import { test, expect } from "@playwright/test";

/**
 * 타로 카드 텍스트 비노출 → AI 리딩 완료 후 텍스트 등장 E2E
 *
 * 전제: tarot 세션 페이지에 도달하기 위해 로컬 스토리지 또는
 * 직접 URL 이동 방식으로 세션 상태를 사전 설정한다.
 */

test.describe("타로 카드 텍스트 reveal 흐름", () => {
  test.beforeEach(async ({ page }) => {
    // 세션 스토어 사전 설정: character, topic, spread 선택 완료 상태로 주입
    await page.goto("/tarot");
    await page.evaluate(() => {
      // Zustand persist key로 상태 직접 주입 (테스트 전용)
      localStorage.setItem("arcana-session-store", JSON.stringify({
        state: {
          phase: "card-select",
          characterId: "arcana",
          topic: { id: "love", label: "연애" },
          spreadType: "three-card",
          requiredCards: 3,
          selectedCards: [],
          chatMessages: [],
          readingResult: null,
          isLoading: false,
        },
        version: 0,
      }));
    });
    await page.goto("/tarot/session");
    await page.waitForLoadState("networkidle");
  });

  test("card-select 단계에서 카드명 텍스트가 DOM에 없다 (showLabel=false)", async ({ page }) => {
    // SVG text 요소가 카드명을 포함하지 않아야 함
    // CardFace showLabel=false → THE FOOL 류 텍스트 없음
    const spreadContainer = page.locator('[data-testid="card-spread"]').first();
    // 스프레드가 렌더링될 때까지 대기
    await page.waitForTimeout(1500);
    const svgTexts = await page.locator("svg text").allTextContents();
    const hasCardName = svgTexts.some(
      (t) => t.length > 3 && /[A-Z]{2,}/.test(t) && !["THE", "OF"].includes(t)
    );
    // card-select 단계에서는 카드명이 없어야 함
    // (roman numeral만 표시: "0", "I", "II" 등)
    expect(hasCardName).toBe(false);
  });

  test("result 단계에서 카드명 텍스트가 등장한다 (revealAll 후)", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("arcana-session-store", JSON.stringify({
        state: {
          phase: "result",
          characterId: "arcana",
          topic: { id: "love", label: "연애" },
          spreadType: "three-card",
          requiredCards: 3,
          selectedCards: [
            { position: 0, card: { id: "fool", name: "The Fool", number: 0, type: "major" }, isReversed: false },
          ],
          chatMessages: [],
          readingResult: {
            cardInterpretations: [
              { cardId: "fool", position: 0, interpretation: "새로운 시작을 의미합니다." },
            ],
            overallReading: "전체 리딩 완료",
          },
          isLoading: false,
        },
        version: 0,
      }));
    });
    await page.goto("/tarot/session");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // result 단계: reading-content가 존재하고 카드 해석 텍스트가 보임
    const readingContent = page.locator('[data-testid="reading-content"]');
    await expect(readingContent).toBeVisible();
    await expect(readingContent).toContainText("새로운 시작");
  });
});
```

- [x] 검증: `pnpm test:e2e -- --grep "타로 카드 텍스트 reveal"`
- [x] 커밋:
  ```bash
  git add e2e/tarot-text-reveal.spec.ts
  git commit -m "test(e2e): add tarot card text reveal scenario — hidden on card-select, visible on result"
  ```

---

## Task 14: 전체 검증 및 PR 준비

- [x] 전체 정적 검사 + 빌드:
  ```bash
  pnpm type-check && pnpm lint && pnpm build
  ```
- [x] 커버리지 확인:
  ```bash
  pnpm test:coverage
  ```
  - branches 92%, 나머지 98% 이상 유지 확인
- [x] 신규 파일 문서 링크 검증:
  ```bash
  pnpm check:doc-links
  ```
- [x] i18n drift 검사:
  ```bash
  pnpm i18n:check
  ```
- [x] 구현 결과 요약 확인:
  - `src/hooks/useReadingReveal.ts` — Zustand reveal store
  - `src/components/tarot/CardFlipEffect.tsx` — 빛 폭발 이펙트
  - `src/components/tarot/CardSpreadEffects.tsx` — ripple + 마법진
  - `src/components/saju/SajuChartReveal.tsx` — 순차 등장
  - `src/components/shinjeom/ShinjeomEnergyEffect.tsx` — 오방색 인트로
  - `src/components/card/CardFace.tsx` — showLabel prop
  - `src/components/card/CardItem.tsx` — showLabel + CardFlipEffect
  - `src/components/tarot/ShuffleCeremony.tsx` — trail + burst
  - `src/components/card/CardSpread.tsx` — ripple + 마법진 + showLabel
  - `src/app/tarot/session/page.tsx` — useReadingReveal 통합
  - `src/app/saju/session/page.tsx` — SajuChartReveal 통합
  - `src/app/shinjeom/session/page.tsx` — ShinjeomEnergyEffect 통합
- [x] PR 생성:
  ```bash
  gh pr create \
    --base main \
    --head feat/visual-overhaul-phase3 \
    --title "feat: Visual Overhaul Phase 3 — service effects + card text reveal" \
    --body "## Summary
  - 타로 카드 셔플·착지·뒤집기 애니메이션 전면 강화 (trail, ripple, burst, 마법진)
  - AI 리딩 완료 전 카드 텍스트 숨김 → 완료 후 순차 reveal (showLabel prop)
  - 사주 차트 순차 등장 (SajuChartReveal), 신점 오방색 인트로 (ShinjeomEnergyEffect)
  - showLabel 단위 테스트 + 카드 텍스트 reveal E2E 시나리오 추가

  ## Test plan
  - [x] pnpm type-check 통과
  - [x] pnpm lint 통과
  - [x] pnpm build 통과
  - [x] pnpm test:coverage — branches 92%, 나머지 98% 이상
  - [x] CardFace showLabel 단위 테스트 통과
  - [x] tarot-text-reveal E2E 통과
  - [x] 모바일 화면(375px)에서 ripple·마법진 성능 확인"
  ```

---

## 구현 순서 요약

```
Task 1  → useReadingReveal hook (기반 구조)
Task 2  → CardFace showLabel prop (텍스트 숨김 핵심)
Task 3  → CardItem showLabel 전달
Task 4  → CardFace 단위 테스트
Task 5  → CardFlipEffect 컴포넌트
Task 6  → CardItem + CardFlipEffect 통합
Task 7  → ShuffleCeremony 강화
Task 8  → CardSpreadEffects (ripple + 마법진)
Task 9  → CardSpread 통합
Task 10 → tarot/session/page.tsx 통합
Task 11 → SajuChartReveal + saju page 통합
Task 12 → ShinjeomEnergyEffect + shinjeom page 통합
Task 13 → E2E 테스트
Task 14 → 전체 검증 + PR
```

---

## 관련 문서

- [`docs/architecture/ai-infrastructure.md`](../architecture/ai-infrastructure.md) — SSE 스트리밍 패턴
- [`docs/conventions/layout-rules.md`](../conventions/layout-rules.md) — 5:5 레이아웃 규칙
- [`docs/conventions/cross-platform.md`](../conventions/cross-platform.md) — 모바일 safe-area
- [`docs/workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md) — 핸드오프 형식
- Phase 1: [`2026-05-10-visual-overhaul-phase1-image-generation.md`](./2026-05-10-visual-overhaul-phase1-image-generation.md)
- Phase 2: [`2026-05-10-visual-overhaul-phase2-theme-effects.md`](./2026-05-10-visual-overhaul-phase2-theme-effects.md)
