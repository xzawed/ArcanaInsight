# AI/LLM 인프라 구조

ArcanaInsight의 AI 호출은 단일 신뢰성 레이어(`services/core/FallbackProvider`)를 통해 이뤄집니다.

```
API Route (route.ts)
    │
    └─ src/services/core/
       FallbackProvider.streamReading()    Grok 우선
           ├─ GrokProvider (X.ai)          장애 시 Claude로 자동 전환
           └─ ClaudeProvider (Anthropic)   쿨다운 관리
```

---

## 1. FallbackProvider — Grok→Claude 자동 전환

`src/services/core/fallback-provider.ts`

| 오류 | 동작 | 쿨다운 |
|------|------|--------|
| 429 Rate Limit | Claude로 전환 | Retry-After 기반 (기본 30초) |
| 500 서버 에러 / 네트워크 오류 | Claude로 전환 | 5분 (`AI_FALLBACK_COOLDOWN_MS`) |
| 401/403 인증 실패 | Claude로 전환 | 30분 (`AI_AUTH_COOLDOWN_MS`) |
| Grok + Claude 둘 다 실패 | 에러 메시지 표시 | — |

- `ANTHROPIC_API_KEY` 미설정 시 Grok 단독 사용 (fallback 없음)
- 쿨다운 중 새 요청은 즉시 Claude로 라우팅 (retry 없음)

### CircuitBreaker 클래스

서킷 상태는 `CircuitBreaker` (`src/services/core/circuit-breaker.ts`) 로 관리:

```ts
new CircuitBreaker({ prefix: "FallbackProvider/Grok", globalKey: "__arcanaFallbackCircuit__" })
```

| 메서드 | 역할 |
|--------|------|
| `isAvailable()` | 서킷 열림 여부 확인 |
| `markDown(ms, reason)` | 서킷 오픈 + 쿨다운 설정 |
| `resetForTests()` | 테스트용 상태 초기화 |

- `globalKey` 옵션: `globalThis`에 상태 공유 → 서버리스 warm instance 간 쿨다운 보존

---

## 2. SSE 스트리밍 패턴

| 라우트 | 방식 | 유틸 |
|--------|------|------|
| `/api/tarot/reading` | SSE 스트리밍 | `fetchSSEStream()` |
| `/api/saju/reading` | SSE 스트리밍 | `fetchSSEStream()` |
| `/api/shinjeom/message` | SSE 스트리밍 | `fetchSSEStream()` |
| `/api/daily-card` | JSON 단일 응답 | `NextResponse.json()` |

클라이언트 공통 유틸: `src/hooks/useSSEStream.ts` — `fetchSSEStream()`

### 서버 공통 유틸

| 유틸 | 위치 | 역할 |
|------|------|------|
| `withAbortTimeout(fn, ms)` | `src/services/core/http-utils.ts` | AbortController + setTimeout 래퍼 (Grok/Claude 공용) |
| `readSseLines(response, extractDelta)` | `src/services/core/http-utils.ts` | OpenAI·Anthropic SSE 공통 reader — `extractDelta` 콜백으로 포맷 차이 흡수 |
| `SSE_HEADERS` | `src/lib/request-utils.ts` | API 라우트 SSE 응답 표준 헤더 상수 |
| `jsonError(msg, status)` | `src/lib/request-utils.ts` | JSON 오류 응답 헬퍼 |
| `getClientIp(headers)` | `src/lib/request-utils.ts` | x-forwarded-for 첫 IP 추출 (rate-limit 용) |
| `pickFields(obj, keys)` | `src/lib/request-utils.ts` | 응답 직렬화 whitelist — 새 컬럼 자동 제외로 IDOR 방지 |

### 텍스트·프롬프트 공통 유틸

| 유틸 | 위치 | 역할 |
|------|------|------|
| `parseJsonSafe(raw)` | `src/services/core/text-cleaner.ts` | thinking 토큰 제거 → 코드블록 추출 → 문자열-aware 괄호 카운터로 JSON 추출 → 2차 파싱 시도 |
| `extractFallbackText(raw)` | `src/services/core/text-cleaner.ts` | JSON 파싱 완전 실패 시 본문 회수 (tarot/saju 공용, ReDoS-safe) |
| `cleanReadingText(text)` | `src/services/core/text-cleaner.ts` | 파싱 후 JSON 잔여물·이스케이프 정리 |
| `buildCharacterHeader(character, subtitle?)` | `src/services/core/prompt-builder.ts` | 3 서비스 공통 캐릭터 system-prompt 헤더 |

---

## 3. JSON 파싱 파이프라인

타로·사주·신점 리딩 결과는 AI가 JSON 문자열로 응답하며 서버에서 파싱한다.

```
AI 스트리밍 응답 (fullResponse 누적)
    │
    ├─ parseJsonSafe(fullResponse)
    │      1. thinking 토큰 제거 (<think>...</think>)
    │      2. 마크다운 코드블록 추출 (```json ... ```)
    │      3. findOutermostObjectEnd() — 문자열-aware 괄호 카운팅
    │      4. JSON.parse 1차 시도
    │      5. 문자열 내 리터럴 개행 이스케이프 후 2차 시도
    │      → 성공: Record<string, unknown>
    │      → 실패: null
    │
    ├─ 성공 → cleanReadingText(field) 후 ReadingResult 반환
    └─ 실패 → extractFallbackText(raw) 또는 원문 텍스트 반환
```

### 핵심 주의사항 — 문자열 내 중괄호

AI 응답에 `"현재는 {도전의 시기}입니다"` 처럼 한국어 표현이 JSON 문자열 값
안에 `{}`를 포함하는 경우가 빈번하다.

**잘못된 패턴 (단순 괄호 카운터)**:
```ts
// ❌ 문자열 내 } 를 JSON 끝으로 오인 → 조기 종료
for (let i = start; i < text.length; i++) {
  if (text[i] === "{") depth++;
  else if (text[i] === "}") { depth--; if (!depth) { end = i; break; } }
}
```

**올바른 패턴 (`findOutermostObjectEnd`)**:
```ts
// ✅ inString + escape 상태로 문자열 내부의 { } 는 카운트 제외
let inString = false, escape = false;
for (let i = start; i < text.length; i++) {
  const ch = text[i];
  if (escape)        { escape = false; continue; }
  if (ch === "\\")   { escape = true;  continue; }
  if (ch === '"')    { inString = !inString; continue; }
  if (inString)      continue;
  if (ch === "{")    depth++;
  else if (ch === "}") { depth--; if (!depth) return i; }
}
```

**탐욕적 정규식도 동일 문제** — `/\{[\s\S]*\}/`는 첫 `{`부터 마지막 `}`까지
잡기 때문에 여러 JSON 블록이 있거나 값에 `}`가 포함되면 오파싱된다.
`shinjeom-service.ts`가 이 정규식을 사용하다가 `parseJsonSafe()`로 교체됨.


## 질문 직답(directAnswer) — answer-first 계약

사용자의 구체 질문("이번 달에 이직할 수 있을까요?")에 리딩이 동문서답하지 않도록, `directAnswer` 필드를 **answer-first**로 강제한다.

- **단일 진실원 헬퍼**: `buildDirectAnswerContract(domain)`(`prompt-builder.ts`)가 `schemaLine`(JSON 스켈레톤 라인)·`systemSpec`(작성 지침)·`footerReminder`(누락 방지)를 **한 함수에서** 방출한다. 지시·스키마·파서가 서로 어긋나는 드리프트를 코드 레벨에서 차단(과거 결함: 사주 route가 `buildFreeQuestionPrompt`로 "directAnswer에 답하라"를 붙였으나 사주 스키마·`parseResult`·UI에 필드가 없어 답이 소실).
- **작성 순서**(systemSpec): ① 질문 재진술 → ② 가장 유력한 한 방향 단언 → ③ 확신 수위 문체 표기("분명히" / "~쪽으로 기울어 있습니다" / "단서는 있으나 확정하기엔 이릅니다") → ④ 근거(도메인 렌즈: 타로=카드 상징·위치, 사주=세운·월운·용신, 신점=대화에서 읽어낸 상)+전제조건.
- **안티패턴 금지**: "가능한 모든 상황(재직/구직/이직/창업)을 균등하게 나열"하는 헤지는 금지. 2축 분리 — 상담자의 사적 사실은 완충하되 점괘의 방향은 커밋. 민감 도메인(건강·재정·법률)은 확답 대신 경향+전문가 상담 권유로 강등.
- **앵커**: 타로·사주는 자유질문 입력창(200자, `buildFreeQuestionPrompt`), 신점은 chat 첫 사용자 메시지를 핵심질문으로 최종 턴 프롬프트 상단에 재노출.
- **배선**: 3서비스 모두 `getSystemPrompt`/`buildConversationPrompt` JSON 스켈레톤 상단(truncation 생존율↑)에 `directAnswer` + `parseResult` 추출 + 결과화면 최상단 `ResultTextCard` 렌더. en/ja는 `LANGUAGE_INSTRUCTIONS` JSON 키 화이트리스트에 `directAnswer` 포함(키 번역 방지).
- ⚠️ `directAnswer`는 라이브 세션 SSE 결과에서만 노출되고 DB 미영속(타로 포함 3서비스 공통) — 재방문(`result/[id]`)·공유엔 미포함. DB 영속은 후속 과제(마이그레이션 필요).

## 4. max_tokens 정책 (3-섹션 + directAnswer 프리미엄 리딩 기준 — PR #414 + #420)

### 타로 (`computeReadingMaxTokens`) — `src/app/api/tarot/reading/route.ts`

카드 수 비례 동적 산정. 3-섹션(symbolism/situation/action) + directAnswer(4~5문단) 기준 공식 적용.

전 구간 단일 공식: `min(15000 + cardCount × 9000 + 15000, 65000)`

| 카드 수 | max_tokens |
|---------|-----------|
| 1장 | 39,000 |
| 3장 | 57,000 |
| 4장 이상 | 65,000 (cap) |
| 7장 이상 | 65,000 (cap) |

- 모델 cap 65,000: Claude 4.x max output 안전마진 (Grok 최대 100K)
- `perCard 9000`: 카드별 3개 섹션(symbolism/situation/action) × 각 3~4문단 (한국어 1.3x + JSON 오버헤드 + action 섹션)
- `reasoningBuffer 15000`: Grok-3 reasoning 흡수 마진 (3배 확장)
- `base 15000`: system prompt + overallReading(5~6문단) + directAnswer(4~5문단) + advice(3~4문단) 오버헤드

### 사주 (`computeSajuReadingMaxTokens`) — `src/app/api/saju/reading/route.ts`

| 시간범위 | max_tokens |
|---------|-----------|
| this-week / this-month / this-year 기본 | 48,000 |
| includeMonthly=true (월운 12개월) | 60,000 (cap) |
| five-year / full-fortune / three-year / next-year | 60,000 (cap) |

sajuSections(structure/elements/fortune/guidance) 4-섹션 기준 3배 확장 적용.

### 신점 — `src/app/api/shinjeom/message/route.ts`

| 턴 유형 | 상수 |
|---------|------|
| 최종 턴 (`isFinalTurn=true`) | `SHINJEOM_TOKENS_FINAL = 48,000` |
| 중간 대화 | `SHINJEOM_TOKENS_CHAT = 6,000` |

shinjeomSections(spiritual/current/obstacles/future) 4-섹션 기준 3배 확장 적용 (최종 턴).

---

## 클라이언트 타임아웃 패턴 (tarot/saju 세션 공통)

타로·사주 세션 페이지는 240s 하드 타임아웃 + `AbortController` + `finished` 가드 패턴을 공통 적용합니다:

```ts
const abortController = new AbortController();
let finished = false;

// 240s 하드 타임아웃 — 10장+ 타로/full-fortune 사주의 reasoning+stream 시간 대응
const timer = setTimeout(() => {
  if (finished) return;
  abortController.abort();
  setReadingErrorReason("timeout");
}, 240_000);

await fetchSSEStream({ signal: abortController.signal, ... });
finished = true;
clearTimeout(timer);
```

재시도 UI: `data-testid="reading-retry"` 버튼이 표시되어 사용자가 재시도 가능. 적용 라우트: `src/app/(immersive)/tarot/session/page.tsx`, `src/app/(immersive)/saju/session/page.tsx`.

---

## 다국어 응답

`prompt-builder.ts`에 `LANGUAGE_INSTRUCTIONS[locale]` 분기 적용 완료. `parseJsonSafe()`는 일본어 「」·중영일 혼합 응답을 안전하게 파싱한다 (`src/services/core/__tests__/text-cleaner.locale.test.ts` 검증). 캐릭터 메모리는 `locale` 필터를 추가해 cross-locale 오염 방지 (`idx_sessions_user_locale` 인덱스 활용). 상세: [`i18n.md`](i18n.md)
