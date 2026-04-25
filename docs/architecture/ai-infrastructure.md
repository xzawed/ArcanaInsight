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
new CircuitBreaker({ prefix: "FallbackProvider/Grok", globalKey: "grok_circuit" })
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
| `extractFallbackText(raw)` | `src/services/core/text-cleaner.ts` | JSON 파싱 실패 시 본문 회수 (tarot/saju 공용, ReDoS-safe) |
| `buildCharacterHeader(character, subtitle?)` | `src/services/core/prompt-builder.ts` | 3 서비스 공통 캐릭터 system-prompt 헤더 |

