# AI/LLM 인프라 구조

ArcanaInsight의 AI 관련 코드는 **두 개의 독립된 레이어**로 분리됩니다.

---

## 1. 2단 레이어 구조

```
API Route (route.ts)
    │
    ├─ [1단계] 어떤 프롬프트를 쓸까? ─── src/lib/verum/
    │   resolveSystemPrompt(fallback)       A/B 테스트 라우팅
    │       ├─ variant  → Verum 실험 프롬프트    서킷 브레이커
    │       └─ baseline → 로컬 기본 프롬프트     TTL 캐시
    │
    ├─ [2단계] 어떤 AI를 쓸까? ────────── src/services/core/
    │   FallbackProvider.streamReading()    Grok 우선
    │       ├─ GrokProvider (X.ai)          장애 시 Claude로 자동 전환
    │       └─ ClaudeProvider (Anthropic)   쿨다운 관리
    │
    └─ [3단계] 결과 메트릭 기록 ─────────  src/lib/verum/
        recordTrace(...)                    fire-and-forget
```

**레이어 구분 원칙**:
- `lib/verum/` = **"무엇을 말할까"** — 프롬프트 내용·품질 (A/B 테스트)
- `services/core/` = **"누가 말할까"** — AI 공급자 선택·신뢰성 (Fallback)

두 레이어는 완전히 독립적으로 실패해도 서비스에 영향을 주지 않습니다.

---

## 2. FallbackProvider — Grok→Claude 자동 전환

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
- Verum 클라이언트(`src/lib/verum/client.ts`)도 동일 클래스를 인스턴스 단위로 사용

---

## 3. Verum — A/B 프롬프트 라우팅

`src/lib/verum/` — 타로 리딩에만 적용 (2026-04-24 기준)

### 공개 API

```ts
// src/lib/verum/resolver.ts
resolveSystemPrompt(fallback: string): Promise<string>
recordTrace(data: TraceData): Promise<void>
resetVerumClientForTests(): void  // 테스트 전용
```

### 격리 원칙

- Verum 실패 → `fallback` 프롬프트 반환 (서비스 무중단)
- 서킷 오픈 시 → 즉시 baseline 반환 (타임아웃 없음)
- 예외는 절대 API 스트림 밖으로 새지 않음

### 타임아웃·쿨다운

| 항목 | 환경변수 | 기본값 |
|------|---------|--------|
| config 조회 타임아웃 | `VERUM_TIMEOUT_MS` | 3000ms |
| trace 기록 타임아웃 | `VERUM_RECORD_TIMEOUT_MS` | 5000ms |
| 5xx/timeout 쿨다운 | `VERUM_FAILURE_COOLDOWN_MS` | 60000ms |
| 401/403 쿨다운 | `VERUM_AUTH_COOLDOWN_MS` | 1800000ms (30분) |

### stampede 방지

`cache.getOrFetch()` — 동시 캐시 미스 시 fetcher 1회 호출 (thundering herd 방지)

### 현황 & 한계 (2026-04-25 기준)

| 항목 | 상태 |
|------|------|
| 타로 리딩 (`/api/tarot/reading`) | ✅ 적용 |
| 사주·신점 | 🔲 미적용 (Phase 2 예정) |
| `VERUM_API_URL` 미설정 시 | 전체 모듈 비활성화 — baseline만 반환 |
| 서킷 브레이커 상태 | 프로세스 메모리 (서버리스 재시작 시 초기화) |
| 단일 배포 ID | `VERUM_DEPLOYMENT_ID` 1개만 지원 — 다중 실험 동시 운영 불가 |

상세: [`src/lib/verum/README.md`](../../src/lib/verum/README.md)

---

## 4. SSE 스트리밍 패턴

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

---

## 5. AI 인프라 폴더 로드맵

현재는 `src/lib/verum/`에 단독 위치. 사용 범위 확장에 따라 점진적으로 이전:

| Phase | 기준 | 구조 |
|---|---|---|
| **Phase 1 (현재)** | 타로만 A/B 테스트 | `src/lib/verum/` |
| **Phase 2** | 사주·신점으로 Verum 확장 | `src/lib/ai/experiment/verum/` |
| **Phase 3** | 복수 실험 도구 추가 시 | `src/platform/experiment/` |

상세: [`docs/archive/ai-quality-roadmap.md`](../archive/ai-quality-roadmap.md)
