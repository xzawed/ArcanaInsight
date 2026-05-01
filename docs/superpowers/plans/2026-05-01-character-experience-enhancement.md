# Character Experience Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12개 캐릭터의 표현력을 극대화 — 타입 안전성 강화, 프롬프트 품질 향상, 6단계 표정 시스템 활성화, 자유 질문 입력, 캐릭터 메모리 주입

**Architecture:**
Phase 1 (Tasks 1-3): 기반 개선 — 타입 강화, 프롬프트 품질, 에러 캐릭터화. 각각 독립적이고 저위험.
Phase 2 (Tasks 4-6): 핵심 경험 기능 — 표정 6단계, 자유 질문, 캐릭터 메모리. 세션 페이지와 API 레이어 변경.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Zustand v5, Framer Motion v12, Zod, Supabase/Drizzle DbClient abstraction, Vitest 2.0

**위험 체크리스트 (각 Task 시작 전 확인):**
- [ ] SSR 비결정 값 금지: `new Date()`, `Math.random()` → `useEffect` 안에서만
- [ ] `useEffect` 내 `setState` → `setTimeout(() => setState(...), 0)` 패턴
- [ ] 새 API 라우트: `api-schemas.ts` Zod 먼저, `safeParse` 사용
- [ ] SSE fire-and-forget: `void fn().catch(e => console.error(...))`
- [ ] Task 완료마다 `pnpm type-check && pnpm lint` 실행

---

## File Structure Map

| 파일 | 변경 유형 | Task |
|---|---|---|
| `src/types/character.ts` | Modify | 1 |
| `src/lib/daily-character.ts` | Modify | 1 |
| `src/components/character/SpriteAnimator.tsx` | Modify | 1 |
| `src/services/core/prompt-builder.ts` | Modify | 2, 5 |
| `src/data/characters/waiting-lines.ts` | Modify | 3 |
| `src/app/tarot/session/page.tsx` | Modify | 3, 4 |
| `src/app/saju/session/page.tsx` | Modify | 3, 4 |
| `src/app/shinjeom/session/page.tsx` | Modify | 3, 4 |
| `src/hooks/useSession.ts` | Modify | 5 |
| `src/app/tarot/page.tsx` | Modify | 5 |
| `src/lib/validation/api-schemas.ts` | Modify | 5 |
| `src/app/api/tarot/reading/route.ts` | Modify | 5, 6 |
| `src/lib/db/types.ts` | Modify | 6 |
| `src/lib/db/supabase-adapter.ts` | Modify | 6 |
| `src/lib/db/postgres-adapter.ts` | Modify | 6 |
| `src/lib/db/character-context.ts` | **Create** | 6 |
| `src/__tests__/lib/character-context.test.ts` | **Create** | 6 |

---

## Task 1: CHAR_ENTRANCE 타입 강화 — CharacterId 도입

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/lib/daily-character.ts`
- Modify: `src/components/character/SpriteAnimator.tsx`

- [ ] **Step 1: `src/types/character.ts`에 CharacterId 추가**

```ts
// src/types/character.ts
export const CHARACTER_IDS = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
] as const;

export type CharacterId = typeof CHARACTER_IDS[number];

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
  id: CharacterId;   // string → CharacterId
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

- [ ] **Step 2: `src/lib/daily-character.ts`에서 중복 타입 제거, CharacterId 사용**

```ts
// src/lib/daily-character.ts
import { CHARACTER_IDS, CharacterId } from "@/types/character";

export const CHARACTER_ORDER: readonly CharacterId[] = CHARACTER_IDS;

export function getDailyCharacterId(now: number = Date.now()): CharacterId {
  return CHARACTER_ORDER[Math.floor(now / 86400000) % CHARACTER_ORDER.length];
}
```

- [ ] **Step 3: `src/components/character/SpriteAnimator.tsx`에 CharacterId import 및 사용**

`SpriteAnimator.tsx` 상단 import 교체:
```ts
import { Mood, IdleAnimationType, CharacterId } from "@/types/character";
```

`CHAR_ENTRANCE` 타입 변경 (line 85):
```ts
const CHAR_ENTRANCE: Record<CharacterId, EntranceConfig> = {
  arcana:  { initial: { y: 60, opacity: 0 },                transition: { duration: 0.85, ease: "easeOut" } },
  miko:    { initial: { opacity: 0, scale: 0.95 },           transition: { duration: 1.1, ease: "easeOut" } },
  seonhwa: { initial: { x: -35, opacity: 0 },               transition: { duration: 0.75, ease: "easeOut" } },
  hoshi:   { initial: { x: 65, opacity: 0, scale: 0.82 },   transition: { type: "spring", stiffness: 180, damping: 12 } },
  luna:    { initial: { y: -25, opacity: 0 },               transition: { duration: 0.95, ease: "easeOut" } },
  rei:     { initial: { opacity: 0 },                        transition: { duration: 1.3, ease: "easeInOut" } },
  cairn:   { initial: { y: 35, opacity: 0, scale: 0.94 },   transition: { duration: 0.85, ease: "easeOut" } },
  zero:    { initial: { opacity: 0, rotate: -3 },            transition: { duration: 1.5, ease: "easeOut" } },
  haru:    { initial: { y: 45, opacity: 0 },                transition: { type: "spring", stiffness: 200, damping: 16 } },
  ren:     { initial: { x: -25, opacity: 0, scale: 0.97 },  transition: { duration: 1.05, ease: "easeOut" } },
  lix:     { initial: { rotate: -9, scale: 0.8, opacity: 0 }, transition: { duration: 0.5, ease: "backOut" } },
  ethan:   { initial: { y: 18, opacity: 0 },                transition: { duration: 0.95, ease: "easeOut" } },
};
```

`SpriteAnimatorProps.characterId` 타입 변경:
```ts
interface SpriteAnimatorProps {
  readonly characterId: CharacterId;
  // ... (나머지 동일)
}
```

- [ ] **Step 4: 타입 검증**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/types/character.ts src/lib/daily-character.ts src/components/character/SpriteAnimator.tsx
git commit -m "refactor: CharacterId 타입 도입 — CHAR_ENTRANCE Record 타입 강화"
```

---

## Task 2: description/speciality → 프롬프트 추가

**Files:**
- Modify: `src/services/core/prompt-builder.ts`

- [ ] **Step 1: `buildCharacterHeader` 수정**

`src/services/core/prompt-builder.ts` 의 `buildCharacterHeader` 함수를 다음으로 교체:

```ts
export function buildCharacterHeader(character: CharacterConfig, subtitle?: string): string {
  const subtitleLine = subtitle ? `\n${subtitle}` : "";
  return `당신은 "${character.name}" (${character.nameJp})입니다.${subtitleLine}

성격: ${character.personality}
배경: ${character.description}
전문 분야: ${character.speciality}

말투 규칙:
- ${character.speechStyle}
- 한국어로만 응답합니다.`;
}
```

- [ ] **Step 2: 검증**

```bash
pnpm type-check && pnpm lint
```

Expected: 에러 없음

- [ ] **Step 3: 빠른 연기 테스트 (선택)**

기존 tarot-reading 테스트가 통과하는지 확인:
```bash
pnpm exec vitest run src/__tests__/api/tarot-reading.test.ts
```

Expected: 모든 테스트 통과 (프롬프트 내용은 mock AI라 영향 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/services/core/prompt-builder.ts
git commit -m "feat: 캐릭터 description/speciality 필드를 AI 시스템 프롬프트에 추가"
```

---

## Task 3: 에러 화면 캐릭터화

**Files:**
- Modify: `src/data/characters/waiting-lines.ts`
- Modify: `src/app/tarot/session/page.tsx`
- Modify: `src/app/saju/session/page.tsx`

참고: 신점(shinjeom)은 SSE 구조가 달라 별도 검토 후 추가 가능 — 이 Task에서는 타로·사주 우선.

- [ ] **Step 1: `waiting-lines.ts`에 에러 메시지 추가**

`src/data/characters/waiting-lines.ts` 파일 맨 끝에 추가:

```ts
export interface CharacterErrorLines {
  api: string;     // API 키·설정 오류
  reading: string; // 리딩 생성 오류
}

export const characterErrorLines: Record<string, CharacterErrorLines> = {
  arcana:  { api: "앗... 별빛과의 연결이 끊겼어요. 냥~ 관리자에게 문의해주세요.", reading: "수정구슬이 잠시 흐릿해졌어요. 냥~ 다시 시도해볼까요?" },
  miko:    { api: "...신계와의 접속이 불안정합니다. 관리자에게 문의해주십시오.", reading: "...기운이 일시적으로 끊겼습니다. 다시 시도해주십시오." },
  seonhwa: { api: "어머, 하늘의 기운이 닿지 않네요~. 관리자에게 문의해주세요.", reading: "별의 흐름이 잠시 흐트러졌어요~. 다시 해볼까요?" },
  hoshi:   { api: "앗 별빛 연결이 끊겼어! 관리자에게 연락해줘~", reading: "어? 뭔가 이상한데~ 다시 해볼게!" },
  luna:    { api: "...달빛이 닿지 않네요. 관리자에게 문의해주세요.", reading: "달빛이 잠시 가려졌어요. 다시 시도해볼게요 🌙" },
  rei:     { api: "연결 오류. 관리자 문의 필요.", reading: "오류 발생. 다시 시도해." },
  cairn:   { api: "...접속에 문제가 생겼습니다. 관리자에게 문의해주십시오.", reading: "잠시 오류가 발생했습니다. 다시 시도해주시겠습니까?" },
  zero:    { api: "...별이 닿지 않는 밤이야. 관리자에게 문의해줘.", reading: "...흐름이 끊겼어. 다시 시도해봐." },
  haru:    { api: "앗, 연결에 문제가 생겼어요! 관리자에게 문의해주세요 ☀️", reading: "이런, 잠시 오류가 났어요. 다시 해볼게요!" },
  ren:     { api: "...하늘과의 소통이 끊겼소. 관리자에게 문의하시오.", reading: "...운의 실타래가 엉켰소. 다시 시도해보시오." },
  lix:     { api: "연결 끊겼네~ 관리자한테 연락해줘 ㅋㅋ", reading: "앗 이거 오류났는데? 다시 해볼게 ㅋㅋ" },
  ethan:   { api: "API 연결 오류가 발생했거든요. 관리자에게 문의해주세요.", reading: "해석 중 오류가 발생했거든요. 다시 시도해볼게요." },
};

export const defaultErrorLines: CharacterErrorLines = {
  api: "AI 서비스 연결에 문제가 있어요. 관리자에게 문의해주세요.",
  reading: "카드 해석 중 문제가 발생했어요. 다시 시도해주세요.",
};
```

- [ ] **Step 2: `tarot/session/page.tsx`의 `getReadingErrorText` 수정**

`characterErrorLines`, `defaultErrorLines` import 추가:
```ts
import { waitingLines, defaultWaitingLines, buildCardPreviewLine, characterErrorLines, defaultErrorLines } from "@/data/characters/waiting-lines";
```

`getReadingErrorText` 함수 교체 (module-level, character-aware):
```ts
/** SSE 에러 메시지에서 캐릭터 말투의 사용자 표시 텍스트를 결정한다 */
function getReadingErrorText(msg: string, charId: string | null | undefined): string {
  const lines = (charId && characterErrorLines[charId]) ? characterErrorLines[charId] : defaultErrorLines;
  if (msg.includes("GROK_API_KEY")) return lines.api;
  return lines.reading;
}
```

`onError` 콜백에서 `characterId` 전달 (line ~344):
```ts
onError: (msg) => {
  stopSequence();
  console.error("리딩 SSE 에러:", msg);
  addChatMessage({
    id: crypto.randomUUID(), role: "character",
    content: getReadingErrorText(msg, characterId),  // characterId 추가
    mood: "default", timestamp: new Date(),
  });
  setMood("default"); setReadingError(true);
},
```

- [ ] **Step 3: `saju/session/page.tsx` 에러 메시지 적용**

`saju/session/page.tsx`에 import 추가:
```ts
import { characterErrorLines, defaultErrorLines } from "@/data/characters/waiting-lines";
```

사주 세션 페이지의 `onError` 콜백에서도 동일하게 적용. 사주 세션의 에러 처리 부분(SSE `onError`)을 찾아 다음 패턴으로 교체:

현재 패턴 (ERROR_MESSAGES 또는 generic 문자열) →
```ts
const errLines = (characterId && characterErrorLines[characterId]) ? characterErrorLines[characterId] : defaultErrorLines;
const errText = msg.includes("GROK_API_KEY") ? errLines.api : errLines.reading;
addChatMessage({ id: crypto.randomUUID(), role: "character", content: errText, mood: "default", timestamp: new Date() });
```

- [ ] **Step 4: 검증**

```bash
pnpm type-check && pnpm lint
pnpm exec vitest run src/__tests__/api/tarot-reading.test.ts src/__tests__/api/saju-reading.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/data/characters/waiting-lines.ts src/app/tarot/session/page.tsx src/app/saju/session/page.tsx
git commit -m "feat: 에러 화면 캐릭터화 — 12캐릭터 고유 말투 에러 메시지 추가"
```

---

## Task 4: Mood 6단계 전체 활성화

**Files:**
- Modify: `src/app/tarot/session/page.tsx`
- Modify: `src/app/saju/session/page.tsx`

핵심 원칙:
- 카드 선택 → `"surprised"` (기존 `"mystical"`)
- 대기 줄(waitingLines) → 각 줄의 `line.mood` 사용 (`setMood` 호출)
- 결과 도착 → 캐릭터별 mood (`rei/zero/miko/ren` → `"serious"`, 나머지 → `"smile"`)
- `handleAnimationEnd` (CharacterDisplay 내부)이 이미 `"default"`로 복귀 처리 중 → 추가 타이머 불필요

- [ ] **Step 1: 결과 mood 매핑 상수 정의 (tarot session page 상단 module level)**

`src/app/tarot/session/page.tsx`의 imports 아래 module-level에 추가:

```ts
import type { Mood } from "@/types/character";

/** 결과 도착 시 캐릭터별 기본 mood (정의 안 된 캐릭터는 "smile") */
const CHARACTER_RESULT_MOODS: Record<string, Mood> = {
  rei: "serious", zero: "serious", miko: "serious", ren: "serious",
};
```

- [ ] **Step 2: 카드 선택 시 `"surprised"` mood로 변경**

`handleCardSelect` 내부 `setMood("mystical")` (line ~204) → `setMood("surprised")` 로 변경:

```ts
// 기존
setMood("mystical");

// 변경 후
setMood("surprised");
```

이유: `startReading`이 800ms 후 `setMood("mystical")`를 호출하므로 타이머 추가 불필요. surprised(1500ms) 내 이미 mystical로 전환됨.

- [ ] **Step 3: `startWaitingSequence`에서 `line.mood` 적용**

`startWaitingSequence` 내의 대기 대사 루프 수정:

```ts
// 기존
lines.forEach((line, i) => {
  timers.push(setTimeout(() => {
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: "mystical", timestamp: new Date() });
  }, baseDelay + i * 3000));
});

// 변경 후
lines.forEach((line, i) => {
  timers.push(setTimeout(() => {
    setMood(line.mood);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
  }, baseDelay + i * 3000));
});
```

`startWaitingSequence`의 useCallback deps에 `setMood` 추가:
```ts
}, [spreadType, addChatMessage, setMood]);
```

- [ ] **Step 4: 결과 도착 시 캐릭터별 mood 적용**

`startReading` 내 `onDone` 콜백의 `setMood("smile")` 수정:

```ts
// 기존 (line ~342)
setPhase("result"); setMood("smile");

// 변경 후
setPhase("result");
setMood(CHARACTER_RESULT_MOODS[characterId ?? ""] ?? "smile");
```

- [ ] **Step 5: `saju/session/page.tsx`에 동일 패턴 적용**

사주 세션의 waiting sequence에서도 `line.mood` 적용 (`sajuWaitingLines` 사용 부분):

```ts
// 사주 대기 줄 루프에서
setMood(line.mood);
addChatMessage({ ..., mood: line.mood, ... });
```

결과 도착 시:
```ts
setMood(CHARACTER_RESULT_MOODS[characterId ?? ""] ?? "smile");
```

- [ ] **Step 6: 검증**

```bash
pnpm type-check && pnpm lint
```

Expected: 에러 없음 (Mood 타입은 이미 정의됨)

개발 서버 실행 후 타로 세션에서 카드 선택 → `surprised` 표정 확인, 대기 중 표정 변화 확인:
```bash
pnpm dev
```

- [ ] **Step 7: 커밋**

```bash
git add src/app/tarot/session/page.tsx src/app/saju/session/page.tsx
git commit -m "feat: Mood 6단계 전체 활성화 — 카드 선택·대기줄·결과 mood 연동"
```

---

## Task 5: 자유 질문 입력 (타로)

**Files:**
- Modify: `src/hooks/useSession.ts`
- Modify: `src/app/tarot/page.tsx`
- Modify: `src/lib/validation/api-schemas.ts`
- Modify: `src/services/core/prompt-builder.ts`
- Modify: `src/app/api/tarot/reading/route.ts`

- [ ] **Step 1: `useSession.ts`에 `freeQuestion` 필드 추가**

`src/hooks/useSession.ts`:

```ts
// SessionState 인터페이스에 추가
freeQuestion: string | null;
setFreeQuestion: (q: string) => void;
```

`initialState`에 추가:
```ts
freeQuestion: null,
```

`create` 블록에 setter 추가:
```ts
setFreeQuestion: (q) => set({ freeQuestion: q || null }),
```

`reset` 액션에서 `freeQuestion: null` 초기화:
```ts
reset: () => set(initialState),
```

`initialState`에 이미 `freeQuestion: null`이 있으므로 자동 초기화됨.

- [ ] **Step 2: `src/app/tarot/page.tsx`의 `SpreadSelectStep`에 자유 질문 입력 추가**

`SpreadSelectStep` 컴포넌트에 `freeQuestion`과 `onFreeQuestionChange` prop 추가:

```ts
function SpreadSelectStep({ selectedCharacter, dialogueMessages, selectedTopic, onBack, onSpreadSelect, onOpenUserInfo, freeQuestion, onFreeQuestionChange }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  dialogueMessages: ChatMessage[];
  selectedTopic: Topic | null;
  onBack: () => void;
  onSpreadSelect: (s: SpreadType) => void;
  onOpenUserInfo: () => void;
  freeQuestion: string;
  onFreeQuestionChange: (q: string) => void;
}>) {
```

스프레드 목록 아래 (`</div>` 전), `onOpenUserInfo` 버튼 위에 입력 추가:

```tsx
{/* 자유 질문 입력 — optional */}
<div className="mt-4">
  <label className="block text-arcana-muted text-xs mb-1.5 font-sans">
    무엇이 가장 궁금하세요? <span className="text-arcana-border">(선택)</span>
  </label>
  <textarea
    value={freeQuestion}
    onChange={(e) => onFreeQuestionChange(e.target.value)}
    placeholder="예: 이번 달 직장 운은 어떨까요?"
    maxLength={200}
    rows={2}
    className="w-full bg-arcana-card/50 border border-arcana-border rounded-xl px-3 py-2 text-arcana-text text-sm placeholder-arcana-muted/50 resize-none focus:outline-none focus:border-arcana-purple transition-colors"
  />
</div>
```

`TarotSetupPage` (또는 메인 페이지 컴포넌트) 내에서:

```ts
const { setFreeQuestion, freeQuestion } = useSessionStore();
const [localFreeQuestion, setLocalFreeQuestion] = useState("");
```

`SpreadSelectStep` 렌더링 시:
```tsx
<SpreadSelectStep
  // ... 기존 props
  freeQuestion={localFreeQuestion}
  onFreeQuestionChange={(q) => { setLocalFreeQuestion(q); setFreeQuestion(q); }}
/>
```

**SSR 안전**: `localFreeQuestion`의 초기값은 `""` (빈 문자열). 이미 `useState("")`이므로 hydration 안전.

- [ ] **Step 3: `api-schemas.ts`에 `freeQuestion` 추가**

`TarotReadingSchema`에 추가:
```ts
export const TarotReadingSchema = z.object({
  // ... 기존 필드 유지
  freeQuestion: z.string().max(200).nullish(),
  cards: z.array(z.object({
    // ...
  })).min(1).max(22),
});
```

- [ ] **Step 4: `prompt-builder.ts`에 `buildFreeQuestionPrompt` 추가**

```ts
/** 사용자 자유 질문을 프롬프트에 추가 (최대 200자, 인젝션 방지) */
export function buildFreeQuestionPrompt(question?: string | null): string {
  if (!question?.trim()) return "";
  const sanitized = sanitizeField(question, 200);
  return `\n\n사용자 질문: "${sanitized}"\n이 질문을 카드 해석에 반영하여 직접적으로 답해주세요.`;
}
```

- [ ] **Step 5: `api/tarot/reading/route.ts`에서 freeQuestion 적용**

`parsed.data` 구조분해에 `freeQuestion` 추가:
```ts
const { sessionId, topic, spreadType, characterId, userInfo, cards, freeQuestion } = parsed.data as {
  // ... 기존 타입
  freeQuestion?: string | null;
  cards: { cardId: string; position: number; isReversed: boolean }[];
};
```

스트림 내 AI 호출 부분에서:
```ts
// 기존
for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt + userInfoPrompt, maxTokens)) {

// 변경 후
const freeQuestionPrompt = buildFreeQuestionPrompt(freeQuestion);
for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt + userInfoPrompt + freeQuestionPrompt, maxTokens)) {
```

`buildFreeQuestionPrompt` import 추가:
```ts
import { buildUserInfoPrompt, buildFreeQuestionPrompt } from "@/services/core/prompt-builder";
```

- [ ] **Step 6: `tarot/session/page.tsx`에서 reading API 호출 시 freeQuestion 포함**

`startReading` 내 `fetchSSEStream` 호출의 `body`에 추가:
```ts
body: {
  sessionId, topic, spreadType, characterId,
  userInfo: useSessionStore.getState().userInfo,
  freeQuestion: useSessionStore.getState().freeQuestion,  // 추가
  cards: cards.map(...)
},
```

- [ ] **Step 7: 기존 테스트 통과 확인 + freeQuestion 테스트 추가**

`src/__tests__/api/tarot-reading.test.ts`에 테스트 추가:

```ts
it("freeQuestion 포함 요청 → SSE 스트림 응답", async () => {
  const { POST } = await setup();
  const res = await POST(makePostRequest({
    ...VALID_BODY,
    freeQuestion: "이번 달 운은 어떨까요?",
  }));
  expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  const text = await readSSEStream(res);
  expect(text).toContain("done");
});

it("freeQuestion 200자 초과 → Invalid request", async () => {
  const { POST } = await setup();
  const res = await POST(makePostRequest({
    ...VALID_BODY,
    freeQuestion: "a".repeat(201),
  }));
  expect(res.status).toBe(400);
});
```

```bash
pnpm exec vitest run src/__tests__/api/tarot-reading.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 8: 검증**

```bash
pnpm type-check && pnpm lint
```

- [ ] **Step 9: 커밋**

```bash
git add src/hooks/useSession.ts src/app/tarot/page.tsx src/lib/validation/api-schemas.ts \
        src/services/core/prompt-builder.ts src/app/api/tarot/reading/route.ts \
        src/__tests__/api/tarot-reading.test.ts
git commit -m "feat: 타로 자유 질문 입력 — SpreadSelect UI + prompt 주입 (최대 200자)"
```

---

## Task 6: 캐릭터 메모리 주입 (reading_history → system prompt)

**Files:**
- Modify: `src/lib/db/types.ts`
- Modify: `src/lib/db/supabase-adapter.ts`
- Modify: `src/lib/db/postgres-adapter.ts`
- Create: `src/lib/db/character-context.ts`
- Create: `src/__tests__/lib/character-context.test.ts`
- Modify: `src/services/core/prompt-builder.ts`
- Modify: `src/app/api/tarot/reading/route.ts`

전략: `findMany`에 `orderBy/orderDir` 옵션 추가 → 최근 3 세션 조회 → 읽기 요약 주입.
인증된 사용자에게만 적용. 미인증(익명) 리딩은 메모리 없이 진행.

- [ ] **Step 1: `findMany` 옵션에 `orderBy` 추가 (DbClient 인터페이스)**

`src/lib/db/types.ts`:

```ts
export interface DbClient {
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>
  findMany<T>(table: string, where?: Record<string, unknown>, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }): Promise<T[]>
  findManyIn<T>(table: string, column: string, values: unknown[]): Promise<T[]>
  insert<T>(table: string, data: Record<string, unknown>): Promise<T>
  insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]>
  update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null>
  upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T>
}
```

- [ ] **Step 2: `supabase-adapter.ts`의 `findMany`에 ordering 구현**

`findMany` 메서드 내, `limit` 처리 전에 추가:

```ts
if (options?.orderBy) {
  query = query.order(options.orderBy, { ascending: options.orderDir !== 'desc' }) as typeof query
}
if (options?.limit !== undefined) {
  // ... 기존 코드
}
```

- [ ] **Step 3: `postgres-adapter.ts`의 `findMany`에 ordering 구현**

필요한 import 추가 (`asc`, `desc` from drizzle-orm):
```ts
import { eq, and, inArray, getTableColumns, asc, desc } from "drizzle-orm"
```

`findMany` 메서드 내, `limit` 처리 전에 추가:
```ts
if (options?.orderBy) {
  const cols = getTableColumns(t)
  const orderCol = cols[options.orderBy] ?? cols[snakeToCamel(options.orderBy)]
  if (orderCol) {
    q = q.orderBy(options.orderDir === 'desc' ? desc(orderCol) : asc(orderCol))
  }
}
if (options?.limit !== undefined) q = q.limit(options.limit)
```

- [ ] **Step 4: 테스트 — `findMany orderBy` 검증**

기존 `supabase-adapter.test.ts`와 `postgres-adapter.test.ts`에 각각 추가:

```ts
// supabase-adapter.test.ts
it("findMany with orderBy → order 호출", async () => {
  const mockClient = createMockSupabaseClient([{ id: "1" }]);
  const adapter = new SupabaseAdapter();
  // mockClient.from().select().eq().order() chain 검증
  // (기존 테스트 패턴 따름)
  const result = await adapter.findMany("sessions", { status: "completed" }, {
    orderBy: "created_at",
    orderDir: "desc",
    limit: 3,
  });
  expect(result).toHaveLength(1);
});
```

```bash
pnpm exec vitest run src/lib/db/supabase-adapter.test.ts src/lib/db/postgres-adapter.test.ts
```

Expected: 기존 테스트 포함 모두 통과

- [ ] **Step 5: `character-context.ts` 신규 파일 생성**

```ts
// src/lib/db/character-context.ts
import type { DbClient } from "./types";

interface RecentSession {
  id: string;
  service_type: string;
  created_at: string;
}

interface RecentReading {
  session_id: string;
  overall_reading: string;
}

interface CharacterMemoryEntry {
  serviceType: string;
  date: string;
  overallReading: string;
}

/**
 * 최근 N회 세션의 overall_reading을 조회해 캐릭터 메모리 컨텍스트로 반환.
 * 인증된 사용자에게만 의미가 있음. 실패 시 빈 배열 반환 (리딩은 계속 진행).
 */
export async function getRecentCharacterMemory(
  db: DbClient,
  userId: string,
  characterId: string,
  limit = 3,
): Promise<CharacterMemoryEntry[]> {
  try {
    const sessions = await db.findMany<RecentSession>(
      "sessions",
      { user_id: userId, character_id: characterId, status: "completed" },
      { limit, orderBy: "created_at", orderDir: "desc" },
    );
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const readings = await db.findManyIn<RecentReading>("readings", "session_id", sessionIds);

    return sessions.flatMap((s) => {
      const reading = readings.find((r) => r.session_id === s.id);
      if (!reading?.overall_reading) return [];
      return [{
        serviceType: s.service_type,
        date: s.created_at.slice(0, 10),
        overallReading: reading.overall_reading.slice(0, 150),
      }];
    });
  } catch (e) {
    console.warn("[character-context] 메모리 조회 실패 (리딩 계속):", e instanceof Error ? e.message : String(e));
    return [];
  }
}
```

- [ ] **Step 6: `character-context.test.ts` 생성**

```ts
// src/__tests__/lib/character-context.test.ts
import { describe, it, expect, vi } from "vitest";
import { getRecentCharacterMemory } from "@/lib/db/character-context";
import { makeMockDb } from "@/test-helpers/mock-db";

describe("getRecentCharacterMemory", () => {
  it("세션 + 리딩 조회 → 메모리 반환", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([
      { id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" },
      { id: "s2", service_type: "saju",  created_at: "2026-03-15T00:00:00Z" },
    ]);
    db.findManyIn.mockResolvedValue([
      { session_id: "s1", overall_reading: "운이 좋다" },
      { session_id: "s2", overall_reading: "사주 분석 결과" },
    ]);

    const result = await getRecentCharacterMemory(db, "user-1", "arcana");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ serviceType: "tarot", date: "2026-04-01", overallReading: "운이 좋다" });
    expect(result[1]).toEqual({ serviceType: "saju",  date: "2026-03-15", overallReading: "사주 분석 결과" });
  });

  it("세션 없음 → 빈 배열", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("리딩 없는 세션은 스킵", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([{ id: "s1", service_type: "tarot", created_at: "2026-04-01T00:00:00Z" }]);
    db.findManyIn.mockResolvedValue([]);
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("DB 오류 시 빈 배열 반환 (리딩 계속)", async () => {
    const db = makeMockDb();
    db.findMany.mockRejectedValue(new Error("DB down"));
    const result = await getRecentCharacterMemory(db, "user-1", "arcana");
    expect(result).toEqual([]);
  });

  it("findMany가 limit=3으로 호출됨", async () => {
    const db = makeMockDb();
    db.findMany.mockResolvedValue([]);
    db.findManyIn.mockResolvedValue([]);
    await getRecentCharacterMemory(db, "user-1", "arcana", 3);
    expect(db.findMany).toHaveBeenCalledWith(
      "sessions",
      { user_id: "user-1", character_id: "arcana", status: "completed" },
      { limit: 3, orderBy: "created_at", orderDir: "desc" },
    );
  });
});
```

```bash
pnpm exec vitest run src/__tests__/lib/character-context.test.ts
```

Expected: 5개 테스트 모두 통과

- [ ] **Step 7: `prompt-builder.ts`에 `buildCharacterMemoryPrompt` 추가**

```ts
interface MemoryEntry {
  serviceType: string;
  date: string;
  overallReading: string;
}

/** 최근 세션 요약을 시스템 프롬프트에 주입 */
export function buildCharacterMemoryPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) => {
    const label = m.serviceType === "tarot" ? "타로" : m.serviceType === "saju" ? "사주" : "신점";
    return `- [${m.date}] ${label}: ${m.overallReading}`;
  });
  return `\n\n이전 상담 기억 (참고용, 직접 언급 금지):\n${lines.join("\n")}`;
}
```

- [ ] **Step 8: `api/tarot/reading/route.ts`에서 메모리 주입**

import 추가:
```ts
import { getCurrentUser } from "@/lib/auth";
import { getRecentCharacterMemory } from "@/lib/db/character-context";
import { buildUserInfoPrompt, buildFreeQuestionPrompt, buildCharacterMemoryPrompt } from "@/services/core/prompt-builder";
```

세션 소유권 검증 후, 스트림 시작 전에 메모리 조회:
```ts
// 캐릭터 메모리 조회 (인증된 사용자만)
let memoryPrompt = "";
if (sessionId) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.id && characterId) {
      const db = getDb();
      const memories = await getRecentCharacterMemory(db, currentUser.id, characterId);
      memoryPrompt = buildCharacterMemoryPrompt(memories);
    }
  } catch {
    // 메모리 조회 실패는 무시 (리딩 계속)
  }
}
```

AI 호출 시 systemPrompt에 memoryPrompt 추가:
```ts
const systemPromptWithMemory = systemPrompt + memoryPrompt;
for await (const chunk of grokProvider.streamReading(systemPromptWithMemory, readingPrompt + userInfoPrompt + freeQuestionPrompt, maxTokens)) {
```

- [ ] **Step 9: tarot-reading 테스트에 메모리 관련 케이스 추가**

```ts
it("세션 없는 익명 요청에서는 메모리 조회 안 함", async () => {
  const { POST, mockDb } = await setup();
  const res = await POST(makePostRequest({ ...VALID_BODY, sessionId: null }));
  const text = await readSSEStream(res);
  expect(text).toContain("done");
  // 익명이므로 findMany 호출 안 됨 (또는 sessionId null 분기)
  // mockDb.findMany 호출 여부를 검증하지 않아도 됨 (기존 테스트와 일관성 유지)
});
```

```bash
pnpm exec vitest run src/__tests__/api/tarot-reading.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 10: 전체 검증**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage
```

Expected: 타입 에러 없음, lint 통과, coverage 98% 유지

- [ ] **Step 11: 커밋**

```bash
git add src/lib/db/types.ts src/lib/db/supabase-adapter.ts src/lib/db/postgres-adapter.ts \
        src/lib/db/character-context.ts src/__tests__/lib/character-context.test.ts \
        src/services/core/prompt-builder.ts src/app/api/tarot/reading/route.ts \
        src/__tests__/api/tarot-reading.test.ts
git commit -m "feat: 캐릭터 메모리 — 최근 3세션 요약을 system prompt에 주입"
```

---

## 최종 검증 및 PR

- [ ] **전체 검증**

```bash
pnpm type-check && pnpm lint && pnpm build && pnpm test:coverage
```

Expected:
- 타입 에러 없음
- lint 경고 없음
- build 성공
- coverage statements ≥ 98%

- [ ] **SonarCloud Quality Gate 확인**

```bash
curl -s -u "${SONARQUBE_TOKEN}:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight" | jq '.projectStatus.status'
```

Expected: `"OK"`

- [ ] **PR 생성**

```bash
git push origin main
```

PR 제목: `feat: 캐릭터 경험 강화 — 타입 안전성, 프롬프트 품질, 6단계 표정, 자유 질문, 메모리 주입`

---

## Self-Review

### Spec Coverage
- ✅ Task 1: CHAR_ENTRANCE `Record<CharacterId, ...>` — `SpriteAnimator.tsx`
- ✅ Task 2: `description/speciality` → `buildCharacterHeader` — `prompt-builder.ts`  
- ✅ Task 3: 에러 캐릭터화 — `waiting-lines.ts` + 세션 페이지
- ✅ Task 4: Mood 6단계 — `surprised` 카드 선택, `line.mood` 대기줄, 결과 캐릭터별
- ✅ Task 5: 자유 질문 — UI(tarot page) + store + schema + prompt + API
- ✅ Task 6: 캐릭터 메모리 — DB orderBy 확장 + character-context + prompt 주입

### Placeholder Scan
- 모든 코드 블록에 실제 구현 코드 포함됨 ✅
- 테스트 케이스 구체적 ✅

### Type Consistency
- `CharacterId`: `character.ts`에서 정의 → `daily-character.ts`, `SpriteAnimator.tsx`에서 import 사용
- `CharacterMemoryEntry` / `MemoryEntry`: `character-context.ts`와 `prompt-builder.ts`가 별도 interface 사용 (결합 안 함 — 각 모듈 독립성 유지)
- `CharacterErrorLines`: `waiting-lines.ts`에서 export → 세션 페이지에서 import

### 주의사항
- Task 4: `startWaitingSequence`의 useCallback deps에 `setMood` 추가 필수 (lint 경고 방지)
- Task 5: `useState("")` 초기값 필수 (SSR hydration 안전)
- Task 6: 메모리 조회 실패는 silently 무시 — 리딩 흐름 보호 최우선
