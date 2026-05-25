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

현재 `computeReadingMaxTokens` 정책:

전 구간 단일 공식: `min(4000 + cardCount × 2500 + 5000, 60000)`

| 카드 수 | max_tokens | 비고 |
|---------|-----------|------|
| 1장 | 11,500 | |
| 3장 | 16,500 | |
| 5장 | 21,500 | |
| 7장 | 26,500 | |
| 9장 | 31,500 | |
| 10장 | 34,000 | |
| 12장(zodiac) | 39,000 | |
| 20장 이상 | 60,000 (cap) | |

> **주의**: Grok-3은 reasoning 토큰이 output max_tokens 예산을 공유한다.  
> reasoning ~1500토큰 소모 시 실제 출력 가능 토큰이 그만큼 줄어든다.

- [ ] 실제 AI 응답 길이가 기대에 못 미친다면 max_tokens 상향을 검토한다
- [ ] 변경 후 `src/__tests__/api/tarot-reading.test.ts`의 기댓값도 동시 수정 필수

### 2. depthGuide 지침 확인

현재 정책 (`prompt-builder.ts`):
- 각 카드 해석(interpretation): **카드 수 무관 3~4문단**
- 종합 해석(overallReading): **4~5문단**
- 조언(advice): **2~3문단**

- [ ] depthGuide 변경 시 `src/services/core/prompt-builder.test.ts` 테스트 기댓값 동시 수정

### 3. 시스템 프롬프트 구조

`buildSystemPrompt(character)` 흐름:
1. 캐릭터 persona (name, personality, speechStyle)
2. 언어 지침 (`x-locale` 헤더 기반)
3. 리딩 스타일 (speciality)
4. 응답 형식 (JSON schema)

- [ ] 새 캐릭터 추가 시 persona 완성도 확인 (personality + speechStyle 필수)
- [ ] 언어 파라미터가 `x-locale` 헤더에서 올바르게 전달되는지 확인

### 4. JSON 파싱 안전성

`parseJsonSafe()` + `cleanReadingText()` 파이프라인:
- AI가 JSON 외 텍스트를 포함해도 `fallback_text` 처리
- `parseError` 신호: `truncated`, `fallback_text`, `invalid_json`

- [ ] 새 필드 추가 시 Zod schema와 `ReadingResult` 타입 동시 업데이트
- [ ] `parseError` 케이스를 UI가 적절히 처리하는지 확인

## 프롬프트 개선 작업 절차

1. 현재 프롬프트 내용 읽기: `prompt-builder.ts` 전체
2. 문제가 되는 케이스 특정 (어떤 카드 수, 어떤 토픽에서 짧은가?)
3. `computeReadingMaxTokens` 또는 `depthGuide` 수정
4. 관련 테스트 기댓값 동시 수정 (`prompt-builder.test.ts`, `tarot-reading.test.ts`)
5. `pnpm type-check && pnpm test:coverage` 통과 확인
6. 실제 리딩 1회 실행하여 품질 확인

## 실제 리딩 품질 확인 방법

개발 서버에서 타로 리딩 1장 요청 후 SSE 스트림 길이 확인:
- overallReading: 4~5문단 (각 200~300자)
- cardInterpretations[0]: 3~4문단
- advice: 2~3문단
