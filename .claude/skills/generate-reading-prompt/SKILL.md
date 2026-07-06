---
name: generate-reading-prompt
description: 타로/사주/신점 AI 리딩 프롬프트를 검토하고 개선한다. "프롬프트 검토", "리딩 품질 개선", "AI 응답이 짧다", "프롬프트 수정", "리딩 텍스트 깊이" 등의 요청에 사용한다.
when_to_use: prompt-builder.ts, tarot/reading/route.ts, saju/reading/route.ts, shinjeom 관련 파일 수정 시. AI 리딩 결과가 기대에 못 미칠 때.
allowed-tools: Read Grep Bash(pnpm type-check) Bash(pnpm lint) Bash(pnpm test:coverage)
---

# AI 리딩 프롬프트 검토·개선 가이드

## 현재 프롬프트 구성 파일

- `src/services/core/prompt-builder.ts` — 핵심 프롬프트 조립 로직
- `src/app/api/tarot/reading/route.ts` — `computeReadingMaxTokens`, SSE 스트리밍
- `src/app/api/saju/reading/route.ts` — 사주 리딩 API
- `src/app/api/shinjeom/message/route.ts` — 신점 메시지 API

## 프롬프트 품질 체크포인트

### 1. max_tokens 적정성 확인

> ⚠️ 수치는 코드가 정본이다. 이 표는 참고용이며, 실제 값은 **`src/app/api/tarot/reading/route.ts`(`computeReadingMaxTokens`)**·**`src/services/CLAUDE.md`**를 확인한다(휘발성 수치 drift 방지).

**타로** `computeReadingMaxTokens(cardCount)`: `min(15000 + cardCount × 9000 + 15000, 65000)` (cap 65,000)

| 카드 수 | max_tokens |
|---------|-----------|
| 1장 | 39,000 |
| 2장 | 48,000 |
| 3장 | 57,000 |
| 4장 이상 | 65,000 (cap) |

**사주** `computeSajuReadingMaxTokens`: 기본 48,000 / 복잡 범위(includeMonthly·5년·전체운세 등) 60,000 cap
**신점**: 최종 리딩 `SHINJEOM_TOKENS_FINAL = 48,000` 고정 · 중간 대화 `SHINJEOM_TOKENS_CHAT = 6,000`

> **주의**: Grok-3은 reasoning 토큰이 output max_tokens 예산을 공유한다(reasoning 소모분만큼 실제 출력 감소) → 충분한 버퍼 필수.

- [ ] 실제 AI 응답 길이가 기대에 못 미친다면 max_tokens 상향을 검토한다
- [ ] 변경 후 `src/__tests__/api/tarot-reading.test.ts` 등 상수를 기댓값으로 쓰는 테스트 동시 수정 필수

### 2. 프리미엄 리딩 구조 + 계약 (PR #414·#420·#467·#471, 섹션 스키마는 2026-07-07 폐지)

**타로 카드 해석은 단일 필드가 아니라 3-섹션**이다(`prompt-builder.ts`):
- `symbolism` 3~4문단 · `situation` 3~4문단 · `action` 1~2문단
- 종합 해석(overallReading): **5~6문단** · 조언(advice): **3~4문단**
- ⚠️ 사주 `sajuSections`(structure/elements/fortune/guidance)·신점 `shinjeomSections`(spiritual/current/obstacles/future) 4-섹션은 **폐지됨** — flat 필드(`overallReading`/`topicReading`/`advice`/`directAnswer`)와 내용이 중복되면서 간헐 무결과(사주 ~21%·신점 ~67%)의 근본 원인이었다. 사주·신점도 이제 `overallReading`이 정본.

**두 공통 계약을 반드시 함께 검토**한다:
- **`buildDirectAnswerContract(domain)`** — 질문 직답(answer-first). `directAnswer`를 결과 최상단에 렌더. schemaLine·systemSpec·footerReminder를 한 곳에서 방출(지시-스키마-파서 drift 차단). "균등 나열" 헤지 금지.
- **`buildReadabilityContract(domain)`** — 쉬운 말 계약. "분량 축소가 아니라 같은 분량을 쉬운 말로"(문단 수·max_tokens 불변). 해요체·전문용어 즉시 풀어쓰기·구체 장면 착지.

- [ ] 문단 수/구조 변경 시 `src/services/core/prompt-builder.test.ts` 테스트 기댓값 동시 수정

### 3. 시스템 프롬프트 구조

`buildSystemPrompt(character)` 흐름:
1. 캐릭터 persona (name, personality, speechStyle)
2. 언어 지침 (`x-locale` 헤더 기반)
3. 리딩 스타일 (speciality)
4. 응답 형식 (JSON schema)

- [ ] 새 캐릭터 추가 시 persona 완성도 확인 (personality + speechStyle 필수)
- [ ] 언어 파라미터가 `x-locale` 헤더에서 올바르게 전달되는지 확인

### 4. JSON 파싱 안전성 (PR #480 방어 → 2026-07-07 근본 제거)

PR #480은 간헐적 무결과에 3중 내성으로 대응했으나, 후속 작업(리딩 신뢰성 기술부채 정리)에서 근본 원인인 섹션 스키마 자체를 제거했다. 현재 유효한 파이프라인:
- **`parseJsonSafe()`** — 3차 파싱에 **트레일링 콤마 제거**(`stripTrailingCommas`) 포함
- **`streamReadingWithParseRetry`** (`reading-generator.ts`) — 3개 리딩 라우트가 사용. 1차 파싱이 `parseError`면 1회 non-stream 재생성
- `parseError` 신호 4종: `truncated`, `fallback_text`, `invalid_json`, `missing_fields`

> `promoteNestedFields(parsed, "sajuSections"|"shinjeomSections", [...])`(섹션 내부 flat 필드 승격)는 승격 대상 섹션이 사라져 함께 제거됨.

- [ ] 새 필드 추가 시 Zod schema와 `ReadingResult` 타입 동시 업데이트 — **섹션 객체로 중첩하지 말고 top-level flat 필드로 추가**(중복·중첩이 과거 무결과의 근본 원인)
- [ ] `parseError` 케이스를 UI가 적절히 처리하는지 확인

## 프롬프트 개선 작업 절차

1. 현재 프롬프트 내용 읽기: `prompt-builder.ts` 전체
2. 문제가 되는 케이스 특정 (어떤 카드 수, 어떤 토픽에서 짧은가?)
3. `computeReadingMaxTokens` 또는 `depthGuide` 수정
4. 관련 테스트 기댓값 동시 수정 (`prompt-builder.test.ts`, `tarot-reading.test.ts`)
5. `pnpm type-check && pnpm test:coverage` 통과 확인
6. 실제 리딩 1회 실행하여 품질 확인

## 실제 리딩 품질 확인 방법

개발 서버(또는 프로덕션 익명 요청)에서 타로 리딩 요청 후 SSE 스트림 파싱:
- `directAnswer`: 질문 재진술 + 한 방향 단언(최상단 렌더)
- overallReading: 5~6문단
- cardInterpretations[0]: `symbolism`(3~4) + `situation`(3~4) + `action`(1~2)
- advice: 3~4문단
- `parseError` 없음(무결과 아님) 확인
