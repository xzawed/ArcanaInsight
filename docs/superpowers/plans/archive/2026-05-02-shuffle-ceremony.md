# ShuffleCeremony 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 카드 선택 화면 진입 시 2.2초 셔플 의식 애니메이션(덱 컷 → 글로우 폭발 → 타이프라이터 → 부채꼴 펼침)을 독립 컴포넌트로 구현한다.

**Architecture:** `ShuffleCeremony.tsx` 신규 독립 컴포넌트(Canvas rAF 기반)를 `card-shuffle` phase 동안 콘텐츠 영역에 렌더링한다. 완료 또는 클릭 스킵 시 `onComplete()` 콜백으로 `card-select`로 전환하며, 기존 `CardDeck`은 전혀 건드리지 않는다.

**Tech Stack:** TypeScript strict, Next.js App Router (`"use client"`), Canvas API + requestAnimationFrame, Tailwind CSS v4

---

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)

- [ ] SSR/Hydration: `window.matchMedia` / Canvas — `useEffect` 내부에서만 호출. `useState` 초기값 없음.
- [ ] 비슷한 파일 N개 생성 여부 → 파일 1개 신규, 공통 베이스 불필요
- [ ] UI 텍스트 변경 여부 → 기존 텍스트 변경 없음. E2E 셀렉터 영향 없음.

---

## 파일 구조

| 역할 | 경로 | 변경 유형 |
|------|------|----------|
| 캐릭터별 셔플 텍스트 | `src/data/characters/waiting-lines.ts` | 수정 — export 1개 추가 (파일 끝) |
| 셔플 의식 컴포넌트 | `src/components/tarot/ShuffleCeremony.tsx` | 신규 생성 |
| 타로 세션 페이지 통합 | `src/app/tarot/session/page.tsx` | 수정 — import 1개 + callback + setTimeout 제거 + render 1줄 |

---

## Task 1: `shuffleCeremonyText` 데이터 추가

**Files:**
- Modify: `src/data/characters/waiting-lines.ts` (파일 끝에 추가)

### 컨텍스트

`src/data/characters/waiting-lines.ts`는 타로·사주·신점 대기 대사를 관리하는 파일이다. 파일 끝(`CHARACTER_RESULT_MOODS` export 다음)에 셔플 의식 텍스트 export를 추가한다. 이 파일은 vitest coverage에서 제외(`src/data/characters/**`)되므로 별도 테스트 파일은 필요 없다.

- [ ] **Step 1: `shuffleCeremonyText` export 추가**

`src/data/characters/waiting-lines.ts` 파일 끝(현재 마지막 줄 `CHARACTER_RESULT_MOODS` 아래)에 추가:

```ts
/** 타로 카드 셔플 의식 타이프라이터 텍스트 — 최대 12자, 58ms/자 */
export const shuffleCeremonyText: Record<string, string> = {
  arcana:  "카드를 골라봐요 ✨",
  miko:    "패를 고르십시오",
  seonhwa: "카드를 고르세요~",
  hoshi:   "골라봐~! ★",
  luna:    "카드를 골라줘요 🌙",
  rei:     "골라.",
  cairn:   "카드를 고르십시오",
  zero:    "...운명을 골라",
  haru:    "카드 골라요! ☀️",
  ren:     "패를 고르시오",
  lix:     "어떤 거 골라볼까~ ㅋ",
  ethan:   "카드 선택해줘요",
};
```

- [ ] **Step 2: 타입 검증**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm type-check && pnpm lint
```

Expected: 에러 0개

- [ ] **Step 3: 커밋**

```bash
git add src/data/characters/waiting-lines.ts
git commit -m "feat: 타로 셔플 의식용 캐릭터별 텍스트 데이터 추가"
```

---

## Task 2: `ShuffleCeremony.tsx` 컴포넌트 생성

**Files:**
- Create: `src/components/tarot/ShuffleCeremony.tsx`

### 컨텍스트

- Canvas + requestAnimationFrame 기반 애니메이션 (Framer Motion 미사용 — 타이밍 정밀도 필요)
- 총 2.2초, 4단계: ① 덱 컷(0–500ms) → ② 글로우 폭발(500–700ms) → ③ 타이프라이터(700–1400ms, 58ms/자) → ④ 부채꼴 펼침(1400–2000ms, spring) → hold(2200ms)
- 카드 9장 고정 (시각 효과 전용, 실제 스프레드 크기와 무관)
- 스킵: 화면 클릭 → `doneRef.current = true` → 다음 rAF 프레임에서 최종 상태 + `onComplete()`
- `prefers-reduced-motion`: `useEffect` 내 감지 시 즉시 `onComplete()`
- `onCompleteRef` 패턴으로 stale closure 방지, `calledRef`로 중복 호출 방지
- `ResizeObserver`로 부모 크기 변화 시 canvas 크기 동기화
- `src/components/**`는 vitest exclude → 단위 테스트 없음 (E2E 커버)

이 파일에 존재하는 `src/components/tarot/` 디렉토리 내 파일들:

```
src/components/tarot/CardDeck.tsx
src/components/tarot/CardSpread.tsx
src/components/tarot/CardReveal.tsx
```

- [ ] **Step 1: `ShuffleCeremony.tsx` 생성**

`src/components/tarot/ShuffleCeremony.tsx` 파일을 아래 내용으로 생성:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { shuffleCeremonyText } from "@/data/characters/waiting-lines";

interface ShuffleCeremonyProps {
  characterId: string;
  onComplete: () => void;
}

const N = 9;
const TOTAL_S = 2.2;

function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
function easeOut(t: number)   { return 1 - Math.pow(1-t, 3); }
function springFn(t: number)  { return 1 - Math.cos(t * Math.PI * 2.5) * Math.pow(1-t, 2.5); }
function lerp(a: number, b: number, t: number) { return a + (b-a)*t; }

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  angle: number, alpha: number, glowStrength: number,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glowStrength > 0) {
    ctx.shadowColor = `rgba(139,92,246,${glowStrength})`;
    ctx.shadowBlur = 20 * glowStrength;
  }
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 4);
  else ctx.rect(-w/2, -h/2, w, h);
  const g = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
  g.addColorStop(0, "#2d1b69");
  g.addColorStop(1, "#1a0a3e");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function ShuffleCeremony({ characterId, onComplete }: ShuffleCeremonyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    function safeComplete() {
      if (!calledRef.current) {
        calledRef.current = true;
        onCompleteRef.current();
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      safeComplete();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(canvas.parentElement!);

    const charText = shuffleCeremonyText[characterId] ?? "카드를 선택하세요";
    const textChars = [...charText];
    let rafId: number;
    let startMs: number | null = null;
    const cw = 34, ch = 54;

    function drawFinal() {
      const W = canvas.width, H = canvas.height;
      const cx = W/2, cy = H/2;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const f = i/(N-1) - 0.5;
        drawCard(ctx, cx + f*120, cy + Math.pow(f*2, 2)*15, cw, ch, f*0.4, 1, 0);
      }
      ctx.fillStyle = "rgba(196,181,253,0.95)";
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(charText, cx, H - 24);
    }

    function frame(ts: number) {
      if (doneRef.current) {
        drawFinal();
        safeComplete();
        return;
      }

      if (!startMs) startMs = ts;
      const t = (ts - startMs) / 1000;
      const W = canvas.width, H = canvas.height;
      const cx = W/2, cy = H/2;
      ctx.clearRect(0, 0, W, H);

      if (t >= TOTAL_S) {
        drawFinal();
        doneRef.current = true;
        safeComplete();
        return;
      }

      if (t < 0.5) {
        // ① 덱 컷
        const p = easeInOut(Math.min(t / 0.35, 1));
        const ret = t > 0.35 ? easeInOut((t - 0.35) / 0.15) : 0;
        const upY = cy - lerp(0, 26, p) + lerp(0, 26, ret);
        const dnY = cy + lerp(0, 20, p) - lerp(0, 20, ret);
        const glow = p > 0.4 ? Math.min((p - 0.4) / 0.6, 1) * (1 - ret) * 0.8 : 0;
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, upY - i*2.5, cw, ch, 0, 1, glow*0.4);
        for (let i = 2; i >= 0; i--) drawCard(ctx, cx, dnY + i*2.5, cw, ch, 0, 1, glow*0.4);
      } else if (t < 0.7) {
        // ② 글로우 폭발
        const p = easeOut((t - 0.5) / 0.2);
        const fade = 1 - p;
        const rr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120*p + 10);
        rr.addColorStop(0, `rgba(139,92,246,${0.55*fade})`);
        rr.addColorStop(1, "rgba(139,92,246,0)");
        ctx.fillStyle = rr;
        ctx.fillRect(0, 0, W, H);
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*2, cw, ch, 0, 1, fade*0.9);
      } else if (t < 1.4) {
        // ③ 타이프라이터
        for (let i = 3; i >= 0; i--) drawCard(ctx, cx, cy - i*2, cw, ch, 0, 1, 0);
        const count = Math.floor((t - 0.7) / 0.058);
        if (count > 0) {
          ctx.fillStyle = "rgba(196,181,253,0.95)";
          ctx.font = "14px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(textChars.slice(0, Math.min(count, textChars.length)).join(""), cx, H - 24);
        }
      } else {
        // ④ 부채꼴 펼침
        const p = springFn(Math.min((t - 1.4) / 0.6, 1));
        for (let i = 0; i < N; i++) {
          const f = i/(N-1) - 0.5;
          drawCard(ctx, cx + f*120*p, cy + Math.pow(f*2, 2)*15*p, cw, ch, f*0.4*p, 1, 0);
        }
        ctx.fillStyle = "rgba(196,181,253,0.95)";
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(charText, cx, H - 24);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NOSONAR — intentional: run once on mount, refs handle callbacks

  return (
    <div
      className="w-full h-full flex items-center justify-center cursor-pointer select-none"
      onClick={() => { doneRef.current = true; }}
      role="button"
      aria-label="카드 셔플 의식 스킵"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
```

- [ ] **Step 2: 타입 검증**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm type-check && pnpm lint
```

Expected: 에러 0개. lint 경고가 있다면 내용 확인 후 수정.

- [ ] **Step 3: 커밋**

```bash
git add src/components/tarot/ShuffleCeremony.tsx
git commit -m "feat: ShuffleCeremony 캔버스 애니메이션 컴포넌트 구현"
```

---

## Task 3: `tarot/session/page.tsx` 통합

**Files:**
- Modify: `src/app/tarot/session/page.tsx`

### 컨텍스트

현재 `TarotSessionPage` 컴포넌트의 `useEffect` (line ~147)는 초기화 후 `setTimeout(2000ms)`으로 `card-select` phase로 전환한다. 이 타이머를 제거하고 `ShuffleCeremony`의 `onComplete` 콜백으로 대체한다.

변경 범위:
1. `ShuffleCeremony` import 추가 (line ~14 imports 블록)
2. `handleCeremonyComplete` useCallback 추가 (기존 `handleCardSelect` 위)
3. `useEffect` 내 `setTimeout` 블록 제거
4. 콘텐츠 우측 컬럼에 `{phase === "card-shuffle"}` 조건부 렌더링 추가

**주의:** 기존 `useEffect`의 `// eslint-disable-next-line react-hooks/exhaustive-deps` 주석과 `}, [topic]); // NOSONAR` 는 그대로 유지한다.

- [ ] **Step 1: `ShuffleCeremony` import 추가**

`src/app/tarot/session/page.tsx` 에서 기존 import 블록(line ~14, `CardDeck` import 근처)에 추가:

```tsx
// 기존:
import { CardDeck } from "@/components/card/CardDeck";

// 변경 후 (아래 줄 추가):
import { CardDeck } from "@/components/card/CardDeck";
import { ShuffleCeremony } from "@/components/tarot/ShuffleCeremony";
```

- [ ] **Step 2: `handleCeremonyComplete` 콜백 추가**

`TarotSessionPage` 컴포넌트 내부, 기존 `handleCardSelect` useCallback(line ~192) **바로 위**에 추가:

```tsx
const handleCeremonyComplete = useCallback(() => {
  const { requiredCards: required } = useSessionStore.getState();
  setAnimationPhase("spreading");
  setPhase("card-select");
  addChatMessage({
    id: crypto.randomUUID(), role: "character",
    content: `${required}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요`,
    mood: "default", timestamp: new Date(),
  });
}, [addChatMessage, setAnimationPhase, setPhase]);
```

- [ ] **Step 3: `useEffect` 내 `setTimeout` 블록 제거**

현재 `useEffect` 내부 (line ~180-188):

```tsx
// 제거할 코드:
setTimeout(() => {
  setAnimationPhase("spreading");
  setPhase("card-select");
  addChatMessage({
    id: crypto.randomUUID(), role: "character",
    content: `${requiredCards}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요`,
    mood: "default", timestamp: new Date(),
  });
}, 2000);
```

이 블록 전체를 삭제한다. `setMood("default")` 및 `addChatMessage(character.greeting, ...)` 는 유지한다.

- [ ] **Step 4: `card-shuffle` 조건부 렌더링 추가**

콘텐츠 우측 컬럼 div (`flex-1 md:w-[50%]`, line ~418) 내부, 기존 `{phase === "card-select" && (` 헤더 버튼 블록 **바로 위**에 추가:

```tsx
{/* 우측: 모바일 하단 / 데스크탑 우측 50% */}
<div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden">
  {phase === "card-shuffle" && (
    <ShuffleCeremony
      characterId={characterId ?? "arcana"}
      onComplete={handleCeremonyComplete}
    />
  )}
  {phase === "card-select" && (   {/* ← 기존 코드 유지 */}
```

- [ ] **Step 5: 타입 검증 + 빌드**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm type-check && pnpm lint && pnpm build
```

Expected:
- type-check: 에러 0개
- lint: 에러 0개
- build: ✓ Compiled successfully

- [ ] **Step 6: 테스트 실행**

```bash
pnpm test:coverage
```

Expected: 685개 이상 통과, statements ≥ 98%, branches ≥ 92%. 새 코드는 coverage 제외 경로에 있으므로 임계치 변화 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/app/tarot/session/page.tsx
git commit -m "feat: 타로 세션에 ShuffleCeremony 통합 — card-shuffle phase 대체"
```

---

## Task 4: 피처 브랜치 PR 생성

### 컨텍스트

모든 작업은 `feature/shuffle-ceremony` 브랜치에서 진행한다. Task 1 시작 전에 브랜치를 만들어야 한다. Task 1-3 커밋 후 PR을 생성한다.

- [ ] **Step 1: 작업 시작 전 — 피처 브랜치 생성**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
git checkout -b feature/shuffle-ceremony
```

> **주의:** 이 단계는 Task 1 Step 1 실행 **전**에 수행한다.

- [ ] **Step 2: 브랜치 푸시 및 PR 생성**

Task 1-3 모두 완료 후:

```bash
git push -u origin feature/shuffle-ceremony
gh pr create --title "feat: 타로 카드 셔플 의식 애니메이션 (ShuffleCeremony)" --body "$(cat <<'EOF'
## Summary
- `ShuffleCeremony.tsx` Canvas rAF 컴포넌트 신규 구현 (2.2초 4단계 시퀀스)
- `waiting-lines.ts`에 12종 캐릭터별 셔플 텍스트 추가
- `tarot/session/page.tsx` card-shuffle phase 통합 — 기존 setTimeout 대체
- prefers-reduced-motion 즉시 스킵, 클릭 스킵 지원

## Test Plan
- [ ] `pnpm type-check && pnpm lint && pnpm build` 통과 확인
- [ ] `pnpm test:coverage` 임계치 유지 확인
- [ ] 브라우저에서 타로 세션 진입 → 의식 애니메이션 2.2초 재생 확인
- [ ] 클릭 스킵 → 즉시 card-select phase 전환 확인
- [ ] 12종 캐릭터별 텍스트가 타이프라이터로 올바르게 표시되는지 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 자체 검토

**Spec coverage:**
- ✅ 3개 파일 모두 포함 (waiting-lines.ts, ShuffleCeremony.tsx, session/page.tsx)
- ✅ 4단계 애니메이션 전체 구현 코드 포함
- ✅ 12종 캐릭터 텍스트 전체 포함
- ✅ prefers-reduced-motion 처리 포함
- ✅ 클릭 스킵 처리 포함
- ✅ onComplete 중복 호출 방지 (calledRef) 포함
- ✅ ResizeObserver canvas 크기 동기화 포함
- ✅ feature 브랜치 + PR 생성 포함

**Placeholder scan:** TBD/TODO 없음. 모든 코드 블록 완성.

**Type consistency:** `ShuffleCeremony` 컴포넌트는 Task 2에서 `export function ShuffleCeremony`로 정의, Task 3에서 동일 이름으로 import/사용.
