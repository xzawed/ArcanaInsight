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


## 4. max_tokens 정책 (`computeReadingMaxTokens`)

`src/app/api/tarot/reading/route.ts` — 카드 수 비례 동적 산정

전 구간 단일 공식: `min(4000 + cardCount × 2500 + 5000, 60000)`

| 카드 수 | max_tokens |
|---------|-----------|
| 1장 | 11,500 |
| 3장 | 16,500 |
| 5장 | 21,500 |
| 7장 | 26,500 |
| 9장 | 31,500 |
| 10장 | 34,000 |
| 12장(zodiac) | 39,000 |
| 20장 이상 | 60,000 (cap) |

- 모델 cap 60,000: Claude Sonnet 4.6 / Haiku 4.5 max output 64K 안전마진
- `perCard 2500`: 한국어 토큰 비율(영어 대비 ×1.3) + JSON 구조 오버헤드 반영
- `reasoningBuffer 5000`: Grok-3 reasoning 토큰을 max_tokens 예산에서 함께 소비하는 특성 대응
- `base 4000`: system prompt + overallReading + advice 고정 오버헤드

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

재시도 UI: `data-testid="reading-retry"` 버튼이 표시되어 사용자가 재시도 가능. 적용 라우트: `src/app/tarot/session/page.tsx`, `src/app/saju/session/page.tsx`.

---

## 다국어 응답

`prompt-builder.ts`에 `LANGUAGE_INSTRUCTIONS[locale]` 분기 적용 완료. `parseJsonSafe()`는 일본어 「」·중영일 혼합 응답을 안전하게 파싱한다 (`src/services/core/__tests__/text-cleaner.locale.test.ts` 검증). 캐릭터 메모리는 `locale` 필터를 추가해 cross-locale 오염 방지 (`idx_sessions_user_locale` 인덱스 활용). 상세: [`i18n.md`](i18n.md)
