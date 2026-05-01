# Phase 1 UI Revitalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로·사주·신점 3 서비스에 서비스별 색상 팔레트, 감성 마이크로카피, 카드 호버 3D 틸팅을 추가해 시각적 단조로움을 해소한다.

**Architecture:** `globals.css`의 `@theme` 블록에 서비스별 CSS 변수를 추가하고, `src/data/ui-copy.ts`를 새로 만들어 마이크로카피를 중앙화한다. `CardItem.tsx`에는 Framer Motion `useMotionValue`/`useTransform`으로 마우스 위치 기반 3D 틸트를 추가한다.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme`), Framer Motion v12 (`useMotionValue`, `useTransform`), TypeScript strict

---

## 파일 맵

| 상태 | 파일 | 역할 |
|------|------|------|
| Modify | `src/app/globals.css` | 서비스별 CSS 변수 추가 |
| Create | `src/data/ui-copy.ts` | 마이크로카피 중앙화 |
| Modify | `src/app/tarot/page.tsx` | 타로 마이크로카피 적용 |
| Modify | `src/app/saju/page.tsx` | 사주 마이크로카피 적용 |
| Modify | `src/app/shinjeom/page.tsx` | 신점 마이크로카피 적용 |
| Modify | `src/components/card/CardItem.tsx` | 3D 틸트 추가 |

---

### Task 1: 서비스별 CSS 색상 변수 추가

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: `@theme` 블록에 서비스별 색상 변수 추가**

`src/app/globals.css`의 `--color-arcana-silver: #c0c0c0;` 줄 바로 아래에 삽입한다:

```css
  /* Service-specific palettes */
  --color-tarot-primary: #3730a3;
  --color-tarot-accent: #f59e0b;
  --color-tarot-glow: rgba(55, 48, 163, 0.25);

  --color-saju-primary: #d97706;
  --color-saju-accent: #065f46;
  --color-saju-glow: rgba(217, 119, 6, 0.25);

  --color-shinjeom-primary: #991b1b;
  --color-shinjeom-accent: #b45309;
  --color-shinjeom-glow: rgba(153, 27, 27, 0.25);
```

- [ ] **Step 2: 타입 체크 및 빌드 검증**

```bash
pnpm type-check && pnpm build
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: 서비스별 CSS 색상 팔레트 변수 추가 (tarot·saju·shinjeom)"
```

---

### Task 2: UI 마이크로카피 데이터 파일 생성

**Files:**
- Create: `src/data/ui-copy.ts`

- [ ] **Step 1: `src/data/ui-copy.ts` 파일 생성**

```ts
export const TAROT_COPY = {
  characterSelect: {
    heading: "오늘 당신의 인연이 될 상담사를 선택해주세요",
    sub: "각 상담사마다 다른 스타일의 리딩을 제공합니다",
  },
  topicSelect: {
    heading: "어떤 이야기를 들어볼까요?",
  },
  spreadSelect: {
    heading: "운명을 펼쳐볼 방식을 선택해주세요",
    sub: "카드 수가 많을수록 더 깊이 있는 해석을 받을 수 있어요",
    userInfoBtn: "개인정보 입력하고 더 정확한 리딩 받기 (선택)",
  },
  back: {
    character: "← 다른 상담사 선택",
    topic: "← 주제 다시 선택",
  },
} as const;

export const SAJU_COPY = {
  characterSelect: {
    heading: "오늘 사주를 읽어줄 상담사를 선택해주세요",
    sub: "사주명리학 전문 상담을 받아보세요",
  },
  startButton: {
    active: "사주의 흐름을 살펴볼게요 →",
    inactive: "시간단위와 분석영역을 선택해주세요",
  },
  back: {
    info: "← 정보 수정",
  },
} as const;

export const SHINJEOM_COPY = {
  characterSelect: {
    heading: "신점 상담사를 선택해주세요",
    sub: "영적 상담을 도와줄 캐릭터를 골라주세요",
  },
  topicSelect: {
    heading: "어떤 운을 살펴드릴까요?",
    sub: "상담 주제를 선택하면 대화가 시작됩니다",
    back: "← 다른 상담사 선택",
  },
} as const;
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/ui-copy.ts
git commit -m "feat: UI 마이크로카피 중앙화 데이터 파일 추가"
```

---

### Task 3: 타로 페이지 마이크로카피 적용

**Files:**
- Modify: `src/app/tarot/page.tsx`

- [ ] **Step 1: import 추가**

`src/app/tarot/page.tsx` 최상단 import 블록에 추가:

```ts
import { TAROT_COPY } from "@/data/ui-copy";
```

- [ ] **Step 2: `CharacterSelectStep` 헤딩 텍스트 교체**

교체 전:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2 drop-shadow-md">상담사를 선택해주세요</h2>
<p className="text-arcana-muted text-sm md:text-base drop-shadow-sm">각 상담사마다 다른 스타일의 리딩을 제공합니다</p>
```

교체 후:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2 drop-shadow-md">{TAROT_COPY.characterSelect.heading}</h2>
<p className="text-arcana-muted text-sm md:text-base drop-shadow-sm">{TAROT_COPY.characterSelect.sub}</p>
```

- [ ] **Step 3: `TopicSelectStep` 텍스트 교체**

교체 전:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  ← 다른 상담사 선택
</button>
<h3 className="font-sans font-bold text-base md:text-lg mb-4 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h3>
```

교체 후:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  {TAROT_COPY.back.character}
</button>
<h3 className="font-sans font-bold text-base md:text-lg mb-4 drop-shadow-md">{TAROT_COPY.topicSelect.heading}</h3>
```

- [ ] **Step 4: `SpreadSelectStep` 텍스트 교체**

교체 전:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  ← 주제 다시 선택
</button>
<h3 className="font-sans font-bold text-base md:text-lg mb-2 drop-shadow-md">카드 리딩 방식을 선택해주세요</h3>
<p className="text-arcana-muted text-xs mb-4">카드 수가 많을수록 더 깊이 있는 해석을 받을 수 있어요</p>
```

교체 후:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  {TAROT_COPY.back.topic}
</button>
<h3 className="font-sans font-bold text-base md:text-lg mb-2 drop-shadow-md">{TAROT_COPY.spreadSelect.heading}</h3>
<p className="text-arcana-muted text-xs mb-4">{TAROT_COPY.spreadSelect.sub}</p>
```

그리고 UserInfo 버튼 텍스트:

교체 전:
```tsx
<span className="inline-flex items-center gap-1"><Icon id="ui-info" size={14} /> 개인정보 입력하고 더 정확한 리딩 받기 (선택)</span>
```

교체 후:
```tsx
<span className="inline-flex items-center gap-1"><Icon id="ui-info" size={14} /> {TAROT_COPY.spreadSelect.userInfoBtn}</span>
```

- [ ] **Step 5: 타입 체크 및 빌드 검증**

```bash
pnpm type-check && pnpm build
```

Expected: 0 errors, `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add src/app/tarot/page.tsx
git commit -m "style: 타로 페이지 감성 마이크로카피 적용"
```

---

### Task 4: 사주 페이지 마이크로카피 적용

**Files:**
- Modify: `src/app/saju/page.tsx`

- [ ] **Step 1: import 추가**

`src/app/saju/page.tsx` 최상단 import 블록에 추가:

```ts
import { SAJU_COPY } from "@/data/ui-copy";
```

- [ ] **Step 2: `CharacterSelectStep` 헤딩 텍스트 교체**

교체 전:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2">사주 상담사를 선택해주세요</h2>
<p className="text-arcana-muted text-sm md:text-base">사주명리학 전문 상담을 받아보세요</p>
```

교체 후:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2">{SAJU_COPY.characterSelect.heading}</h2>
<p className="text-arcana-muted text-sm md:text-base">{SAJU_COPY.characterSelect.sub}</p>
```

- [ ] **Step 3: `SajuSelectStep` 텍스트 교체**

교체 전:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  ← 정보 수정
</button>
```

교체 후:
```tsx
<button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
  {SAJU_COPY.back.info}
</button>
```

그리고 시작 버튼 텍스트:

교체 전:
```tsx
{canStart ? "사주 분석 시작하기 →" : "시간단위와 분석영역을 선택해주세요"}
```

교체 후:
```tsx
{canStart ? SAJU_COPY.startButton.active : SAJU_COPY.startButton.inactive}
```

- [ ] **Step 4: 타입 체크 및 빌드 검증**

```bash
pnpm type-check && pnpm build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/saju/page.tsx
git commit -m "style: 사주 페이지 감성 마이크로카피 적용"
```

---

### Task 5: 신점 페이지 마이크로카피 적용

**Files:**
- Modify: `src/app/shinjeom/page.tsx`

- [ ] **Step 1: import 추가**

`src/app/shinjeom/page.tsx` 최상단 import 블록에 추가:

```ts
import { SHINJEOM_COPY } from "@/data/ui-copy";
```

- [ ] **Step 2: `CharacterSelectStep` 헤딩 교체**

교체 전:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-center mb-2 drop-shadow-md">
  신점 상담사를 선택하세요
</h2>
<p className="text-arcana-muted text-sm text-center mb-6">영적 상담을 도와줄 캐릭터를 골라주세요</p>
```

교체 후:
```tsx
<h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-center mb-2 drop-shadow-md">
  {SHINJEOM_COPY.characterSelect.heading}
</h2>
<p className="text-arcana-muted text-sm text-center mb-6">{SHINJEOM_COPY.characterSelect.sub}</p>
```

- [ ] **Step 3: `TopicSelectStep` 텍스트 교체**

교체 전:
```tsx
<button onClick={onBack} className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-6">
  ← 다른 상담사 선택
</button>
<h3 className="font-display font-bold text-lg mb-2 drop-shadow-md">어떤 점을 봐드릴까요?</h3>
<p className="text-arcana-muted text-xs mb-6">상담 주제를 선택하면 대화가 시작됩니다</p>
```

교체 후:
```tsx
<button onClick={onBack} className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-6">
  {SHINJEOM_COPY.topicSelect.back}
</button>
<h3 className="font-display font-bold text-lg mb-2 drop-shadow-md">{SHINJEOM_COPY.topicSelect.heading}</h3>
<p className="text-arcana-muted text-xs mb-6">{SHINJEOM_COPY.topicSelect.sub}</p>
```

- [ ] **Step 4: 타입 체크 및 빌드 검증**

```bash
pnpm type-check && pnpm build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/shinjeom/page.tsx
git commit -m "style: 신점 페이지 감성 마이크로카피 적용"
```

---

### Task 6: 카드 호버 3D 틸팅 효과

**Files:**
- Modify: `src/components/card/CardItem.tsx`

이 태스크는 마우스 위치를 기반으로 `rotateX` / `rotateY`를 계산해 카드에 실시간 3D 틸트를 부여한다. 카드가 뒤집힌 상태(`isFlipped: true`)에는 틸트를 비활성화한다.

- [ ] **Step 1: import 교체**

교체 전:
```tsx
import { motion } from "framer-motion";
```

교체 후:
```tsx
import { motion, useMotionValue, useTransform } from "framer-motion";
```

- [ ] **Step 2: 컴포넌트 내부에 모션 값 및 핸들러 추가**

`export function CardItem(...)` 함수 바디 안, `const useCustomSize = ...` 줄 바로 아래에 삽입:

```tsx
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }
```

- [ ] **Step 3: 최외부 `motion.div`에 핸들러·스타일 적용**

교체 전:
```tsx
    <motion.div
      onClick={onClick}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${useCustomSize ? "" : sizeClasses[size]} ${className}`}
      style={{ perspective: "1000px", ...(useCustomSize ? { width, height } : {}) }}
    >
```

교체 후:
```tsx
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${useCustomSize ? "" : sizeClasses[size]} ${className}`}
      style={{
        perspective: "1000px",
        rotateX: isFlipped ? undefined : rotateX,
        rotateY: isFlipped ? undefined : rotateY,
        ...(useCustomSize ? { width, height } : {}),
      }}
    >
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 5: 기존 테스트 통과 확인**

```bash
pnpm test:coverage
```

Expected: 672 tests pass, ≥98% statements, ≥92% branches.

- [ ] **Step 6: 빌드 확인**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add src/components/card/CardItem.tsx
git commit -m "feat: 타로 카드 호버 3D 틸팅 효과 추가"
```

---

### Task 7: 최종 통합 검증 및 PR 생성

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 검증 실행**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage && pnpm build
```

Expected: 모든 명령 성공.

- [ ] **Step 2: PR 생성**

```bash
git push -u origin HEAD
gh pr create \
  --title "style: Phase 1 UI 활성화 — 서비스 색상 팔레트·마이크로카피·카드 3D 틸팅" \
  --body "$(cat <<'EOF'
## Summary
- `globals.css`: 타로(indigo/gold)·사주(amber/jade)·신점(crimson) 서비스별 CSS 색상 변수 추가
- `src/data/ui-copy.ts`: 3개 서비스 감성 마이크로카피 중앙화 (기존 딱딱한 문구 → 따뜻한 관계 언어)
- `CardItem.tsx`: 마우스 위치 기반 `rotateX`/`rotateY` 3D 틸팅 추가 (뒤집힌 상태 비활성화)

## Test plan
- [ ] `pnpm type-check` 0 errors
- [ ] `pnpm lint` 0 warnings
- [ ] `pnpm test:coverage` 672 tests pass, coverage ≥98%
- [ ] `pnpm build` 성공
- [ ] 타로·사주·신점 캐릭터 선택 화면에서 새 문구 확인
- [ ] 타로 카드 호버 시 3D 틸팅 동작 확인 (Desktop Chrome)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 구현 후 체크리스트

| 항목 | 확인 방법 |
|------|----------|
| CSS 변수 적용 | DevTools에서 `--color-tarot-primary` 값 확인 |
| 마이크로카피 | 타로/사주/신점 페이지 캐릭터 선택 화면 |
| 3D 틸팅 | 타로 세션 화면에서 카드 위에 마우스 올리기 |
| 모바일 정상 | iOS/Android — 틸팅 없이 일반 hover 동작 |
| 기존 기능 무결 | 카드 뒤집기, 스프레드 선택 정상 동작 |
