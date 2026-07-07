# 타로 리딩 품질 개선 설계 — 3섹션 카드 해석 + directAnswer

**작성일**: 2026-05-29  
**상태**: 승인됨  
**관련 서비스**: 타로 (`/tarot/session`)

---

## 배경 및 목표

현재 타로 리딩 결과가 너무 추상적·모호하다는 사용자 피드백. 두 가지 핵심 문제:

1. **카드별 `situation` 섹션**이 "에너지 흐름을 묘사하되 단정짓지 말라"는 프롬프트 제약으로 인해 의도적으로 모호하게 작성됨
2. **종합 해석**이 사용자의 실제 질문/주제에 직접 답하지 않고 서사 연결에만 집중

**목표**: 모든 사용자 상황(질문 있음/없음, 다양한 삶의 맥락)을 포괄하는 구체적이고 다면적인 리딩 제공

---

## 데이터 구조 변경

### `CardInterpretationItem` — `action` 필드 추가

```typescript
interface CardInterpretationItem {
  cardId: string;
  position: number;
  symbolism?: string;    // 기존: 카드 상징/이미지/원형
  situation?: string;    // 기존(강화): 구체적 상황 진단 (단정 금지 제약 제거)
  action?: string;       // 신규: 이 위치 카드가 제안하는 행동·방향 (1~2문단)
  isReversed?: boolean;
  interpretation?: string; // deprecated, 하위 호환 유지
}
```

**`action` 섹션 내용 (1~2문단):**
- **적극적 국면**이라면 지금 밀어붙일 것
- **정체된 국면**이라면 지금 풀어야 할 것
- **마무리 국면**이라면 지금 정리·내려놓을 것
- 역방향일 경우: 무엇을 내려놓아야 하는지 관점 포함

### `ReadingResult` — `directAnswer` 필드 추가

```typescript
interface ReadingResult {
  cardInterpretations?: CardInterpretationItem[];
  overallReading: string;      // 기존: 전체 서사 연결 (5~6문단)
  directAnswer?: string;       // 신규: 다면적 직접 답변 (4~5문단)
  advice: string;              // 기존: 조언 (3~4문단)
  topicReading?: string;
  shareToken?: string | null;
  parseError?: "truncated" | "invalid_json" | "fallback_text" | "missing_fields";
  expectedCardCount?: number;
}
```

**`directAnswer` 문단 구성 (4~5문단):**

| 문단 | 내용 |
|------|------|
| 1 | **카드의 핵심 메시지** — 어떤 상황에 있든 카드들이 공통으로 말하는 본질 |
| 2 | **시나리오 A — 이미 진행 중인 경우** — "지금 이 일이 활발히 전개 중이라면 카드는..." |
| 3 | **시나리오 B — 아직 시작 전/정체 중인 경우** — "아직 시작하지 못했거나 막혀 있다면..." |
| 4 | **시나리오 C — 내려놓아야 하는 경우** — "이 방향이 지금 맞지 않다면 카드가 주는 신호는..." |
| 5 | **시기와 공통 행동** — 어느 시나리오에서든 지금 당장 취할 수 있는 것 + 흐름이 바뀔 조건 |

**모든 가능성 포괄 원칙:**
- 상담자의 상황을 하나로 가정하지 않음
- 연애: 솔로 / 새 관계 / 장기 연애 / 이별 후 / 상처 치유 중 모두 포괄
- 직장: 재직 중 / 구직 중 / 이직 고민 / 창업 준비 모두 포괄
- 재정: 안정기 / 위기 / 투자 고민 / 절약 중 모두 포괄
- 건강: 예방 관리 / 회복 중 / 만성 고민 / 검사 앞둠 모두 포괄

---

## 프롬프트 변경

### `buildSystemPrompt` — JSON 스키마 및 섹션 설명 업데이트

**`situation` 섹션 지침 변경:**
- 기존: `"특정 사실을 단정하지 않고, 어떤 흐름과 에너지가 감돌고 있는지 묘사"`
- 변경: `"이 카드가 이 위치에서 구체적으로 무엇을 말하는지 명확하게 짚어주세요. 에너지의 방향과 흐름을 묘사하되, 상담자가 자신의 상황과 직접 연결할 수 있는 구체적 통찰을 포함합니다."`

**`action` 섹션 신규 지침 (1~2문단):**
```
action (카드가 제안하는 행동) — 1~2문단:
이 카드가 이 위치에서 상담자에게 구체적으로 제안하는 행동·방향을 서술합니다.
상담자가 어떤 국면에 있든 적용 가능하도록 세 가지 상황을 고려합니다:
- 적극적 국면이라면: 지금 해야 할 것
- 정체된 국면이라면: 먼저 풀어야 할 것
- 마무리 국면이라면: 내려놓아야 할 것
역방향일 경우, 저항이나 내면화된 에너지 관점에서 행동 방향을 제시합니다.
```

**`directAnswer` 섹션 신규 지침 (4~5문단):**
```
directAnswer (직접 답변) — 4~5문단:
상담자의 현재 상황을 단 하나로 가정하지 말고, 가능한 모든 상황을 포괄합니다.
문단1: 이 카드들이 어떤 상황에서도 공통으로 전하는 핵심 메시지
문단2: "지금 이 일이 이미 진행 중이라면 카드는 이렇게 말합니다..." (적극적 흐름 시나리오)
문단3: "아직 시작 전이거나 막혀 있다면 카드는 이렇게 말합니다..." (정체/대기 시나리오)
문단4: "이 방향이 지금 맞지 않거나 내려놓아야 할 때라면..." (전환/마무리 시나리오)
문단5: 어느 시나리오에서든 지금 당장 취할 수 있는 공통 행동과 변화의 조건
```

**업데이트된 JSON 스키마:**
```json
{
  "cardInterpretations": [
    {
      "cardId": "카드 ID",
      "position": 0,
      "symbolism": "카드 상징 3~4문단",
      "situation": "구체적 상황 진단 3~4문단",
      "action": "행동 제안 1~2문단"
    }
  ],
  "overallReading": "전체 서사 연결 5~6문단",
  "directAnswer": "다면적 직접 답변 4~5문단",
  "advice": "조언 3~4문단"
}
```

### `buildReadingPrompt` — `action` + `directAnswer` 가이드 추가

기존 `depthGuide`에 두 섹션 추가:

```
action (카드가 제안하는 행동) — 1~2문단:
[위 지침 동일]

directAnswer (직접 답변) — 4~5문단:
[위 지침 동일 + 토픽별 시나리오 예시 주입]
```

토픽별 시나리오 예시 주입 (`topicContext` 확장):
- `love-single`: 새 만남 대기 중 / 짝사랑 중 / 관계 회복 중 / 혼자인 게 편안한 상태
- `love-couple`: 안정기 / 권태기 / 갈등 고조 / 이별 고민 / 재결합 고민
- `finance`: 안정적 수입 / 지출 과다 / 투자 검토 / 부채 상황 / 새 수입원 모색
- `career`: 현 직장 만족 / 이직 고민 / 구직 중 / 창업 준비 / 번아웃 상태
- `health`: 예방 관리 / 증상 인식 / 치료 중 / 회복기 / 만성 관리

### `buildFreeQuestionPrompt` — `directAnswer` 연계 강화

```typescript
// 기존
`사용자 질문: "${sanitized}"\n이 질문을 카드 해석에 반영하여 직접적으로 답해주세요.`

// 변경
`사용자 질문: "${sanitized}"\n` +
`directAnswer 필드에서 이 질문에 직접 답하세요. ` +
`"예/아니오"가 아닌 다면적으로: ` +
`"이 질문이 이미 진행 중이라면 / 아직 시작 전이라면 / 방향을 바꿔야 한다면" 세 관점에서 ` +
`구체적으로 답하되, 마지막 문단에서 공통 핵심 행동을 제시하세요.`
```

---

## max_tokens 조정

| | 기존 | 변경 후 |
|---|---|---|
| 공식 | `min(12000 + cardCount×7500 + 15000, 60000)` | `min(15000 + cardCount×9000 + 15000, 65000)` |
| base 증가 | 12,000 | 15,000 (+3,000, directAnswer 포함) |
| perCard 증가 | 7,500 | 9,000 (+1,500, action 섹션 추가) |
| cap 증가 | 60,000 | 65,000 (더 풍부한 콘텐츠 수용) |

| 스프레드 | 기존 | 변경 후 |
|---|---|---|
| 1장 | 34,500 | 39,000 |
| 3장 | 49,500 | 57,000 |
| 5장 | 60,000 (cap) | 65,000 (cap) |
| 10장 이상 | 60,000 (cap) | 65,000 (cap) |

---

## UI 변경

### 카드별 해석 — `action` 섹션 추가

[`CardInterpretationList.tsx`](../../src/components/tarot/CardInterpretationList.tsx) 내 각 카드 해석 렌더링에 `action` 섹션 추가

섹션 순서 및 레이블:
| 섹션 | 한국어 레이블 | 영어 | 일본어 |
|------|-------------|------|--------|
| symbolism | 카드의 상징 | Card Symbolism | カードの象徴 |
| situation | 지금 이 자리에서 | In This Position | この位置で |
| action | 카드가 제안하는 것 | Card's Guidance | カードの導き |

### 종합 결과 — `directAnswer` 섹션 추가

[`TarotResultPanel.tsx`](../../src/components/tarot/TarotResultPanel.tsx) 내 섹션 배치:

```
[카드별 해석 섹션]
      ↓
[카드가 전하는 직접 메시지] ← directAnswer (강조 블록, 시각적 구분)
      ↓
[전체 흐름]               ← overallReading
      ↓
[조언]                    ← advice
```

`directAnswer` 표시 조건: `directAnswer` 필드가 존재하고 비어있지 않을 때만 렌더링 (하위 호환)

---

## 구현 파일 범위

| 파일 | 변경 유형 |
|------|---------|
| `src/types/service.ts` | `action` 필드 추가, `directAnswer` 필드 추가 |
| `src/services/core/prompt-builder.ts` | `buildSystemPrompt`, `buildReadingPrompt`, `buildFreeQuestionPrompt` 수정 |
| `src/app/api/tarot/reading/route.ts` | `computeReadingMaxTokens` 공식 변경 |
| `src/services/tarot/tarot-service.ts` | `parseResult`에서 `action`, `directAnswer` 파싱 추가 |
| `src/components/tarot/CardInterpretationList.tsx` | `action` 섹션 렌더링 추가 |
| `src/components/tarot/TarotResultPanel.tsx` | `directAnswer` 섹션 렌더링 추가 |
| `src/i18n/translations` | 섹션 레이블 3개 언어 추가 |
| `src/__tests__/api/tarot/` | `computeReadingMaxTokens` 테스트 업데이트 |
| `src/__tests__/services/` | `parseResult` 테스트 업데이트 |

---

## 하위 호환성

- 기존 저장된 리딩 결과(`action`, `directAnswer` 없음) → `undefined` 처리, UI에서 graceful skip
- `interpretation` deprecated 필드 계속 유지
- `directAnswer` 없는 오래된 결과는 `directAnswer` 섹션 자체가 렌더링되지 않음

---

## 성공 기준

- [ ] 사용자가 질문 없이 "연애/관계" 선택 시 → 솔로/커플/이별 후 등 다양한 상황이 모두 언급됨
- [ ] 사용자가 구체적 질문 입력 시 → `directAnswer` 첫 문단에서 질문에 직접 연관된 다면적 답변 제시
- [ ] `action` 섹션이 각 카드 포지션의 구체적 행동 방향을 1~2문단으로 명확하게 제시
- [ ] 기존 리딩 결과 페이지가 정상 표시됨 (하위 호환)
