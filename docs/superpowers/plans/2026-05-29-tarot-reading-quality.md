# 타로 리딩 품질 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 해석에 `action` 섹션 추가, 종합 결과에 `directAnswer` 섹션 추가 — 모든 사용자 상황(솔로/커플/구직/재직 등)을 포괄하는 다면적·구체적 리딩 제공.

**Architecture:** 타입 → i18n → 프롬프트 → max_tokens → parseResult → UI 순서로 진행. 각 단계는 독립적이며 하위 호환성을 유지한다(`action`/`directAnswer` 없는 기존 데이터는 `undefined`로 graceful skip).

**Tech Stack:** TypeScript strict, Next.js App Router, Grok API (Fallback → Claude), Framer Motion, Tailwind CSS v4, Vitest

---

## File Map

| 파일 | 변경 유형 | 역할 |
|------|---------|------|
| `src/types/service.ts` | Modify | `action` + `directAnswer` 타입 추가 |
| `src/i18n/translations/shared/keys.ts` | Modify | 타입 키 추가 |
| `src/i18n/translations/ko/index.ts` | Modify | 한국어 레이블 |
| `src/i18n/translations/en/index.ts` | Modify | 영어 레이블 |
| `src/i18n/translations/ja/index.ts` | Modify | 일본어 레이블 |
| `src/services/core/prompt-builder.ts` | Modify | 3개 함수 업데이트 |
| `src/app/api/tarot/reading/route.ts` | Modify | max_tokens 공식 |
| `src/services/tarot/tarot-service.ts` | Modify | parseResult 확장 |
| `src/components/tarot/CardInterpretationList.tsx` | Modify | action 섹션 렌더링 |
| `src/components/tarot/TarotResultPanel.tsx` | Modify | directAnswer 섹션 렌더링 |
| `src/app/tarot/session/page.tsx` | Modify | directAnswerLabel prop 전달 |
| `src/__tests__/api/tarot-reading.test.ts` | Modify | max_tokens 테스트 케이스 업데이트 |

---

## Task 1: 타입 정의 — `action` + `directAnswer` 필드 추가

**Files:**
- Modify: `src/types/service.ts`

- [ ] **Step 1: `CardInterpretationItem`에 `action` 필드, `ReadingResult`에 `directAnswer` 필드 추가**

`src/types/service.ts` 의 `CardInterpretationItem`과 `ReadingResult`를 다음으로 교체한다:

```typescript
export interface CardInterpretationItem {
  cardId: string;
  position: number;
  interpretation?: string;
  symbolism?: string;
  situation?: string;
  action?: string;
  isReversed?: boolean;
}

export interface ReadingResult {
  cardInterpretations?: CardInterpretationItem[];
  overallReading: string;
  directAnswer?: string;
  advice: string;
  topicReading?: string;
  shareToken?: string | null;
  sajuSections?: SajuSections;
  shinjeomSections?: ShinjeomSections;
  parseError?: "truncated" | "invalid_json" | "fallback_text" | "missing_fields";
  expectedCardCount?: number;
}
```

- [ ] **Step 2: 타입 검사 통과 확인**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/types/service.ts
git commit -m "feat(types): CardInterpretationItem에 action, ReadingResult에 directAnswer 추가"
```

---

## Task 2: i18n — `section.action` + `tarot.section.direct-answer` 레이블 추가

**Files:**
- Modify: `src/i18n/translations/shared/keys.ts`
- Modify: `src/i18n/translations/ko/index.ts`
- Modify: `src/i18n/translations/en/index.ts`
- Modify: `src/i18n/translations/ja/index.ts`

- [ ] **Step 1: `shared/keys.ts`에 타입 키 추가**

`src/i18n/translations/shared/keys.ts`에서 `"section.situation": string;` 바로 아래에 추가:

```typescript
"section.action": string;
```

`tarot` 네임스페이스 내 `"result.advice": string;` 바로 아래에 추가:

```typescript
"result.direct-answer": string;
```

- [ ] **Step 2: `ko/index.ts` — 한국어 값 추가 (SSOT)**

`src/i18n/translations/ko/index.ts`에서:

`"section.situation": "현재 상황",` 바로 아래에 추가:
```typescript
"section.action": "카드가 제안하는 것",
```

`tarot` 네임스페이스의 `"result.advice": "조언",` 바로 아래에 추가:
```typescript
"result.direct-answer": "카드가 전하는 직접 메시지",
```

- [ ] **Step 3: `en/index.ts` — 영어 값 추가**

`src/i18n/translations/en/index.ts`에서:

`"section.situation": "Current Situation",` 바로 아래에 추가:
```typescript
"section.action": "Card's Guidance",
```

`tarot` 네임스페이스의 `"result.advice": "Advice",` 바로 아래에 추가 (라인 위치가 다를 수 있으므로 `result.advice` 기준으로 찾는다):
```typescript
"result.direct-answer": "Direct Message from the Cards",
```

- [ ] **Step 4: `ja/index.ts` — 일본어 값 추가**

`src/i18n/translations/ja/index.ts`에서:

`"section.situation": "現在の状況",` 바로 아래에 추가:
```typescript
"section.action": "カードの導き",
```

`tarot` 네임스페이스의 `"result.advice"` 바로 아래에 추가:
```typescript
"result.direct-answer": "カードからの直接メッセージ",
```

- [ ] **Step 5: i18n drift 검사**

```bash
pnpm i18n:check
```
Expected: `KO/EN/JA N개 일치, drift 없음` (N은 기존+4).

- [ ] **Step 6: 커밋**

```bash
git add src/i18n/translations/
git commit -m "feat(i18n): section.action + tarot.result.direct-answer 레이블 추가 (ko/en/ja)"
```

---

## Task 3: 프롬프트 — `buildSystemPrompt` 업데이트

**Files:**
- Modify: `src/services/core/prompt-builder.ts` (lines 50-99)

- [ ] **Step 1: `buildSystemPrompt` 내 섹션 설명 + JSON 스키마 교체**

`src/services/core/prompt-builder.ts`의 `buildSystemPrompt` 함수에서 다음 블록을 교체한다.

**교체 전 (lines 59-97):**
```
중요 규칙 — 해석 품질 (프리미엄 기준):
- 단순 키워드 나열이나 사전적 설명이 아닌, 카드의 에너지와 의미를 몰입감 있는 문장으로 표현합니다.
- 각 카드는 symbolism(카드 상징)과 situation(상황 묘사) 2개 섹션으로 구성합니다.
- symbolism: 카드의 시각적 이미지(인물·색감·상징물·숫자)에서 출발해 원형적·신화적·심리적 의미까지 3~4문단으로 탐구합니다. 카드가 가진 에너지와 분위기를 감각적으로 전달합니다.
- situation: 이 카드가 해당 위치에서 가리키는 에너지, 흐름, 주제를 3~4문단으로 서술합니다. 특정 사실을 단정하지 않고, 어떤 내적·외적 에너지와 흐름이 감돌고 있는지 묘사합니다. 상담자가 읽으며 "이것이 내 이야기구나"라고 공명할 수 있는 깊이로 씁니다.
- 종합 해석(overallReading): 카드들이 함께 엮어내는 이야기와 큰 흐름을 5~6문단으로 풀어냅니다. 스프레드 전체를 하나의 서사로 연결하여 핵심 메시지를 전달합니다.
- 조언(advice): 리딩에서 자연스럽게 흘러나오는 통찰과 지혜를 3~4문단으로 담습니다. 상담자가 스스로 방향을 발견하도록 이끄는 방식으로 씁니다.
```

**교체 후:**
```
중요 규칙 — 해석 품질 (프리미엄 기준):
- 단순 키워드 나열이나 사전적 설명이 아닌, 카드의 에너지와 의미를 몰입감 있는 문장으로 표현합니다.
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) / action(행동 제안) 3개 섹션으로 구성합니다.
- symbolism: 카드의 시각적 이미지(인물·색감·상징물·숫자)에서 출발해 원형적·신화적·심리적 의미까지 3~4문단으로 탐구합니다. 카드가 가진 에너지와 분위기를 감각적으로 전달합니다.
- situation: 이 카드가 해당 위치에서 가리키는 에너지와 흐름을 3~4문단으로 서술합니다. 에너지의 방향을 묘사하되 상담자가 자신의 상황과 직접 연결할 수 있는 구체적 통찰을 포함합니다. 상담자가 읽으며 "이것이 내 이야기구나"라고 공명할 수 있는 깊이로 씁니다.
- action: 이 카드가 이 위치에서 상담자에게 제안하는 구체적 행동·방향을 1~2문단으로 서술합니다. 상담자가 어떤 국면에 있든 적용 가능하도록 적극적 국면 / 정체된 국면 / 마무리 국면 세 가지를 고려합니다. 역방향일 경우 내려놓아야 할 것의 관점에서 제시합니다.
- 직접 답변(directAnswer): 상담자의 현재 상황을 단 하나로 가정하지 말고 가능한 모든 상황을 포괄합니다. 4~5문단으로: ① 어떤 상황에서도 공통인 카드의 핵심 메시지 ② "이미 진행 중이라면" 시나리오 ③ "아직 시작 전이거나 막혀 있다면" 시나리오 ④ "이 방향이 지금 맞지 않다면" 시나리오 ⑤ 어느 시나리오에서든 지금 당장 취할 수 있는 공통 행동과 변화의 조건.
- 종합 해석(overallReading): 카드들이 함께 엮어내는 이야기와 큰 흐름을 5~6문단으로 풀어냅니다. 스프레드 전체를 하나의 서사로 연결합니다.
- 조언(advice): 리딩에서 자연스럽게 흘러나오는 통찰과 지혜를 3~4문단으로 담습니다.
```

JSON 스키마 블록(lines 87-97)을 다음으로 교체:
```
{
  "cardInterpretations": [
    {
      "cardId": "카드 ID",
      "position": 0,
      "symbolism": "카드 상징 3~4문단",
      "situation": "구체적 상황 묘사 3~4문단",
      "action": "행동 제안 1~2문단"
    }
  ],
  "overallReading": "전체 서사 연결 5~6문단",
  "directAnswer": "다면적 직접 답변 4~5문단",
  "advice": "조언 3~4문단"
}
```

- [ ] **Step 2: 타입 검사**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/services/core/prompt-builder.ts
git commit -m "feat(prompt): buildSystemPrompt — action/directAnswer 섹션 추가, situation 구체화"
```

---

## Task 4: 프롬프트 — `buildReadingPrompt` + `buildFreeQuestionPrompt` 업데이트

**Files:**
- Modify: `src/services/core/prompt-builder.ts` (lines 101-206)

- [ ] **Step 1: `buildReadingPrompt` 내 `depthGuide` 블록 교체**

`src/services/core/prompt-builder.ts`의 `buildReadingPrompt`에서 `depthGuide` 상수 전체를 다음으로 교체한다:

```typescript
  const depthGuide = `해석 품질 지침 (${cardCount}장 스프레드, 프리미엄 기준):
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) / action(행동 제안) 3개 섹션으로 나눠 작성합니다.

symbolism (카드 상징) — 3~4문단:
카드의 그림 속 요소(인물, 색감, 배경, 숫자, 동물 등)를 감각적으로 묘사하며 시작합니다.
이 이미지들이 가진 원형적 의미, 신화적 배경, 심리적 상징을 풍부하게 탐구합니다.
카드 전체가 발산하는 에너지와 분위기를 독자가 실감할 수 있도록 서술합니다.
역방향일 경우, 에너지의 방향이 내면으로 전환되거나 저항이 생기는 맥락을 설명합니다.

situation (상황 묘사) — 3~4문단:
이 카드가 해당 위치에서 가리키는 에너지와 흐름을 서술합니다.
에너지의 방향과 주제를 묘사하되 상담자가 자신의 상황과 직접 연결할 수 있는 구체적 통찰을 포함합니다.
상담자가 읽으며 자신의 이야기와 자연스럽게 연결되도록 깊이와 울림이 있게 씁니다.
내면의 움직임, 감정의 결, 관계의 에너지, 상황의 본질적 성격을 포착합니다.

action (행동 제안) — 1~2문단:
이 카드가 이 위치에서 상담자에게 제안하는 구체적 행동·방향을 서술합니다.
상담자가 어떤 국면에 있든 적용 가능하도록 세 가지를 고려합니다:
- 적극적 국면이라면: 지금 해야 할 것 / 밀어붙일 것
- 정체된 국면이라면: 먼저 풀어야 할 것 / 바꿔야 할 것
- 마무리 국면이라면: 내려놓아야 할 것 / 정리할 것
역방향일 경우 저항과 내면화된 에너지 관점에서 행동 방향을 제시합니다.

종합 해석(overallReading) — 5~6문단:
카드들이 함께 만들어내는 이야기를 하나의 서사로 엮습니다.
각 위치의 흐름이 어떻게 연결되고 어디를 향하는지 큰 그림을 그려줍니다.
이 시점에서 상담자에게 가장 중요한 메시지와 통찰을 전달합니다.

직접 답변(directAnswer) — 4~5문단:
상담자의 현재 상황을 단 하나로 가정하지 마세요. 모든 가능성을 포괄합니다:
- 연애라면: 솔로 / 새 관계 시작 / 장기 연애 / 이별 후 / 상처 치유 중 모두 포괄
- 직장이라면: 재직 중 / 구직 중 / 이직 고민 / 창업 준비 모두 포괄
- 재정이라면: 안정기 / 지출 과다 / 투자 고민 / 부채 상황 모두 포괄
- 건강이라면: 예방 관리 / 증상 인식 / 치료 중 / 회복기 모두 포괄
문단 구성:
① 어떤 상황에서도 공통인 카드의 핵심 메시지
② "이미 이 일이 진행 중이라면 카드는 이렇게 말합니다..." (적극적 흐름)
③ "아직 시작 전이거나 막혀 있다면 카드는 이렇게 말합니다..." (정체·대기)
④ "이 방향이 지금 맞지 않거나 내려놓아야 할 때라면..." (전환·마무리)
⑤ 어느 시나리오에서든 지금 당장 취할 수 있는 공통 행동과 변화의 조건

조언(advice) — 3~4문단:
리딩에서 자연스럽게 흘러나오는 지혜를 담습니다.
상담자가 스스로 깨닫고 방향을 찾을 수 있도록 이끌되, 일방적 지시보다 통찰을 제안합니다.`;
```

- [ ] **Step 2: `buildReadingPrompt` 마지막 지침 블록 교체**

함수 끝부분의 `return` 문에서 마지막 지침 줄들을 교체한다.

**교체 전 (현재 마지막 4줄):**
```typescript
- 각 카드의 cardId와 position 값을 JSON 응답에 정확히 반환하세요.
- 각 카드는 symbolism / situation 2개 섹션으로 작성하세요.
- symbolism은 카드 이미지와 상징을 감각적이고 깊이 있게 탐구하세요.
- situation은 에너지와 흐름을 묘사하되, 상담자가 공명할 수 있는 울림 있는 문장으로 쓰세요.
- 카드별 해석은 반드시 해당 위치의 관점에서 독립적으로 작성하세요.
- 종합 해석은 모든 카드를 하나의 이야기로 엮어 깊이 있게 서술하세요.`;
```

**교체 후:**
```typescript
- 각 카드의 cardId와 position 값을 JSON 응답에 정확히 반환하세요.
- 각 카드는 symbolism / situation / action 3개 섹션으로 작성하세요.
- symbolism은 카드 이미지와 상징을 감각적이고 깊이 있게 탐구하세요.
- situation은 에너지와 흐름을 묘사하되 구체적 통찰을 포함하세요.
- action은 적극적·정체·마무리 국면을 모두 고려한 행동 제안을 1~2문단으로 쓰세요.
- directAnswer는 상담자의 모든 가능한 상황(진행 중 / 시작 전 / 전환 필요)을 포괄하는 4~5문단으로 작성하세요.
- 카드별 해석은 반드시 해당 위치의 관점에서 독립적으로 작성하세요.
- 종합 해석은 모든 카드를 하나의 이야기로 엮어 깊이 있게 서술하세요.`;
```

- [ ] **Step 3: `buildFreeQuestionPrompt` 함수 전체 교체**

`src/services/core/prompt-builder.ts`의 `buildFreeQuestionPrompt` 함수를 다음으로 교체한다:

```typescript
/** 사용자 자유 질문을 프롬프트에 추가 (최대 200자, 인젝션 방지) */
export function buildFreeQuestionPrompt(question?: string | null): string {
  if (!question?.trim()) return "";
  const sanitized = sanitizeField(question, 200);
  return `\n\n사용자 질문: "${sanitized}"\n` +
    `directAnswer 필드에서 이 질문에 직접 답하세요. ` +
    `단순 "예/아니오"가 아닌 다면적으로: ` +
    `"이 질문의 상황이 이미 진행 중이라면 / 아직 시작 전이라면 / 방향을 바꿔야 한다면" ` +
    `세 관점에서 구체적으로 답하되, 마지막 문단에서 공통 핵심 행동을 제시하세요.`;
}
```

- [ ] **Step 4: 타입 검사**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/services/core/prompt-builder.ts
git commit -m "feat(prompt): buildReadingPrompt action/directAnswer 가이드 추가, buildFreeQuestionPrompt 강화"
```

---

## Task 5: max_tokens 공식 업데이트 + 테스트

**Files:**
- Modify: `src/app/api/tarot/reading/route.ts` (lines 25-41)
- Modify: `src/__tests__/api/tarot-reading.test.ts`

- [ ] **Step 1: 테스트 먼저 — 새 공식의 기댓값으로 테스트 케이스 업데이트**

`src/__tests__/api/tarot-reading.test.ts`에서 `"computeReadingMaxTokens 정책"` 테스트를 찾아 `cases` 배열을 다음으로 교체한다:

```typescript
    // 신규 공식: min(15000 + cardCount * 9000 + 15000, 65000)
    // base 15000: directAnswer + 오버헤드. perCard 9000: 3섹션(symbolism/situation/action). reasoningBuffer 15000. cap 65000.
    const cases: { count: number; expected: number }[] = [
      { count: 1, expected: 39000 },   // 15000 + 9000 + 15000
      { count: 3, expected: 57000 },   // 15000 + 27000 + 15000
      { count: 4, expected: 65000 },   // 15000 + 36000 + 15000 = 66000 → cap
      { count: 5, expected: 65000 },   // cap
      { count: 7, expected: 65000 },   // cap
      { count: 9, expected: 65000 },   // cap
      { count: 10, expected: 65000 },  // cap
      { count: 12, expected: 65000 },  // cap (zodiac)
      { count: 15, expected: 65000 },  // cap
      { count: 20, expected: 65000 },  // cap
    ];
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test:coverage -- --reporter=verbose src/__tests__/api/tarot-reading.test.ts 2>&1 | grep -A3 "computeReadingMaxTokens"
```
Expected: FAIL (기존 공식이 다른 값을 반환하므로).

- [ ] **Step 3: `computeReadingMaxTokens` 함수 + 주석 교체**

`src/app/api/tarot/reading/route.ts`의 `computeReadingMaxTokens` 함수와 앞 JSDoc 주석을 다음으로 교체한다:

```typescript
/**
 * 카드 수에 비례한 max_tokens 정책.
 *
 * 3-섹션(symbolism/situation/action) + directAnswer(4~5문단) 기준.
 *   - perCard 9000 = 3섹션 × 3~4문단 (한국어 1.3x + JSON 오버헤드 + action 섹션)
 *   - base 15000 = system + overallReading + directAnswer + advice 오버헤드
 *   - reasoningBuffer 15000 = Grok-3 reasoning 흡수 마진
 *   - cap 65000 = Claude 4.x max output 안전마진 (Grok 최대 100K)
 */
function computeReadingMaxTokens(cardCount: number): number {
  return Math.min(15000 + cardCount * 9000 + 15000, 65000);
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test:coverage -- --reporter=verbose src/__tests__/api/tarot-reading.test.ts 2>&1 | grep -A3 "computeReadingMaxTokens"
```
Expected: PASS.

- [ ] **Step 5: 전체 타로 테스트 통과 확인**

```bash
pnpm test:coverage -- src/__tests__/api/tarot-reading.test.ts
```
Expected: All tests pass.

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/tarot/reading/route.ts src/__tests__/api/tarot-reading.test.ts
git commit -m "feat(api): computeReadingMaxTokens 공식 업데이트 — base 15000, perCard 9000, cap 65000"
```

---

## Task 6: `parseResult` 확장 — `action` + `directAnswer` 파싱

**Files:**
- Modify: `src/services/tarot/tarot-service.ts` (lines 39-78)

- [ ] **Step 1: `tarot-service.ts`의 `parseResult` 메서드에서 카드 매핑 인터페이스와 반환값 업데이트**

`src/services/tarot/tarot-service.ts`의 `parseResult` 내 `.map()` 콜백 타입 어노테이션을 교체한다.

**교체 전:**
```typescript
      (interp: { cardId: string; position: number; interpretation?: string; symbolism?: string; situation?: string; isReversed?: boolean }) => ({
        cardId: interp.cardId,
        position: interp.position,
        isReversed: interp.isReversed,
        // 2-section fields
        ...(interp.symbolism !== undefined ? { symbolism: cleanReadingText(String(interp.symbolism)) } : {}),
        ...(interp.situation !== undefined ? { situation: cleanReadingText(String(interp.situation)) } : {}),
        // deprecated backward-compat field
        ...(interp.interpretation !== undefined ? { interpretation: cleanReadingText(String(interp.interpretation)) } : {}),
      })
```

**교체 후:**
```typescript
      (interp: { cardId: string; position: number; interpretation?: string; symbolism?: string; situation?: string; action?: string; isReversed?: boolean }) => ({
        cardId: interp.cardId,
        position: interp.position,
        isReversed: interp.isReversed,
        ...(interp.symbolism !== undefined ? { symbolism: cleanReadingText(String(interp.symbolism)) } : {}),
        ...(interp.situation !== undefined ? { situation: cleanReadingText(String(interp.situation)) } : {}),
        ...(interp.action !== undefined ? { action: cleanReadingText(String(interp.action)) } : {}),
        // deprecated backward-compat field
        ...(interp.interpretation !== undefined ? { interpretation: cleanReadingText(String(interp.interpretation)) } : {}),
      })
```

`return` 블록에서 `advice:` 줄 바로 뒤에 `directAnswer` 추가:

**교체 전:**
```typescript
      return {
        cardInterpretations,
        overallReading: cleanReadingText(String(parsed.overallReading || "")),
        advice: cleanReadingText(String(parsed.advice || "")),
        ...(isTruncated ? { parseError: "truncated" as const } : {}),
        ...(typeof expectedCardCount === "number" ? { expectedCardCount } : {}),
      };
```

**교체 후:**
```typescript
      return {
        cardInterpretations,
        overallReading: cleanReadingText(String(parsed.overallReading || "")),
        advice: cleanReadingText(String(parsed.advice || "")),
        ...(parsed.directAnswer !== undefined ? { directAnswer: cleanReadingText(String(parsed.directAnswer)) } : {}),
        ...(isTruncated ? { parseError: "truncated" as const } : {}),
        ...(typeof expectedCardCount === "number" ? { expectedCardCount } : {}),
      };
```

- [ ] **Step 2: 타입 검사**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
pnpm test:coverage -- src/__tests__/api/tarot-reading.test.ts
```
Expected: All tests pass.

- [ ] **Step 4: 커밋**

```bash
git add src/services/tarot/tarot-service.ts
git commit -m "feat(service): tarot parseResult — action + directAnswer 파싱 추가"
```

---

## Task 7: `CardInterpretationList` — `action` 섹션 렌더링 추가

**Files:**
- Modify: `src/components/tarot/CardInterpretationList.tsx`

- [ ] **Step 1: `SECTION_LABELS` 상수에 `action` 추가**

`src/components/tarot/CardInterpretationList.tsx`에서 `SECTION_LABELS` 상수를 다음으로 교체한다:

```typescript
const SECTION_LABELS: Record<string, { symbolism: string; situation: string; action: string }> = {
  ko: { symbolism: "카드 상징", situation: "현재 상황", action: "카드가 제안하는 것" },
  en: { symbolism: "Card Symbolism", situation: "Current Situation", action: "Card's Guidance" },
  ja: { symbolism: "カードの象徴", situation: "現在の状況", action: "カードの導き" },
};
```

- [ ] **Step 2: `hasNewFormat` 분기에 `action` 섹션 렌더링 추가**

`{hasNewFormat ? (` 블록 내부를 다음으로 교체한다:

```typescript
            {hasNewFormat ? (
              <div>
                <ReadingSectionBlock icon="✦" label={labels.symbolism} content={interp.symbolism ?? ""} />
                <ReadingSectionBlock icon="◈" label={labels.situation} content={interp.situation ?? ""} />
                {interp.action && (
                  <ReadingSectionBlock icon="→" label={labels.action} content={interp.action} />
                )}
              </div>
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/tarot/CardInterpretationList.tsx
git commit -m "feat(ui): CardInterpretationList — action 섹션 렌더링 추가"
```

---

## Task 8: `TarotResultPanel` + 세션 페이지 — `directAnswer` 섹션 렌더링

**Files:**
- Modify: `src/components/tarot/TarotResultPanel.tsx`
- Modify: `src/app/tarot/session/page.tsx`

- [ ] **Step 1: `TarotResultPanel` props에 `directAnswerLabel` 추가 + 렌더링 삽입**

`src/components/tarot/TarotResultPanel.tsx` 전체를 다음으로 교체한다:

```typescript
"use client";

import type { RefObject } from "react";
import { ResultTextCard } from "@/components/session/ResultTextCard";
import { SessionActionButtons } from "@/components/session/SessionActionButtons";
import { CardInterpretationList } from "@/components/tarot/CardInterpretationList";
import type { ReadingResult } from "@/types/service";
import type { SelectedCard } from "@/types/card";
import type { SpreadDefinition } from "@/types/session";
import type { Locale } from "@/i18n/config";

interface TarotResultPanelProps {
  readingResult: ReadingResult;
  spread: SpreadDefinition | null;
  selectedCards: SelectedCard[];
  locale: Locale;
  overallLabel: string;
  directAnswerLabel: string;
  adviceLabel: string;
  newSessionLabel: string;
  shareLabel: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onNewSession: () => void;
  onShare: () => void;
}

export function TarotResultPanel({
  readingResult,
  spread,
  selectedCards,
  locale,
  overallLabel,
  directAnswerLabel,
  adviceLabel,
  newSessionLabel,
  shareLabel,
  containerRef,
  onNewSession,
  onShare,
}: TarotResultPanelProps) {
  return (
    <>
      <div ref={containerRef} data-testid="reading-content" className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
        {readingResult.cardInterpretations && readingResult.cardInterpretations.length > 0 && (
          <CardInterpretationList
            interpretations={readingResult.cardInterpretations}
            selectedCards={selectedCards}
            spread={spread}
            locale={locale}
          />
        )}
        {readingResult.directAnswer && (
          <ResultTextCard text={readingResult.directAnswer} emoji="🎴" label={directAnswerLabel} delay={0.6} colorScheme="purple" />
        )}
        {readingResult.overallReading && (
          <ResultTextCard text={readingResult.overallReading} emoji="🔮" label={overallLabel} delay={1} colorScheme="purple" />
        )}
        {readingResult.advice && (
          <ResultTextCard text={readingResult.advice} emoji="✨" label={adviceLabel} delay={1.4} colorScheme="gold" />
        )}
      </div>
      <SessionActionButtons
        onNewSession={onNewSession}
        onShare={onShare}
        newSessionLabel={newSessionLabel}
        shareLabel={shareLabel}
      />
    </>
  );
}
```

- [ ] **Step 2: 세션 페이지에서 `directAnswerLabel` prop 전달**

`src/app/tarot/session/page.tsx`에서 `<TarotResultPanel` 컴포넌트 호출 부분을 찾아 `overallLabel` 줄 바로 위에 다음을 추가한다:

```typescript
                  directAnswerLabel={t("tarot.result.direct-answer")}
```

결과적으로 해당 블록은:
```typescript
                <TarotResultPanel
                  ...
                  overallLabel={t("tarot.result.overall")}
                  directAnswerLabel={t("tarot.result.direct-answer")}
                  adviceLabel={t("tarot.result.advice")}
                  ...
                />
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check
```
Expected: 오류 없음.

- [ ] **Step 4: lint 검사**

```bash
pnpm lint 2>&1 | grep -E "TarotResultPanel|CardInterpretation|session/page"
```
Expected: 변경 파일에서 오류 없음 (기존 pre-existing 경고는 무시).

- [ ] **Step 5: 커밋**

```bash
git add src/components/tarot/TarotResultPanel.tsx src/app/tarot/session/page.tsx
git commit -m "feat(ui): TarotResultPanel — directAnswer 섹션 추가, 세션 페이지 prop 전달"
```

---

## Task 9: 전체 검증 + PR 생성

- [ ] **Step 1: 타입 검사 + lint + 빌드**

```bash
pnpm type-check && pnpm lint 2>&1 | grep -c "error" && pnpm build 2>&1 | tail -5
```
Expected: type-check 오류 0, lint 신규 error 0, build 성공.

- [ ] **Step 2: 테스트 커버리지**

```bash
pnpm test:coverage 2>&1 | tail -10
```
Expected: branches ≥ 92%, functions/lines/statements ≥ 98%.

- [ ] **Step 3: i18n drift 최종 확인**

```bash
pnpm i18n:check
```
Expected: drift 없음.

- [ ] **Step 4: feature 브랜치 push**

```bash
git checkout -b feat/tarot-reading-quality-3section
git push -u origin feat/tarot-reading-quality-3section
```

- [ ] **Step 5: PR 생성**

```bash
gh pr create --title "feat(tarot): 3섹션 카드 해석(action) + 다면적 직접 답변(directAnswer) 추가" --body "$(cat <<'EOF'
## Summary

- **카드 해석 3섹션**: symbolism + situation(구체화) + action(행동 제안) — 적극적/정체/마무리 국면 모두 커버
- **directAnswer**: 종합 결과에 다면적 직접 답변 섹션 추가 — 솔로/커플/구직/재직 등 모든 상황 포괄, 4~5문단 시나리오 매트릭스
- **situation 구체화**: "단정 금지" 제약 제거, 에너지 묘사 + 구체적 통찰 병행
- **buildFreeQuestionPrompt 강화**: directAnswer 필드에서 3관점(진행 중/시작 전/전환 필요) 직접 답변 강제
- **max_tokens 증가**: `min(15000 + cardCount×9000 + 15000, 65000)` (base +3000, perCard +1500, cap +5000)

## Test plan

- [ ] 질문 없이 카테고리 선택 → directAnswer에 여러 상황(솔로/커플 등) 모두 언급되는지 확인
- [ ] 구체적 질문 입력 → directAnswer 첫 문단에서 질문 관련 다면적 답변 확인
- [ ] 카드별 action 섹션 표시 확인
- [ ] 기존 리딩 결과(action/directAnswer 없음) 정상 표시 확인
- [ ] CI 통과

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 스펙 커버리지 검토

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| `action` 필드 타입 추가 | Task 1 |
| `directAnswer` 필드 타입 추가 | Task 1 |
| i18n 레이블 3개 언어 | Task 2 |
| `situation` "단정 금지" 제약 제거 | Task 3 |
| `action` 섹션 프롬프트 지침 | Task 3, 4 |
| `directAnswer` 시나리오 매트릭스 | Task 3, 4 |
| 토픽별 포괄 목록(연애/직장/재정/건강) | Task 4 |
| `buildFreeQuestionPrompt` 강화 | Task 4 |
| max_tokens 공식 조정 | Task 5 |
| `parseResult` action + directAnswer 파싱 | Task 6 |
| `CardInterpretationList` action UI | Task 7 |
| `TarotResultPanel` directAnswer UI | Task 8 |
| 하위 호환(기존 결과 graceful skip) | Task 8 (조건부 렌더링) |
