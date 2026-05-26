# Premium Reading Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로/사주/신점 AI 리딩의 JSON 스키마를 확장하고, 카드 해석을 symbolism/situation/action 3섹션으로 구조화하며, 사주·신점에 섹션 구조를 추가해 3배 깊이의 프리미엄 리딩 경험을 제공한다.

**Architecture:** ReadingResult 타입에 새 필드를 추가하고(구 `interpretation`은 하위호환 optional 유지), 서비스별 JSON 프롬프트·파서를 일괄 갱신하며, `ReadingSectionBlock` 컴포넌트로 공통 섹션 렌더링을 처리한다.

**Tech Stack:** TypeScript strict, Next.js 16 App Router, Zod, Framer Motion v12, Tailwind CSS v4, Vitest

---

## File Map

| 역할 | 파일 | 작업 |
|---|---|---|
| 타입 | `src/types/service.ts` | symbolism/situation/action 추가, SajuSections·ShinjeomSections 인터페이스 신규 |
| 테스트 헬퍼 | `src/test-helpers/mock-ai.ts` | MOCK_JSON_RESPONSE 신규 스키마로 업데이트 |
| 프롬프트 공통 | `src/services/core/prompt-builder.ts` | JSON 스키마 지시문, 언어 키 목록, 깊이 가이드 변경 |
| 타로 서비스 | `src/services/tarot/tarot-service.ts` | parseResult 매퍼 변경 |
| 타로 토큰 | `src/app/api/tarot/reading/route.ts` | computeReadingMaxTokens 공식 3배 |
| 사주 서비스 | `src/services/saju/saju-service.ts` | sajuSections 추가, 프롬프트·파서 변경 |
| 사주 토큰 | `src/app/api/saju/reading/route.ts` | computeSajuReadingMaxTokens 3배 |
| 신점 서비스 | `src/services/shinjeom/shinjeom-service.ts` | shinjeomSections 추가, 프롬프트·파서 변경 |
| 신점 토큰 | `src/app/api/shinjeom/message/route.ts` | 토큰 상수 3배 |
| 신규 컴포넌트 | `src/components/session/ReadingSectionBlock.tsx` | 섹션 헤더+구분선+본문 공통 렌더러 |
| 타로 컴포넌트 | `src/components/tarot/CardInterpretationList.tsx` | ReadingSectionBlock 3개로 교체 |
| 사주 세션 | `src/app/saju/session/page.tsx` | sajuSections 렌더링 추가 |
| 사주 결과 | `src/app/saju/result/[id]/page.tsx` | sajuSections 렌더링 추가 |
| 신점 세션 | `src/app/shinjeom/session/page.tsx` | shinjeomSections 렌더링 추가 |
| 신점 결과 | `src/app/shinjeom/result/[id]/page.tsx` | shinjeomSections 렌더링 추가 |
| i18n 타입 | `src/i18n/translations/shared/keys.ts` | 섹션 라벨 11개 키 타입 추가 |
| i18n 한국어 | `src/i18n/translations/ko/index.ts` | 11개 한국어 값 추가 |
| i18n 영어 | `src/i18n/translations/en/index.ts` | 11개 영어 값 추가 |
| i18n 일본어 | `src/i18n/translations/ja/index.ts` | 11개 일본어 값 추가 |
| SonarCloud | `sonar-project.properties` | ReadingSectionBlock exclusion 추가 |
| 타로 테스트 | `src/__tests__/api/tarot-reading.test.ts` | 신규 스키마 기준 업데이트 |
| 사주 테스트 | `src/__tests__/api/saju-reading.test.ts` | sajuSections 포함 업데이트 |
| 신점 테스트 | `src/__tests__/api/shinjeom-message.test.ts` | shinjeomSections 포함 업데이트 |

---

## Task 1: 타입 레이어 확장

**Files:**
- Modify: `src/types/service.ts:6`

- [ ] **Step 1: 현재 타입 확인**

```bash
pnpm type-check 2>&1 | head -5
```
Expected: 현재 에러 없음 확인.

- [ ] **Step 2: ReadingResult 타입 확장**

`src/types/service.ts` 6번째 줄을 다음으로 교체한다:

```typescript
export interface SajuSections {
  structure: string;
  elements: string;
  fortune: string;
  guidance: string;
}

export interface ShinjeomSections {
  spiritual: string;
  current: string;
  obstacles: string;
  future: string;
}

export interface ReadingResult {
  cardInterpretations?: {
    cardId: string;
    position: number;
    /** @deprecated 구형 DB 결과 하위호환. 신규 AI 응답은 symbolism/situation/action 사용 */
    interpretation?: string;
    isReversed?: boolean;
    symbolism?: string;
    situation?: string;
    action?: string;
  }[];
  overallReading: string;
  advice: string;
  topicReading?: string;
  sajuSections?: SajuSections;
  shinjeomSections?: ShinjeomSections;
  shareToken?: string | null;
  parseError?: "truncated" | "invalid_json" | "fallback_text" | "missing_fields";
  expectedCardCount?: number;
}
```

> 주의: `service.ts`에 기존 `ReadingResult` 인터페이스가 이미 있다면 전체를 위 내용으로 교체한다. `SajuSections`·`ShinjeomSections`는 파일 상단에 새로 삽입한다.

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 기존 코드가 `interpretation`을 optional로 사용 중이면 에러 발생 가능. 에러가 있으면 해당 위치에서 `interpretation?` (optional)으로 수정하거나 non-null assertion 제거.

- [ ] **Step 4: 커밋**

```bash
git add src/types/service.ts
git commit -m "feat(types): ReadingResult에 symbolism/situation/action·SajuSections·ShinjeomSections 추가"
```

---

## Task 2: 테스트 Mock 업데이트

**Files:**
- Modify: `src/test-helpers/mock-ai.ts`

- [ ] **Step 1: MOCK_JSON_RESPONSE를 신규 스키마로 교체**

`src/test-helpers/mock-ai.ts`의 `MOCK_JSON_RESPONSE` 상수를 다음으로 교체한다:

```typescript
const MOCK_JSON_RESPONSE = JSON.stringify({
  cardInterpretations: [{
    cardId: "major-00",
    position: 0,
    symbolism: "바보 카드의 주인공은 낭떠러지 끝에서 가볍게 발을 내딛고 있습니다.\\n\\n그의 배낭은 가볍고, 하얀 장미는 순수함을 상징합니다.\\n\\n수비학적으로 0번은 무한한 가능성과 새로운 시작을 의미합니다.",
    situation: "현재 당신이 처한 자리에서 바보 카드는 새로운 출발을 앞두고 있음을 나타냅니다.\\n\\n지금 이 시점은 두려움보다 호기심이 더 강한 힘이 됩니다.\\n\\n익숙한 것을 내려놓고 새로운 방향으로 첫 발을 내딛을 준비가 되어 있습니다.",
    action: "이번 주 안에 오래 미뤄온 결정 하나를 실행에 옮기세요.\\n\\n주변의 부정적인 의견보다 자신의 직관을 먼저 신뢰하세요.\\n\\n피해야 할 것: 모든 조건이 완벽해질 때까지 기다리는 것.",
    isReversed: false,
  }],
  overallReading: "테스트 전체 리딩 결과입니다.",
  advice: "테스트 조언입니다.",
  topicReading: "테스트 주제 리딩입니다.",
  sajuSections: {
    structure: "테스트 사주 구조 분석입니다.",
    elements: "테스트 오행 분석입니다.",
    fortune: "테스트 대운 흐름입니다.",
    guidance: "테스트 시기별 조언입니다.",
  },
  shinjeomSections: {
    spiritual: "테스트 신명의 메시지입니다.",
    current: "테스트 현재 흐름입니다.",
    obstacles: "테스트 어려움의 원인입니다.",
    future: "테스트 미래의 흐름입니다.",
  },
});
```

- [ ] **Step 2: 테스트 실행 — 기존 테스트가 통과하는지 확인**

```bash
pnpm test:coverage --reporter=verbose src/__tests__/api/tarot-reading.test.ts 2>&1 | tail -30
```
Expected: 일부 테스트가 `interpretation` 필드를 직접 검증하면 실패. 다음 Task에서 서비스 파서를 바꾼 후 테스트를 업데이트한다.

- [ ] **Step 3: 커밋**

```bash
git add src/test-helpers/mock-ai.ts
git commit -m "test(mock): MOCK_JSON_RESPONSE를 symbolism/situation/action 신규 스키마로 업데이트"
```

---

## Task 3: 타로 — prompt-builder JSON 스키마 + 깊이 가이드

**Files:**
- Modify: `src/services/core/prompt-builder.ts`

- [ ] **Step 1: 언어 지시문 키 목록 업데이트**

`prompt-builder.ts` 20번째 줄 (en 언어 지시문) 내에서 `interpretation` → `symbolism, situation, action` 으로 변경한다.

변경 전:
```
"EXACT English JSON keys (cardInterpretations, cardId, position, interpretation, overallReading, topicReading, advice)"
```

변경 후:
```
"EXACT English JSON keys (cardInterpretations, cardId, position, symbolism, situation, action, overallReading, topicReading, advice)"
```

같은 방식으로 21번째 줄 (ja 언어 지시문)에서도 `interpretation` → `symbolism, situation, action` 으로 변경한다.

- [ ] **Step 2: 시스템 프롬프트 내 JSON 스키마 형식 변경**

`buildSystemPrompt()` 함수 내 JSON 예시 부분 (현재 ~95-96번 줄):

변경 전:
```typescript
{
  "cardInterpretations": [
    { "cardId": "카드 ID", "position": 0, "interpretation": "문단1\\n\\n문단2" }
  ],
  "overallReading": "문단1\\n\\n문단2",
  "advice": "조언 내용"
}
```

변경 후:
```typescript
{
  "cardInterpretations": [
    {
      "cardId": "카드 ID",
      "position": 0,
      "symbolism": "카드 그림 요소·전통 상징·원소·수비학 의미. 3~4문단, 각 문단 \\\\n\\\\n으로 구분",
      "situation": "카드 위치 관점에서 사용자 상황·주제와 연결. 3~4문단",
      "action": "지금 할 행동 2~3가지 + 피할 행동 1가지 + 시간 기준. 3~4문단"
    }
  ],
  "overallReading": "카드 간 연결·흐름·핵심 메시지. 12문단 이상",
  "advice": "구체적 행동 지침. 6~9문단"
}
```

- [ ] **Step 3: 응답 길이 규칙 텍스트 업데이트**

`buildSystemPrompt()` 내 "중요 규칙 — 응답 길이" 섹션 (~60-65번 줄):

변경 전:
```
- 각 카드 해석(interpretation)은 카드의 상징, 위치 의미, 실생활 적용을 포함하여 충실하게 작성합니다.
```

변경 후:
```
- 각 카드 해석은 symbolism(카드 상징·전통 의미) / situation(사용자 상황 연결) / action(구체적 행동 지침) 3개 섹션으로 각 3~4문단, 총 9~12문단으로 작성합니다.
- symbolism: 카드 그림 요소(인물·동물·색상·숫자·배경)를 구체적으로 언급하고 "이 카드에서 ~는 ~이기 때문에 ~를 의미합니다" 연결 구조를 사용합니다. 금지: "~를 상징합니다" 단순 나열.
- situation: 카드가 놓인 위치 관점에서만 해석하고 선택된 주제와 연결합니다. 구체적 현실 상황 예시를 포함합니다. 다른 카드 참조 금지.
- action: 행동 2~3가지 + 피할 행동 1가지를 구체적으로 명시하고 시간 기준("이번 주 안에", "한 달 내로")을 포함합니다. 금지: "내면의 소리를 들어라" 같은 추상적 조언.
- 종합 해석(overallReading)은 카드 간 관계와 전체 흐름을 12문단 이상으로 분석합니다.
- 조언(advice)은 구체적이고 실용적인 행동 지침을 6~9문단으로 작성합니다.
```

- [ ] **Step 4: buildReadingPrompt의 depthGuide 업데이트**

`buildReadingPrompt()` 내 `depthGuide` 상수 (~125-132번 줄):

변경 전:
```typescript
const depthGuide = `해석 깊이 지침 (${cardCount}장 스프레드):
- 각 카드 해석(interpretation)은 카드 수와 관계없이 3~4문단으로 깊이 있고 풍부하게 작성합니다.
- 카드의 상징, 위치 의미, 실생활 적용을 충실하게 풀어줍니다.
- 해당 위치(position)의 관점에서만 해석하고, 다른 위치의 카드 내용을 중복하지 않습니다.
- 종합 해석(overallReading)은 카드 간 관계, 전체 흐름, 핵심 메시지를 4~5문단으로 깊이 있게 분석합니다.
- 조언(advice)은 구체적이고 실용적인 행동 지침을 2~3문단으로 작성합니다.`;
```

변경 후:
```typescript
const depthGuide = `해석 깊이 지침 (${cardCount}장 스프레드):
각 카드 해석은 3개 섹션으로 나눠 각 섹션당 3~4문단으로 작성합니다 (카드 1장 = 총 9~12문단).

[symbolism] 카드 상징·이미지 분석 (3~4문단):
- 카드 그림의 주요 요소(인물·동물·색상·숫자·배경)를 구체적으로 언급합니다
- RWS/토트 전통 의미, 원소(불/물/공기/흙), 수비학적 배경을 연결해 서술합니다
- 정방향/역방향 에너지 차이를 설명합니다
- 필수: "이 카드에서 ~는 ~이기 때문에 ~를 의미합니다" 연결 구조 사용
- 금지: "~를 상징합니다" 단순 나열

[situation] 사용자 상황 연결 (3~4문단):
- 카드가 놓인 위치(해당 position)의 관점에서만 해석합니다. 다른 카드 참조 금지
- 선택된 주제(${topicLabels[topic] ?? topic})와 반드시 연결합니다
- 구체적 현실 상황 예시를 포함합니다 ("~라면", "~의 경우")

[action] 구체적 행동 지침 (3~4문단):
- 지금 당장 할 수 있는 행동 2~3가지를 구체적으로 명시합니다
- 피해야 할 행동 1가지를 명시합니다
- 시간적 관점 포함: "이번 주 안에", "한 달 내로", "지금 당장"
- 금지: "내면의 소리를 들어라" 같은 추상적 조언
- 금지: "변화가 올 것입니다" 같은 수동적 예언

종합 해석(overallReading): 카드 간 관계·전체 흐름·핵심 메시지를 12문단 이상으로 분석합니다.
조언(advice): 구체적이고 실용적인 행동 지침을 6~9문단으로 작성합니다.`;
```

> 주의: `topicLabels`가 `buildReadingPrompt` 범위 내에서 접근 가능한지 확인한다. 별도 import가 필요하면 추가한다.

- [ ] **Step 5: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/services/core/prompt-builder.ts
git commit -m "feat(prompt): 타로 JSON 스키마를 symbolism/situation/action 3섹션 구조로 변경, 깊이 가이드 3배 상향"
```

---

## Task 4: 타로 서비스 파서 + max_tokens

**Files:**
- Modify: `src/services/tarot/tarot-service.ts:43-46`
- Modify: `src/app/api/tarot/reading/route.ts:38-40`

- [ ] **Step 1: tarot-service.ts parseResult 매퍼 업데이트**

`parseResult()` 내 cardInterpretations 매퍼 (~43-46번 줄):

변경 전:
```typescript
const cardInterpretations = (Array.isArray(parsed.cardInterpretations) ? parsed.cardInterpretations : []).map(
  (interp: { cardId: string; position: number; interpretation: string; isReversed?: boolean }) => ({
    ...interp,
    interpretation: cleanReadingText(String(interp.interpretation || "")),
  })
);
```

변경 후:
```typescript
const cardInterpretations = (Array.isArray(parsed.cardInterpretations) ? parsed.cardInterpretations : []).map(
  (interp: {
    cardId: string;
    position: number;
    interpretation?: string;
    isReversed?: boolean;
    symbolism?: string;
    situation?: string;
    action?: string;
  }) => ({
    cardId: interp.cardId,
    position: interp.position,
    isReversed: interp.isReversed,
    // 신규 필드 (3섹션 구조)
    ...(interp.symbolism !== undefined && { symbolism: cleanReadingText(String(interp.symbolism)) }),
    ...(interp.situation !== undefined && { situation: cleanReadingText(String(interp.situation)) }),
    ...(interp.action !== undefined && { action: cleanReadingText(String(interp.action)) }),
    // 구형 필드 하위호환 (DB 저장 결과 조회 시)
    ...(interp.interpretation !== undefined && { interpretation: cleanReadingText(String(interp.interpretation)) }),
  })
);
```

- [ ] **Step 2: route.ts computeReadingMaxTokens 변경**

`src/app/api/tarot/reading/route.ts` 38-40번 줄:

변경 전:
```typescript
function computeReadingMaxTokens(cardCount: number): number {
  // 전 구간 단일 공식 — 경계값 불연속 없이 카드 수에 비례해 선형 증가
  return Math.min(4000 + cardCount * 2500 + 5000, 60000);
}
```

변경 후:
```typescript
function computeReadingMaxTokens(cardCount: number): number {
  // 3섹션(symbolism/situation/action) 구조로 카드당 9~12문단 → 3배 깊이
  // 1장: 34,500 / 3장: 49,500 / 4장: 57,000 / 5장+: 60,000(캡)
  return Math.min(12000 + cardCount * 7500 + 15000, 60000);
}
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/services/tarot/tarot-service.ts src/app/api/tarot/reading/route.ts
git commit -m "feat(tarot): parseResult 3섹션 매퍼 추가, max_tokens 3배 상향"
```

---

## Task 5: 사주 서비스 — 프롬프트 + 파서 + max_tokens

**Files:**
- Modify: `src/services/saju/saju-service.ts`
- Modify: `src/app/api/saju/reading/route.ts:26-33`

- [ ] **Step 1: getSystemPrompt JSON 스키마에 sajuSections 추가**

`saju-service.ts` `getSystemPrompt()` 내 JSON 형식 부분 (~225-228번 줄):

변경 전:
```typescript
{
  "overallReading": "【사주 전체 구조】...",
  "topicReading": "선택한 주제와 시간 범위...",
  "advice": "용신·희신 기반의 실용적 행동 지침..."
}
```

변경 후:
```typescript
{
  "sajuSections": {
    "structure": "일간 오행·음양·십신 특성 → 격국 판단(신강/신약) → 오행 강약 → 현재 삶의 패턴 연결. 3~4문단, 각 문단 \\\\n\\\\n으로 구분",
    "elements": "용신·기신 명시(왜 그 오행인지 근거 포함) → 오행 과다/부족이 삶에 미치는 영향 → 실생활 보완법(색상·음식·방향·활동 구체적으로). 3~4문단",
    "fortune": "현재 대운 단계·에너지 방향 → 세운과 대운의 교차 작용 → 변곡점 시기 → 주의해야 할 시기와 이유. 3~4문단",
    "guidance": "주제별 유리한 시기·불리한 시기(월 단위 구체적으로) → 지금 당장 할 것 2~3가지 → 피해야 할 것 1가지. 3~4문단"
  },
  "overallReading": "【사주 전체 구조】일간 특성·신강신약·격국 → 【오행 분포】과잉·부족 기운의 삶에 대한 영향 → 【용신·희신】핵심 에너지와 활용법 → 【대운 흐름】현재 대운이 일간에 미치는 영향 → 【세운】올해 세운과 대운의 교차 작용 → 【전반 전망】현재 위치와 앞으로의 큰 흐름. 최소 12문단 이상",
  "topicReading": "선택한 주제와 시간 범위에 특화된 심층 분석. 시기별 구체적 흐름(월별·분기별 포함). 최소 10문단 이상",
  "advice": "용신·희신 기반의 실용적 행동 지침. 지금 당장 강화해야 할 것, 피해야 할 것, 일상에서 실천 가능한 구체적 방법. 최소 6문단 이상"
}
```

- [ ] **Step 2: buildSajuPrompt 분량 기준 업데이트**

`buildSajuPrompt()` 내 `[분량 기준]` 섹션 (~268-271번 줄):

변경 전:
```
[분량 기준]
- overallReading: 사주팔자 전체 구조(일간→오행→용신→대운→세운)를 최소 6문단 이상, 각 문단은 3~5문장으로 풍부하게 서술
- topicReading: 위 주제·시간 범위에 맞게 시기별 흐름, 기회·주의 구간, 구체적 상황 예측을 최소 4문단 이상
- advice: 용신·희신 기반의 실용적 행동 지침과 일상 실천 방법을 최소 3문단 이상
```

변경 후:
```
[분량 기준]
- sajuSections: 4개 섹션(structure·elements·fortune·guidance) 각 3~4문단. 섹션 간 내용 중복 금지
  - structure: 사주 구조·일간·오행·격국의 본질을 현실 패턴과 연결
  - elements: 용신·기신을 명확히 하고 실생활 보완법을 구체적으로
  - fortune: 대운·세운 흐름을 시기·변곡점·주의 시기로 구체화
  - guidance: 주제별 유리/불리 시기를 월 단위로 + 지금 할 행동
- overallReading: 최소 12문단 이상, 각 문단 3~5문장
- topicReading: 최소 10문단 이상
- advice: 최소 6문단 이상
```

- [ ] **Step 3: parseResult에 sajuSections 추출 추가**

`saju-service.ts` `parseResult()` 내 (~277-285번 줄):

변경 전:
```typescript
if (parsed) {
  const overallReading = cleanReadingText(String(parsed.overallReading || ""));
  const advice = cleanReadingText(String(parsed.advice || ""));
  const result: ReadingResult = {
    overallReading,
    topicReading: cleanReadingText(String(parsed.topicReading || "")),
    advice,
  };
  if (!overallReading || !advice) result.parseError = "missing_fields";
  return result;
}
```

변경 후:
```typescript
if (parsed) {
  const overallReading = cleanReadingText(String(parsed.overallReading || ""));
  const advice = cleanReadingText(String(parsed.advice || ""));
  const result: ReadingResult = {
    overallReading,
    topicReading: cleanReadingText(String(parsed.topicReading || "")),
    advice,
  };
  if (parsed.sajuSections && typeof parsed.sajuSections === "object") {
    result.sajuSections = {
      structure: cleanReadingText(String(parsed.sajuSections.structure || "")),
      elements:  cleanReadingText(String(parsed.sajuSections.elements || "")),
      fortune:   cleanReadingText(String(parsed.sajuSections.fortune || "")),
      guidance:  cleanReadingText(String(parsed.sajuSections.guidance || "")),
    };
  }
  if (!overallReading || !advice) result.parseError = "missing_fields";
  return result;
}
```

- [ ] **Step 4: computeSajuReadingMaxTokens 변경**

`src/app/api/saju/reading/route.ts` 26-33번 줄:

변경 전:
```typescript
function computeSajuReadingMaxTokens(timeRange: SajuTimeRange, includeMonthly: boolean): number {
  if (includeMonthly) return 28000;
  if (timeRange === "five-year") return 22000;
  if (timeRange === "full-fortune") return 25000;
  if (timeRange === "three-year" || timeRange === "next-year") return 20000;
  return 16000;
}
```

변경 후:
```typescript
function computeSajuReadingMaxTokens(timeRange: SajuTimeRange, includeMonthly: boolean): number {
  // sajuSections 4개 섹션 추가 + 기존 필드 3배 상향
  if (includeMonthly) return 60000;
  if (timeRange === "five-year") return 60000;
  if (timeRange === "full-fortune") return 60000;
  if (timeRange === "three-year" || timeRange === "next-year") return 60000;
  return 48000; // this-week / this-month / this-year
}
```

- [ ] **Step 5: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/services/saju/saju-service.ts src/app/api/saju/reading/route.ts
git commit -m "feat(saju): sajuSections 4섹션 추가, 프롬프트 3배 심화, max_tokens 3배 상향"
```

---

## Task 6: 신점 서비스 — 프롬프트 + 파서 + 토큰

**Files:**
- Modify: `src/services/shinjeom/shinjeom-service.ts`
- Modify: `src/app/api/shinjeom/message/route.ts:21-22`

- [ ] **Step 1: buildConversationPrompt (최종 턴) JSON 스키마에 shinjeomSections 추가**

`shinjeom-service.ts` 최종 턴 JSON 형식 부분 (~106-107번 줄 직전):

기존 JSON 형식:
```json
{
  "overallReading": "...",
  "topicReading": "...",
  "advice": "..."
}
```

다음으로 교체:
```typescript
{
  "shinjeomSections": {
    "spiritual": "신명이 가장 강하게 전하는 메시지 → 현재 영적 에너지 상태(기운이 흐르는지 막혔는지) → 업·인연의 관점에서 이 상황의 의미. 3~4문단, 각 문단 \\n\\n으로 구분",
    "current": "지금 흐름의 방향(어디로 향하고 있는가) → 주변 환경·인간관계 에너지(도움이 되는 기운, 방해가 되는 기운) → 현재 당기고 있는 것과 밀어내야 할 것. 3~4문단",
    "obstacles": "어려움의 근본 원인(업/환경/자신 중 어디에서 비롯됐는가) → 지금 막고 있는 에너지의 정체 → 풀어야 할 것과 풀 수 있는 방법. 3~4문단",
    "future": "흐름이 전환되는 조건과 시기 → 좋아지는 시기(조건부, 구체적 월 제시) → 반드시 피해야 할 선택과 그 이유. 3~4문단"
  },
  "overallReading": "【신명의 메시지】전체 기운과 신명이 전하는 핵심 메시지\\n\\n【현재 흐름】지금 이 시기의 운세 에너지와 상황 맥락\\n\\n【환경과 주변 기운】주변 인물·환경이 미치는 영향\\n\\n【어려움의 영적 원인】현재 겪고 있는 문제의 근원적 의미\\n\\n【가까운 미래 전망】앞으로 3~6개월의 흐름 예측\\n\\n【중요한 시기】특히 주의하거나 기회가 되는 구체적 시점\\n\\n【삶의 방향】이 상황이 삶 전체에서 갖는 의미와 성장 포인트. 각 섹션 최소 3~5문장. 전체 최소 12문단 이상.",
  "topicReading": "선택 주제에 대한 심층 신점 해석. 긍정적 기운과 도전 요소를 균형 있게 분석. 시기별 구체적 흐름(이번 달·3개월·6개월). 상황이 바뀌는 전환점 예측. 최소 10문단 이상.",
  "advice": "【지금 당장 할 것】오늘부터 실천 가능한 구체적 행동 2~3가지\\n\\n【기도·의식】정화와 좋은 기운을 부르는 방법(구체적 방법과 시기)\\n\\n【액막이·보호】현재 상황에 맞는 영적 보호 방법\\n\\n【관계·환경 조언】주변 사람·공간·물건에 관한 실질 조언\\n\\n【마음가짐】내면의 변화를 위한 조언. 최소 6문단 이상."
}
```

- [ ] **Step 2: parseResult에 shinjeomSections 추출 추가**

`shinjeom-service.ts` `parseResult()` (~128-135번 줄):

변경 전:
```typescript
if (parsed) {
  const overallReading = cleanReadingText(typeof parsed.overallReading === "string" ? parsed.overallReading : "");
  const advice = cleanReadingText(typeof parsed.advice === "string" ? parsed.advice : "");
  const result: ReadingResult = {
    overallReading,
    topicReading: cleanReadingText(typeof parsed.topicReading === "string" ? parsed.topicReading : ""),
    advice,
  };
  if (!overallReading || !advice) result.parseError = "missing_fields";
  return result;
}
```

변경 후:
```typescript
if (parsed) {
  const overallReading = cleanReadingText(typeof parsed.overallReading === "string" ? parsed.overallReading : "");
  const advice = cleanReadingText(typeof parsed.advice === "string" ? parsed.advice : "");
  const result: ReadingResult = {
    overallReading,
    topicReading: cleanReadingText(typeof parsed.topicReading === "string" ? parsed.topicReading : ""),
    advice,
  };
  if (parsed.shinjeomSections && typeof parsed.shinjeomSections === "object") {
    result.shinjeomSections = {
      spiritual: cleanReadingText(String(parsed.shinjeomSections.spiritual || "")),
      current:   cleanReadingText(String(parsed.shinjeomSections.current || "")),
      obstacles: cleanReadingText(String(parsed.shinjeomSections.obstacles || "")),
      future:    cleanReadingText(String(parsed.shinjeomSections.future || "")),
    };
  }
  if (!overallReading || !advice) result.parseError = "missing_fields";
  return result;
}
```

- [ ] **Step 3: 토큰 상수 변경**

`src/app/api/shinjeom/message/route.ts` 21-22번 줄:

변경 전:
```typescript
const SHINJEOM_TOKENS_FINAL = 16000;
const SHINJEOM_TOKENS_CHAT = 3000;
```

변경 후:
```typescript
const SHINJEOM_TOKENS_FINAL = 48000;  // shinjeomSections 4섹션 + 전체 3배 심화
const SHINJEOM_TOKENS_CHAT = 6000;    // 대화 턴: 공감·통찰·질문 (2배)
```

- [ ] **Step 4: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/services/shinjeom/shinjeom-service.ts src/app/api/shinjeom/message/route.ts
git commit -m "feat(shinjeom): shinjeomSections 4섹션 추가, 프롬프트 3배 심화, 토큰 3배 상향"
```

---

## Task 7: ReadingSectionBlock 컴포넌트 신규 생성

**Files:**
- Create: `src/components/session/ReadingSectionBlock.tsx`
- Modify: `sonar-project.properties`

- [ ] **Step 1: 컴포넌트 생성**

`src/components/session/ReadingSectionBlock.tsx` 파일을 생성한다:

```typescript
"use client";

import { ReadingText } from "@/components/common/ReadingText";

interface ReadingSectionBlockProps {
  icon: string;
  label: string;
  content: string;
}

export function ReadingSectionBlock({ icon, label, content }: ReadingSectionBlockProps) {
  if (!content) return null;
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-arcana-gold text-xs font-bold tracking-widest uppercase font-sans">
          {icon} {label}
        </span>
      </div>
      <div className="border-t border-arcana-border/40 pt-3">
        <ReadingText text={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: sonar-project.properties exclusion 추가**

`sonar-project.properties`에서 `src/components/session/ResultTextCard.tsx,` 다음 줄에 추가한다:

```
  src/components/session/ReadingSectionBlock.tsx,\
```

(coverage.exclusions와 cpd.exclusions 두 곳 모두 추가한다.)

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -10
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/session/ReadingSectionBlock.tsx sonar-project.properties
git commit -m "feat(components): ReadingSectionBlock 섹션 헤더+구분선+본문 공통 렌더러 추가"
```

---

## Task 8: CardInterpretationList — 3섹션 렌더링으로 교체

**Files:**
- Modify: `src/components/tarot/CardInterpretationList.tsx`

- [ ] **Step 1: i18n 훅 추가 + 섹션 라벨 상수 정의**

`CardInterpretationList.tsx` 파일 상단 import 다음에 추가한다:

```typescript
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
```

기존 `interface CardInterpretation` 정의를 다음으로 교체한다:

```typescript
interface CardInterpretation {
  cardId: string;
  position: number;
  /** @deprecated 구형 DB 결과 하위호환 */
  interpretation?: string;
  isReversed?: boolean;
  symbolism?: string;
  situation?: string;
  action?: string;
}

const SECTION_LABELS = {
  ko: { symbolism: "카드가 말하는 것", situation: "지금 당신의 상황", action: "지금 할 수 있는 것" },
  en: { symbolism: "What the Card Says", situation: "Your Current Situation", action: "What You Can Do Now" },
  ja: { symbolism: "カードが語ること", situation: "あなたの今の状況", action: "今できること" },
} as const;
```

- [ ] **Step 2: 렌더링 로직 교체**

`CardInterpretationList` 컴포넌트 반환부에서 `<ReadingText text={interp.interpretation} />` 부분을 다음으로 교체한다:

```typescript
{/* 신규: 3섹션 구조 */}
{(interp.symbolism || interp.situation || interp.action) ? (
  <>
    <ReadingSectionBlock
      icon="✦"
      label={(SECTION_LABELS[locale as keyof typeof SECTION_LABELS] ?? SECTION_LABELS.ko).symbolism}
      content={interp.symbolism ?? ""}
    />
    <ReadingSectionBlock
      icon="◈"
      label={(SECTION_LABELS[locale as keyof typeof SECTION_LABELS] ?? SECTION_LABELS.ko).situation}
      content={interp.situation ?? ""}
    />
    <ReadingSectionBlock
      icon="▶"
      label={(SECTION_LABELS[locale as keyof typeof SECTION_LABELS] ?? SECTION_LABELS.ko).action}
      content={interp.action ?? ""}
    />
  </>
) : (
  /* 구형 DB 결과 하위호환 */
  <ReadingText text={interp.interpretation ?? ""} />
)}
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/tarot/CardInterpretationList.tsx
git commit -m "feat(tarot): CardInterpretationList를 symbolism/situation/action 3섹션 렌더링으로 교체"
```

---

## Task 9: 사주 세션 + 결과 페이지 — sajuSections 렌더링

**Files:**
- Modify: `src/app/saju/session/page.tsx`
- Modify: `src/app/saju/result/[id]/page.tsx`

- [ ] **Step 1: session/page.tsx에 sajuSections 렌더링 추가**

`src/app/saju/session/page.tsx`에서 `ResultTextCard`를 import하는 줄 아래에 추가한다:

```typescript
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
```

사주 세션 결과 렌더링 부분에서 `<ResultTextCard text={readingResult.overallReading} ...` 코드 **앞에** 다음을 추가한다:

```typescript
{readingResult.sajuSections && (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 }}
    className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5"
  >
    <ReadingSectionBlock icon="✦" label={t("reading.section.saju.structure")} content={readingResult.sajuSections.structure} />
    <ReadingSectionBlock icon="◈" label={t("reading.section.saju.elements")}  content={readingResult.sajuSections.elements} />
    <ReadingSectionBlock icon="▶" label={t("reading.section.saju.fortune")}   content={readingResult.sajuSections.fortune} />
    <ReadingSectionBlock icon="◎" label={t("reading.section.saju.guidance")}  content={readingResult.sajuSections.guidance} />
  </motion.div>
)}
```

> 주의: `motion` import가 없으면 `import { motion } from "framer-motion"` 추가. `t()` / `useT()` 중 이 파일에서 사용하는 것을 따른다.

- [ ] **Step 2: result/[id]/page.tsx에 sajuSections 렌더링 추가**

`src/app/saju/result/[id]/page.tsx`에서 `overallReading` 블록 **앞에** 다음을 추가한다:

```typescript
{result.sajuSections && (
  <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5 mb-4">
    <ReadingSectionBlock icon="✦" label={t("reading.section.saju.structure", locale)} content={result.sajuSections.structure} />
    <ReadingSectionBlock icon="◈" label={t("reading.section.saju.elements", locale)}  content={result.sajuSections.elements} />
    <ReadingSectionBlock icon="▶" label={t("reading.section.saju.fortune", locale)}   content={result.sajuSections.fortune} />
    <ReadingSectionBlock icon="◎" label={t("reading.section.saju.guidance", locale)}  content={result.sajuSections.guidance} />
  </div>
)}
```

import 추가:
```typescript
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/saju/session/page.tsx src/app/saju/result/[id]/page.tsx
git commit -m "feat(saju): 세션·결과 페이지에 sajuSections 4섹션 렌더링 추가"
```

---

## Task 10: 신점 세션 + 결과 페이지 — shinjeomSections 렌더링

**Files:**
- Modify: `src/app/shinjeom/session/page.tsx`
- Modify: `src/app/shinjeom/result/[id]/page.tsx`

- [ ] **Step 1: shinjeom/session/page.tsx에 shinjeomSections 렌더링 추가**

`src/app/shinjeom/session/page.tsx`에 import 추가:

```typescript
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
```

`<ResultTextCard text={readingResult.overallReading} ...` **앞에** 추가:

```typescript
{readingResult.shinjeomSections && (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.05 }}
    className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5"
  >
    <ReadingSectionBlock icon="✦" label={t("reading.section.shinjeom.spiritual")} content={readingResult.shinjeomSections.spiritual} />
    <ReadingSectionBlock icon="◈" label={t("reading.section.shinjeom.current")}   content={readingResult.shinjeomSections.current} />
    <ReadingSectionBlock icon="▶" label={t("reading.section.shinjeom.obstacles")} content={readingResult.shinjeomSections.obstacles} />
    <ReadingSectionBlock icon="◎" label={t("reading.section.shinjeom.future")}    content={readingResult.shinjeomSections.future} />
  </motion.div>
)}
```

- [ ] **Step 2: shinjeom/result/[id]/page.tsx에 shinjeomSections 렌더링 추가**

`src/app/shinjeom/result/[id]/page.tsx`에 import 추가:

```typescript
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
```

`overallReading` 섹션 **앞에** 추가:

```typescript
{result.shinjeomSections && (
  <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5 mb-4">
    <ReadingSectionBlock icon="✦" label={t("reading.section.shinjeom.spiritual", locale)} content={result.shinjeomSections.spiritual} />
    <ReadingSectionBlock icon="◈" label={t("reading.section.shinjeom.current", locale)}   content={result.shinjeomSections.current} />
    <ReadingSectionBlock icon="▶" label={t("reading.section.shinjeom.obstacles", locale)} content={result.shinjeomSections.obstacles} />
    <ReadingSectionBlock icon="◎" label={t("reading.section.shinjeom.future", locale)}    content={result.shinjeomSections.future} />
  </div>
)}
```

- [ ] **Step 3: 타입 검사**

```bash
pnpm type-check 2>&1 | head -20
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/shinjeom/session/page.tsx src/app/shinjeom/result/[id]/page.tsx
git commit -m "feat(shinjeom): 세션·결과 페이지에 shinjeomSections 4섹션 렌더링 추가"
```

---

## Task 11: i18n — 섹션 라벨 11개 키 추가

**Files:**
- Modify: `src/i18n/translations/shared/keys.ts`
- Modify: `src/i18n/translations/ko/index.ts`
- Modify: `src/i18n/translations/en/index.ts`
- Modify: `src/i18n/translations/ja/index.ts`

- [ ] **Step 1: shared/keys.ts 타입 추가**

`src/i18n/translations/shared/keys.ts`에서 `tarot:` 섹션 (`"result.title": string;` 앞)에 다음을 추가한다:

```typescript
reading: {
  "section.symbolism": string;
  "section.situation": string;
  "section.action": string;
  "section.saju.structure": string;
  "section.saju.elements": string;
  "section.saju.fortune": string;
  "section.saju.guidance": string;
  "section.shinjeom.spiritual": string;
  "section.shinjeom.current": string;
  "section.shinjeom.obstacles": string;
  "section.shinjeom.future": string;
};
```

- [ ] **Step 2: ko/index.ts 한국어 값 추가**

`src/i18n/translations/ko/index.ts`에서 `tarot:` 섹션 앞에 다음을 추가한다:

```typescript
reading: {
  "section.symbolism": "카드가 말하는 것",
  "section.situation": "지금 당신의 상황",
  "section.action": "지금 할 수 있는 것",
  "section.saju.structure": "사주 구조 분석",
  "section.saju.elements": "오행과 용신",
  "section.saju.fortune": "대운과 세운 흐름",
  "section.saju.guidance": "시기별 조언",
  "section.shinjeom.spiritual": "신명의 메시지",
  "section.shinjeom.current": "현재 흐름",
  "section.shinjeom.obstacles": "어려움의 원인",
  "section.shinjeom.future": "미래의 흐름",
},
```

- [ ] **Step 3: en/index.ts 영어 값 추가**

`src/i18n/translations/en/index.ts`에 동일 위치에 추가:

```typescript
reading: {
  "section.symbolism": "What the Card Says",
  "section.situation": "Your Current Situation",
  "section.action": "What You Can Do Now",
  "section.saju.structure": "Saju Structure",
  "section.saju.elements": "Elements & Yongsin",
  "section.saju.fortune": "Fortune Flow",
  "section.saju.guidance": "Period Guidance",
  "section.shinjeom.spiritual": "Spiritual Message",
  "section.shinjeom.current": "Current Flow",
  "section.shinjeom.obstacles": "Root of Obstacles",
  "section.shinjeom.future": "Future Flow",
},
```

- [ ] **Step 4: ja/index.ts 일본어 값 추가**

`src/i18n/translations/ja/index.ts`에 동일 위치에 추가:

```typescript
reading: {
  "section.symbolism": "カードが語ること",
  "section.situation": "あなたの今の状況",
  "section.action": "今できること",
  "section.saju.structure": "四柱の構造",
  "section.saju.elements": "五行と用神",
  "section.saju.fortune": "大運・歳運の流れ",
  "section.saju.guidance": "時期別アドバイス",
  "section.shinjeom.spiritual": "神霊のメッセージ",
  "section.shinjeom.current": "現在の流れ",
  "section.shinjeom.obstacles": "困難の原因",
  "section.shinjeom.future": "未来の流れ",
},
```

- [ ] **Step 5: i18n drift 검사**

```bash
pnpm i18n:check 2>&1 | tail -20
```
Expected: drift 없음. 에러 있으면 누락된 키를 추가한다.

- [ ] **Step 6: Task 8·9·10에서 사용한 `t("reading.section.*")` 키를 `t("reading.section.*")` 로 사용하도록 업데이트**

> Task 8-10에서 `t("reading.section.saju.structure")` 형태로 작성했다면 `reading` 네임스페이스가 추가됐으므로 실제 `t()` 호출 방식이 프로젝트 패턴과 일치하는지 확인한다. 프로젝트가 `t("saju.result.overall")` 방식이면 키를 `saju` 네임스페이스에 넣어야 한다. `ko/index.ts`에서 실제 키 접근 패턴을 확인 후 필요시 Task 8-10의 `t()` 호출과 공유 키 타입을 일치시킨다.

- [ ] **Step 7: 타입 검사 + 커밋**

```bash
pnpm type-check 2>&1 | head -10
git add src/i18n/translations/
git commit -m "feat(i18n): 섹션 라벨 11개 키 추가 (ko/en/ja)"
```

---

## Task 12: 타로 API 테스트 업데이트

**Files:**
- Modify: `src/__tests__/api/tarot-reading.test.ts`

- [ ] **Step 1: 현재 테스트 실행 — 실패 항목 파악**

```bash
pnpm test:coverage --reporter=verbose src/__tests__/api/tarot-reading.test.ts 2>&1 | tail -40
```
Expected: `interpretation` 필드를 직접 검증하는 테스트가 실패할 수 있음.

- [ ] **Step 2: `interpretation` 검증을 신규 필드 검증으로 교체**

`tarot-reading.test.ts`에서 `interpretation` 문자열을 검증하는 부분을 찾아 다음으로 교체한다:

변경 전 (검색 패턴):
```typescript
expect(data.result.cardInterpretations[0].interpretation).toBe(...)
// 또는
expect(result.cardInterpretations[0]).toHaveProperty("interpretation")
```

변경 후:
```typescript
expect(data.result.cardInterpretations[0].symbolism).toBeTruthy();
expect(data.result.cardInterpretations[0].situation).toBeTruthy();
expect(data.result.cardInterpretations[0].action).toBeTruthy();
```

- [ ] **Step 3: max_tokens 관련 기댓값 업데이트**

테스트 내에 `toBe(11500)`, `toBe(16500)` 같은 기존 max_tokens 기댓값이 있다면 새 공식으로 업데이트한다:

```typescript
// 1장: 12000 + 1*7500 + 15000 = 34500
expect(mockProvider.streamReading).toHaveBeenCalledWith(
  expect.anything(), expect.anything(), 34500
);
// 3장: 12000 + 3*7500 + 15000 = 49500
expect(mockProvider.streamReading).toHaveBeenCalledWith(
  expect.anything(), expect.anything(), 49500
);
```

- [ ] **Step 4: 테스트 실행 — 전체 통과 확인**

```bash
pnpm test:coverage --reporter=verbose src/__tests__/api/tarot-reading.test.ts 2>&1 | tail -20
```
Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/__tests__/api/tarot-reading.test.ts
git commit -m "test(tarot): API 테스트를 symbolism/situation/action 신규 스키마 기준으로 업데이트"
```

---

## Task 13: 사주·신점 API 테스트 업데이트

**Files:**
- Modify: `src/__tests__/api/saju-reading.test.ts`
- Modify: `src/__tests__/api/shinjeom-message.test.ts`

- [ ] **Step 1: 사주 테스트 — 현재 실패 항목 파악**

```bash
pnpm test:coverage --reporter=verbose src/__tests__/api/saju-reading.test.ts 2>&1 | tail -30
```

- [ ] **Step 2: saju-reading.test.ts — sajuSections 검증 추가**

성공 케이스 검증에 다음을 추가한다:

```typescript
expect(data.result.sajuSections).toBeDefined();
expect(data.result.sajuSections.structure).toBeTruthy();
expect(data.result.sajuSections.elements).toBeTruthy();
expect(data.result.sajuSections.fortune).toBeTruthy();
expect(data.result.sajuSections.guidance).toBeTruthy();
```

max_tokens 기댓값 업데이트 (this-week: 16000 → 48000):
```typescript
expect(mockProvider.streamReading).toHaveBeenCalledWith(
  expect.anything(), expect.anything(), 48000
);
```

- [ ] **Step 3: shinjeom-message.test.ts — shinjeomSections 검증 추가**

최종 턴 성공 케이스에 추가:

```typescript
expect(data.result.shinjeomSections).toBeDefined();
expect(data.result.shinjeomSections.spiritual).toBeTruthy();
expect(data.result.shinjeomSections.current).toBeTruthy();
expect(data.result.shinjeomSections.obstacles).toBeTruthy();
expect(data.result.shinjeomSections.future).toBeTruthy();
```

토큰 기댓값 업데이트 (16000 → 48000, 3000 → 6000):
```typescript
// 최종 턴
expect(mockProvider.streamReading).toHaveBeenCalledWith(
  expect.anything(), expect.anything(), 48000
);
// 대화 턴
expect(mockProvider.streamReading).toHaveBeenCalledWith(
  expect.anything(), expect.anything(), 6000
);
```

- [ ] **Step 4: 테스트 전체 실행**

```bash
pnpm test:coverage --reporter=verbose src/__tests__/api/saju-reading.test.ts src/__tests__/api/shinjeom-message.test.ts 2>&1 | tail -30
```
Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/__tests__/api/saju-reading.test.ts src/__tests__/api/shinjeom-message.test.ts
git commit -m "test(saju,shinjeom): API 테스트를 sajuSections·shinjeomSections 신규 스키마 기준으로 업데이트"
```

---

## Task 14: 최종 검증

- [ ] **Step 1: 전체 타입 검사**

```bash
pnpm type-check 2>&1
```
Expected: 에러 0개.

- [ ] **Step 2: Lint**

```bash
pnpm lint 2>&1 | tail -10
```
Expected: 에러 없음.

- [ ] **Step 3: 전체 테스트 + 커버리지**

```bash
pnpm test:coverage 2>&1 | tail -20
```
Expected: branches ≥ 92%, functions/lines/statements ≥ 98%.

- [ ] **Step 4: 프로덕션 빌드**

```bash
pnpm build 2>&1 | tail -20
```
Expected: 빌드 성공.

- [ ] **Step 5: i18n drift 최종 확인**

```bash
pnpm i18n:check 2>&1
```
Expected: drift 없음.

- [ ] **Step 6: 문서 링크 검사**

```bash
pnpm check:doc-links 2>&1
```
Expected: 에러 없음.

- [ ] **Step 7: 최종 커밋**

```bash
git add -A
git commit -m "chore(validation): 프리미엄 리딩 경험 구현 최종 검증 통과"
```

---

## 완료 기준

- [ ] `pnpm type-check` — 에러 0개
- [ ] `pnpm lint` — 에러 없음
- [ ] `pnpm test:coverage` — branches ≥ 92%, 나머지 ≥ 98%
- [ ] `pnpm build` — 빌드 성공
- [ ] `pnpm i18n:check` — drift 없음
- [ ] 타로 카드 해석이 symbolism/situation/action 3섹션으로 렌더링됨
- [ ] 사주 세션/결과 페이지에 sajuSections 4섹션 렌더링됨
- [ ] 신점 세션/결과 페이지에 shinjeomSections 4섹션 렌더링됨
- [ ] 구형 DB 결과(interpretation 필드)가 하위호환으로 렌더링됨

---

## 참고 사항

- **타임아웃**: 클라이언트 240s 유지. max_tokens 3배 증가로 응답 시간이 길어질 수 있으나 현재 마진 내 처리 가능.
- **구형 DB 결과**: `interpretation` 필드가 있는 구형 결과는 `ReadingText` fallback으로 그대로 렌더링됨.
- **5장+ 타로**: 60,000 토큰 캡 적용. AI가 캡 내에서 최대한 깊게 작성.
- **i18n 키 네임스페이스**: Task 11 Step 6 주의사항 참고. 프로젝트 실제 패턴 확인 필수.
- **관련 스펙**: `docs/superpowers/specs/2026-05-26-premium-reading-experience-design.md`
