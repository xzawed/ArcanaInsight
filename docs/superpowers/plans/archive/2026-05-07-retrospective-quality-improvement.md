# 회고 기반 품질 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3-에이전트 교차 회고에서 발견된 11개 품질 이슈를 Phase별로 해결하여 신점 세션 영구 멈춤 버그 제거, 코드 일관성 확보, 테스트 커버리지 완성.

**Architecture:** Phase 1(즉시 버그) → Phase 2(코드 품질) → Phase 3(중기 개선) 순으로 진행. 각 Phase는 독립 PR. Phase 1이 가장 높은 사용자 영향(신점 무한 로딩)을 가짐.

**Tech Stack:** Next.js App Router, TypeScript strict, React 19, Zustand v5, Playwright, Vitest

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)
- [x] SSR/Hydration: useState 초기값·useEffect setState 패턴 — useRef 추가 시 SSR safe (ref는 서버/클라이언트 동일)
- [x] UI 텍스트 변경 없음 → E2E 셀렉터 영향 없음 (testid 추가만)
- [x] AbortController는 브라우저 전용 → "use client" 컴포넌트에서만 사용, 안전

---

## 파일 변경 맵

| Task | 변경 파일 | 유형 |
|------|----------|------|
| Task 1 | `src/app/shinjeom/session/page.tsx` | Modify (핵심) |
| Task 2 | `src/app/saju/session/page.tsx` | Modify (2행 추가) |
| Task 3 | `src/components/layout/ThemeDropdown.tsx`, `e2e/theme.spec.ts` | Modify |
| Task 4 | `src/components/card/CardSpread.tsx` | Modify |
| Task 5 | `src/app/saju/page.tsx`, `src/app/shinjeom/page.tsx` | Modify |
| Task 6 | `e2e/shinjeom-flow.spec.ts` | Modify |
| Task 7 | `src/__tests__/lib/character-context.test.ts` | Create/Modify |
| Task 8 | `src/components/character/CharacterDisplay.tsx`, `src/components/chat/DialogueBox.tsx` | Modify |
| Task 9 | `src/app/tarot/session/page.tsx` | Modify |

---

## Phase 1 — 즉시 (버그 수정)

### Task 1: 신점 세션 AbortController + fetchSSEStream 전환

**맥락:** 신점 세션(`src/app/shinjeom/session/page.tsx`)은 현재 자체 구현한 `drainSseChunks()`로 SSE를 처리하며 AbortController·180s 타임아웃이 없다. AI 무응답 시 `isLoading=true` 영구 멈춤. 타로·사주는 PR-3에서 수정되었으나 신점은 누락됨.

`fetchSSEStream` 인터페이스:
```typescript
fetchSSEStream({
  url: string;
  body: Record<string, unknown>;
  onChunk: (chunk: string, fullText: string) => void;  // chunk는 string, Record 아님
  onDone: (data: Record<string, unknown>) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
})
```

**Files:**
- Modify: `src/app/shinjeom/session/page.tsx`

- [x] **Step 1: import 수정 — fetchSSEStream 추가, 로컬 함수 제거**

파일 상단의 import 블록에 추가:
```typescript
import { fetchSSEStream } from "@/hooks/useSSEStream";
```

파일에서 아래 두 로컬 함수 **전체 삭제** (L41~L69):
```typescript
function parseSseLine(line: string): Record<string, unknown> | null { ... }
async function drainSseChunks(...): Promise<void> { ... }
```

- [x] **Step 2: readingAbortRef 추가 + cleanup useEffect**

`ShinjeomSessionPage` 컴포넌트 내부, `redirectedRef` 선언 직후에 추가:
```typescript
const readingAbortRef = useRef<AbortController | null>(null);
```

기존 채팅 스크롤 `useEffect` 바로 뒤에 cleanup effect 추가:
```typescript
useEffect(() => {
  return () => { readingAbortRef.current?.abort(); };
}, []);
```

- [x] **Step 3: handleSend 전체 교체**

기존 `const handleSend = async () => { ... }` (L129~L177) 전체를 아래로 교체:

```typescript
const handleSend = () => {
  const message = inputText.trim();
  if (!message || isLoading) return;

  setInputText("");
  setLoading(true);
  setMood("mystical");

  const messageIndex = useShinjeomSessionStore.getState().chatMessages.length;
  addChatMessage({ id: crypto.randomUUID(), role: "user", content: message, timestamp: new Date() });
  incrementTurn();

  const msgId = crypto.randomUUID();
  addChatMessage({ id: msgId, role: "character", content: "", mood: "mystical", timestamp: new Date() });

  const abortController = new AbortController();
  readingAbortRef.current = abortController;
  let finished = false;

  const timeoutId = setTimeout(() => {
    if (finished) return;
    finished = true;
    abortController.abort();
    updateMessageContent(msgId, getErrorMsg(characterId, "api"));
    setMood("default");
    setLoading(false);
  }, 180_000);

  void fetchSSEStream({
    url: "/api/shinjeom/message",
    signal: abortController.signal,
    body: {
      sessionId: useShinjeomSessionStore.getState().sessionId,
      topic, characterId,
      currentMessage: message,
      chatHistory: useShinjeomSessionStore.getState().chatMessages,
      isFinalTurn: false,
      messageIndex,
    },
    onChunk: (_chunk, fullText) => {
      updateMessageContent(msgId, fullText);
    },
    onDone: () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      setLoading(false);
    },
    onError: () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
      setMood("default");
      setLoading(false);
    },
  }).then(() => {
    if (!finished) clearTimeout(timeoutId);
  });
};
```

- [x] **Step 4: handleEndConsultation 전체 교체**

기존 `const handleEndConsultation = async () => { ... }` (L179~L233) 전체를 아래로 교체:

```typescript
const handleEndConsultation = () => {
  if (turnCount < 1 || isLoading) return;

  setLoading(true);
  setMood("mystical");

  const currentChatMessages = useShinjeomSessionStore.getState().chatMessages;
  const msgId = crypto.randomUUID();
  addChatMessage({
    id: msgId, role: "character",
    content: translate("shinjeom.session.msg.preparing-result", locale),
    mood: "mystical", timestamp: new Date(),
  });

  const abortController = new AbortController();
  readingAbortRef.current = abortController;
  let finished = false;

  const timeoutId = setTimeout(() => {
    if (finished) return;
    finished = true;
    abortController.abort();
    updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
    setMood("default");
    setLoading(false);
  }, 180_000);

  void fetchSSEStream({
    url: "/api/shinjeom/message",
    signal: abortController.signal,
    body: {
      sessionId: useShinjeomSessionStore.getState().sessionId,
      topic, characterId,
      currentMessage: undefined,
      chatHistory: currentChatMessages,
      isFinalTurn: true,
      messageIndex: currentChatMessages.length,
    },
    onChunk: () => { /* 신점 최종 결과는 done 이벤트로 수신 */ },
    onDone: (data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      const result = data.result as { parseError?: string } | undefined;
      if (!result || result.parseError) {
        if (result?.parseError) console.warn("[shinjeom-session] 결과 표시 불가:", { parseError: result.parseError });
        updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
        setMood("default");
        setLoading(false);
        return;
      }
      removeMessage(msgId);
      setReadingResult(data.result as Parameters<typeof setReadingResult>[0]);
      setPhase("result");
      setMood(CHARACTER_RESULT_MOODS[characterId ?? ""] ?? "smile");
      setLoading(false);
    },
    onError: () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      updateMessageContent(msgId, getErrorMsg(characterId, "reading"));
      setMood("default");
      setLoading(false);
    },
  }).then(() => {
    if (!finished) clearTimeout(timeoutId);
  });
};
```

- [x] **Step 5: 타입 검사 + 린트**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm type-check && pnpm lint
```

Expected: 에러 없음. `parseSseLine`·`drainSseChunks` 미사용 경고가 남아 있다면 Step 1을 다시 확인.

- [x] **Step 6: 개발 서버에서 수동 검증**

```bash
pnpm dev
```

브라우저에서 `/shinjeom` → 캐릭터·주제 선택 → 세션 페이지 진입:
1. 메시지 입력 후 전송 → 캐릭터 응답 스트리밍 확인
2. "결과 받기" 클릭 → 결과 화면 전환 확인
3. DevTools → Network → `/api/shinjeom/message` 요청이 Pending 없이 완료되는지 확인

- [x] **Step 7: 커밋**

```bash
git checkout -b fix/shinjeom-abort-controller
git add src/app/shinjeom/session/page.tsx
git commit -m "fix(shinjeom): AbortController + 180s 타임아웃 적용 — fetchSSEStream 전환"
```

---

### Task 2: 사주 세션 AbortController ref 보관

**맥락:** `src/app/saju/session/page.tsx`의 `startReading()`은 cleanup 함수를 반환하지만 `useEffect`에서 이 반환값이 무시된다. 컴포넌트 언마운트 시 진행 중 fetch가 abort되지 않아 경고·메모리 누수 가능.

**Files:**
- Modify: `src/app/saju/session/page.tsx`

- [x] **Step 1: readingAbortRef 추가**

`resultContainerRef` 선언(L94) 바로 아래에 추가:
```typescript
const readingAbortRef = useRef<AbortController | null>(null);
```

- [x] **Step 2: startReading 내 abortController ref 저장**

`startReading()` 함수 내부(L143), `const abortController = new AbortController();` 바로 다음 줄에 추가:
```typescript
readingAbortRef.current = abortController;
```

- [x] **Step 3: cleanup useEffect 추가**

스크롤 `useEffect`(L217) 바로 뒤에 추가:
```typescript
useEffect(() => {
  return () => { readingAbortRef.current?.abort(); };
}, []);
```

- [x] **Step 4: 타입 검사 + 커밋**

```bash
pnpm type-check && pnpm lint
git add src/app/saju/session/page.tsx
git commit -m "fix(saju): AbortController useRef 보관 — 언마운트 cleanup 보장"
```

---

## Phase 2 — 단기 (코드 품질)

### Task 3: ThemeDropdown auto 버튼 data-testid 추가

**맥락:** `ThemeDropdown.tsx`에서 7개 테마 버튼은 `theme-option-${id}` testid를 가지지만 auto 버튼(L33)은 없다. `e2e/theme.spec.ts`에서 `text=자동 (시간/계절)` 셀렉터를 사용 중 — i18n 변경 시 파손됨.

**Files:**
- Modify: `src/components/layout/ThemeDropdown.tsx:33`
- Modify: `e2e/theme.spec.ts`

- [x] **Step 1: ThemeDropdown auto 버튼에 testid 추가**

`src/components/layout/ThemeDropdown.tsx` L33~L44의 `<button` 여는 태그에 속성 추가:
```typescript
<button
  data-testid={isDesktop ? "theme-option-auto" : "mobile-theme-option-auto"}
  onClick={() => { setMode("auto"); onClose(); }}
  className={...}
>
```

- [x] **Step 2: e2e/theme.spec.ts 셀렉터 업데이트**

`e2e/theme.spec.ts`에서 auto 버튼을 `text=` 셀렉터로 참조하는 부분을 검색:
```bash
grep -n "자동" e2e/theme.spec.ts
```

찾은 모든 `text=자동 (시간/계절)` 패턴을 `[data-testid='theme-option-auto']` 또는 `[data-testid='mobile-theme-option-auto']`로 교체. 데스크탑(1280px viewport) 컨텍스트는 `theme-option-auto`, 모바일(390px) 컨텍스트는 `mobile-theme-option-auto`.

- [x] **Step 3: 타입 검사 + 커밋**

```bash
pnpm type-check && pnpm lint
git add src/components/layout/ThemeDropdown.tsx e2e/theme.spec.ts
git commit -m "fix(e2e): ThemeDropdown auto 버튼 data-testid 추가 — i18n 독립 셀렉터"
```

---

### Task 4: CardSpread labelKo → getPositionLabel i18n 적용

**맥락:** `src/components/card/CardSpread.tsx` L176, L188에서 `pos.labelKo`를 하드코딩 사용. en/ja 사용자에게 카드 위치 라벨이 항상 한국어로 표시됨. `getPositionLabel(pos, locale)` 함수가 이미 `src/data/spreads/index.ts`에 존재하며 타로 세션 페이지에서 사용 중.

**Files:**
- Modify: `src/components/card/CardSpread.tsx`

- [x] **Step 1: import 추가**

파일 상단 import 블록에 추가 (기존 `hexToRgbBase` import 아래):
```typescript
import { getPositionLabel } from "@/data/spreads";
import { useLocaleStore } from "@/hooks/useLocaleStore";
```

- [x] **Step 2: locale 구독 추가**

`CardSpread` 컴포넌트 함수 내부 최상단 (기존 `const containerRef = useRef...` 바로 위)에 추가:
```typescript
const locale = useLocaleStore((s) => s.locale);
```

- [x] **Step 3: pos.labelKo 두 곳 교체**

L176 (카드 공개 후 라벨):
```typescript
// 변경 전
{pos.labelKo}
// 변경 후
{getPositionLabel(pos, locale)}
```

L188 (카드 미선택 플레이스홀더 라벨):
```typescript
// 변경 전
{pos.labelKo}
// 변경 후
{getPositionLabel(pos, locale)}
```

- [x] **Step 4: 타입 검사 + 수동 검증**

```bash
pnpm type-check && pnpm lint
```

브라우저 `/tarot` → 상담사·주제·스프레드 선택 → 카드 선택 화면: 위치 라벨이 정상 표시되는지 확인.

- [x] **Step 5: 커밋**

```bash
git add src/components/card/CardSpread.tsx
git commit -m "fix(i18n): CardSpread 위치 라벨 locale 적용 — labelKo 하드코딩 제거"
```

---

### Task 5: saju/shinjeom 버튼 data-testid 표준화

**맥락:** PR-9에서 타로 페이지에 `topic-btn-*`, `spread-btn-*` testid가 추가되었지만 사주·신점 페이지의 선택 버튼에는 testid가 없다. E2E 작성 시 텍스트 셀렉터에 의존해야 함.

**Files:**
- Modify: `src/app/saju/page.tsx`
- Modify: `src/app/shinjeom/page.tsx`

- [x] **Step 1: saju/page.tsx 시간 범위 버튼 testid 추가**

`SajuSelectStep` 컴포넌트의 `sajuTimeOptions.map()` 내부 `<button` 태그에 추가:
```typescript
<button
  key={opt.id}
  data-testid={`saju-time-btn-${opt.id}`}
  onClick={() => onTimeSelect(opt.id, !!opt.allowMonthly)}
  ...
>
```

- [x] **Step 2: saju/page.tsx 영역 버튼 testid 추가**

`SajuSelectStep`의 `sajuAreaOptions.map()` 내부 `<button` 태그에 추가:
```typescript
<button
  key={opt.id}
  data-testid={`saju-area-btn-${opt.id}`}
  onClick={() => onAreaSelect(opt.id)}
  ...
>
```

- [x] **Step 3: shinjeom/page.tsx 주제 버튼 testid 추가**

`TopicSelectStep`의 `TOPIC_CONFIGS.map()` 내부 `<motion.button` 태그에 추가:
```typescript
<motion.button
  key={topic.id}
  data-testid={`shinjeom-topic-btn-${topic.id}`}
  ...
>
```

- [x] **Step 4: 타입 검사 + 커밋**

```bash
pnpm type-check && pnpm lint
git add src/app/saju/page.tsx src/app/shinjeom/page.tsx
git commit -m "feat(e2e): saju/shinjeom 선택 버튼 data-testid 표준화"
```

---

## Phase 3 — 중기 (개선)

### Task 6: 신점 E2E 세션 플로우 추가

**맥락:** `e2e/shinjeom-flow.spec.ts`는 캐릭터·주제 선택까지만 검증하며 메시지 전송 → AI 응답 플로우가 없다. Task 1 이후 AbortController가 추가되었으므로 E2E 커버리지도 확보한다.

⚠️ **실 Supabase 인증 세션 필요 — 이 spec은 CI `testIgnore` 대상으로 등록하지 않음** (세션 생성 API는 인증 없이도 동작하고 결과 저장 실패 시 graceful fallback).

**Files:**
- Modify: `e2e/shinjeom-flow.spec.ts`

- [x] **Step 1: 기존 spec 파일 확인**

```bash
cat e2e/shinjeom-flow.spec.ts
```

마지막 `test.describe` 블록 끝에 추가할 위치 파악.

- [x] **Step 2: 메시지 전송 플로우 test 추가**

```typescript
test.describe("신점 세션 — 메시지 전송 플로우", () => {
  test.beforeEach(async ({ page }) => {
    // 신점 세션 진입: 첫 번째 캐릭터 선택 → 첫 번째 주제 선택
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shinjeom");
    await page.waitForLoadState("domcontentloaded");
    // 캐릭터 선택
    const firstChar = page.locator("[data-testid='character-card']").first();
    if (await firstChar.isVisible()) {
      await firstChar.click();
    }
    // 주제 선택
    const firstTopic = page.locator("[data-testid^='shinjeom-topic-btn-']").first();
    await expect(firstTopic).toBeVisible({ timeout: 5000 });
    await firstTopic.click();
    await page.waitForURL("**/shinjeom/session", { timeout: 10000 });
  });

  test("입력창 표시 + 메시지 전송 가능", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeDisabled();

    await input.fill("안녕하세요");
    const sendBtn = page.locator("button:has-text('전송')").first();
    await expect(sendBtn).not.toBeDisabled();
  });

  test("메시지 전송 후 isLoading 해제 (타임아웃 없음)", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await input.fill("오늘 운세는 어때요?");

    const sendBtn = page.locator("button:has-text('전송')").first();
    await sendBtn.click();

    // 전송 후 입력창 비워짐 확인
    await expect(input).toHaveValue("", { timeout: 3000 });

    // 로딩 완료 후 입력 재활성화 (최대 30초 AI 응답 대기)
    await expect(input).not.toBeDisabled({ timeout: 30000 });
  });
});
```

- [x] **Step 3: lint + 커밋**

```bash
pnpm lint
git add e2e/shinjeom-flow.spec.ts
git commit -m "test(e2e): 신점 세션 메시지 전송 플로우 E2E 추가"
```

---

### Task 7: fetchMemoryPrompt 직접 테스트 추가

**맥락:** `src/lib/db/character-context.ts`의 `fetchMemoryPrompt()` 함수가 PR-5에서 추가되었지만 테스트가 없다. `getCurrentUser()` 실패·`null` 반환·최외부 catch 분기가 미커버.

**Files:**
- Modify or Create: `src/__tests__/lib/character-context.test.ts`

- [x] **Step 1: 기존 파일 확인**

```bash
cat src/__tests__/lib/character-context.test.ts 2>/dev/null || echo "file not found"
```

파일이 있으면 기존 `describe` 블록 뒤에 추가. 없으면 새로 생성.

- [x] **Step 2: fetchMemoryPrompt 테스트 추가**

파일에 추가할 내용:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { fetchMemoryPrompt } from "@/lib/db/character-context";

// 모킹 설정
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

describe("fetchMemoryPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("비인증 사용자 → 빈 문자열 반환", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("인증 사용자 + 메모리 없음 → 빈 문자열 반환", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-123" } as Awaited<ReturnType<typeof getCurrentUser>>);
    const mockDb = { query: { characterMemories: { findMany: vi.fn().mockResolvedValue([]) } } };
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
  });

  it("getCurrentUser 예외 → 빈 문자열 반환 (crash 없음)", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("auth error"));
    const result = await fetchMemoryPrompt("arcana", "ko");
    expect(result).toBe("");
  });
});
```

- [x] **Step 3: 실제 fetchMemoryPrompt 시그니처 확인 후 코드 조정**

```bash
cat src/lib/db/character-context.ts | grep -A 10 "fetchMemoryPrompt"
```

함수 시그니처·의존 import 경로를 확인하고 위 테스트 코드의 vi.mock 경로를 실제 경로로 맞춤.

- [x] **Step 4: 테스트 실행**

```bash
pnpm test --reporter=verbose src/__tests__/lib/character-context.test.ts
```

Expected: 3개 테스트 PASS.

- [x] **Step 5: 커밋**

```bash
git add src/__tests__/lib/character-context.test.ts
git commit -m "test: fetchMemoryPrompt 직접 테스트 추가 — getCurrentUser 실패 분기 커버"
```

---

### Task 8: CharacterDisplay·DialogueBox React.memo 적용

**맥락:** PR-10에서 SpriteAnimator, CardDeck, CardSpread에 React.memo를 적용했으나 유사 규모의 `CharacterDisplay`(114줄)·`DialogueBox`(114줄)는 누락. 세션 페이지에서 이 컴포넌트들이 모든 상태 변경 시 재렌더됨.

**Files:**
- Modify: `src/components/character/CharacterDisplay.tsx`
- Modify: `src/components/chat/DialogueBox.tsx`

- [x] **Step 1: CharacterDisplay.tsx 파일 내용 확인**

```bash
head -30 src/components/character/CharacterDisplay.tsx
```

현재 export 방식 확인 (`export function` vs `const` vs 이미 `React.memo`인지).

- [x] **Step 2: CharacterDisplay React.memo 적용**

현재 `export function CharacterDisplay(...)` 형태라면:

```typescript
// 변경 전
export function CharacterDisplay({ character, mood, className }: CharacterDisplayProps) {
  ...
}

// 변경 후
export const CharacterDisplay = React.memo(function CharacterDisplay({ character, mood, className }: CharacterDisplayProps) {
  ...
});
CharacterDisplay.displayName = "CharacterDisplay";
```

파일 상단 import에 `React`가 없으면 추가:
```typescript
import React from "react";
```

- [x] **Step 3: DialogueBox React.memo 적용**

```bash
head -30 src/components/chat/DialogueBox.tsx
```

동일 패턴으로 `React.memo` + `displayName` 적용.

- [x] **Step 4: 타입 검사 + 커밋**

```bash
pnpm type-check && pnpm lint
git add src/components/character/CharacterDisplay.tsx src/components/chat/DialogueBox.tsx
git commit -m "perf(components): CharacterDisplay·DialogueBox React.memo 적용"
```

---

### Task 9: CardSpread loading skeleton 개선

**맥락:** `src/app/tarot/session/page.tsx`의 `next/dynamic`에서 CardSpread는 `loading: () => null`로 설정되어 있어 로딩 중 레이아웃 시프트 발생. CardDeck은 적절한 플레이스홀더를 제공하는 것과 대비됨.

**Files:**
- Modify: `src/app/tarot/session/page.tsx` (CardSpread dynamic import, L23~L27)

- [x] **Step 1: 현재 dynamic import 확인**

```bash
grep -A 4 "CardSpread = dynamic" src/app/tarot/session/page.tsx
```

- [x] **Step 2: CardSpread loading 플레이스홀더 교체**

```typescript
// 변경 전
const CardSpread = dynamic(
  () => import("@/components/card/CardSpread").then((m) => ({ default: m.CardSpread })),
  { loading: () => null },
);

// 변경 후
const CardSpread = dynamic(
  () => import("@/components/card/CardSpread").then((m) => ({ default: m.CardSpread })),
  { loading: () => <div className="w-full flex-1 min-h-[200px] md:min-h-[360px]" /> },
);
```

- [x] **Step 3: 타입 검사 + 커밋**

```bash
pnpm type-check && pnpm lint
git add src/app/tarot/session/page.tsx
git commit -m "perf(ux): CardSpread loading skeleton 추가 — 레이아웃 시프트 방지"
```

---

## 자기 검토 (Self-Review)

### 스펙 커버리지 확인
- [x] Task 1: 신점 AbortController + 180s → 타로/사주와 동일 패턴
- [x] Task 2: 사주 cleanup → readingAbortRef ref 저장
- [x] Task 3: ThemeDropdown auto testid → 데스크탑/모바일 각각
- [x] Task 4: CardSpread labelKo → getPositionLabel locale 적용
- [x] Task 5: saju/shinjeom 버튼 testid 표준화
- [x] Task 6: 신점 E2E 세션 플로우
- [x] Task 7: fetchMemoryPrompt 테스트 (getCurrentUser 실패 분기 포함)
- [x] Task 8: CharacterDisplay·DialogueBox React.memo
- [x] Task 9: CardSpread loading skeleton

### 플레이스홀더 스캔
- Task 7 Step 2의 vi.mock 경로는 실제 파일 확인 후 조정 필수 (Step 3에서 안내)
- Task 8의 현재 export 형태는 파일마다 다를 수 있으므로 Step 1에서 확인 필수

### 타입 일관성
- `fetchSSEStream` onChunk 시그니처: `(chunk: string, fullText: string) => void` — Task 1에서 `(_chunk, fullText)`로 올바르게 사용
- `getPositionLabel(pos, locale)` — `pos: SpreadPosition`, `locale: Locale` — Task 4에서 `useLocaleStore`로 locale 공급

---

## Phase 실행 순서

```
Phase 1 완료 후 → PR-A 머지 → Phase 2 진행
Phase 2 완료 후 → PR-B 머지 → Phase 3 진행
Phase 3 각 Task는 독립 PR 가능
```

Phase 1은 반드시 먼저 배포해야 신점 영구 멈춤 버그가 프로덕션에서 해소됨.
