# Verum SDK — LLM 프롬프트 품질 향상 모듈

> ArcanaInsight 인라인 SDK. 외부 [Verum 서버](https://verum-production.up.railway.app)와 통신해
> **타로 AI의 시스템 프롬프트를 A/B 테스트**하고, **응답 품질 메트릭을 수집**합니다.

---

## 이 모듈이 하는 일

```
API 라우트
   │
   ├─ resolveSystemPrompt(fallback)
   │       │
   │       ├─ [Verum 서버] DeploymentConfig 조회 (캐시 TTL 60초)
   │       │       └─ traffic_split 확률로 variant / baseline 선택
   │       │
   │       ├─ variant 선택됨 → variant_prompt 반환 (Verum 실험 프롬프트)
   │       └─ baseline 선택 / 장애 → fallback 프롬프트 반환 (로컬 기본값)
   │
   ├─ [Grok/Claude API] 선택된 프롬프트로 AI 호출
   │
   └─ recordTrace({ model, outputLength, latencyMs })
           └─ [Verum 서버] 결과 메트릭 기록 (fire-and-forget)
```

**핵심 원칙**: Verum이 느리거나 다운돼도 **타로 서비스는 항상 정상 동작**합니다.
예외는 절대 `resolveSystemPrompt` 바깥으로 새지 않습니다.

---

## 파일 구조

```
src/lib/verum/
├── client.ts      ← Verum HTTP API 클라이언트 (서킷 브레이커 + 타임아웃)
├── resolver.ts    ← resolveSystemPrompt / recordTrace 공개 API (server-only 싱글턴)
├── router.ts      ← traffic_split 기반 variant/baseline 선택 로직
├── cache.ts       ← TTL 캐시 + getOrFetch stampede 방지
├── schemas.ts     ← Zod 스키마 (DeploymentConfig, TraceResponse)
├── errors.ts      ← VerumAuthError / VerumRateLimitError / VerumTimeoutError / VerumSchemaError
├── index.ts       ← 공개 re-export
└── *.test.ts      ← 단위 테스트 (33케이스)
```

---

## 사용 방법 (API 라우트)

```typescript
import { resolveSystemPrompt, recordTrace } from "@/lib/verum";

// 1. 시스템 프롬프트 결정 (SSE 스트림 시작 전)
const { systemPrompt, routedTo, deploymentId } = await resolveSystemPrompt(rawSystemPrompt);

// 2. AI 호출 (Grok/Claude — 변경 없음)
for await (const chunk of grokProvider.streamReading(systemPrompt, userPrompt)) { ... }

// 3. 결과 메트릭 기록 (fire-and-forget)
recordTrace({ deploymentId, routedTo, model, outputLength, latencyMs });
```

---

## 장애 격리 (Graceful Degradation)

| 장애 유형 | 동작 | 서킷 쿨다운 |
|---|---|---|
| 타임아웃 (config 조회) | baseline 반환 | 60초 (`VERUM_FAILURE_COOLDOWN_MS`) |
| 401 / 403 인증 실패 | baseline 반환 | 30분 (`VERUM_AUTH_COOLDOWN_MS`) |
| 429 Rate Limit | baseline 반환 | retry-after 헤더값 |
| 5xx 서버 오류 | baseline 반환 | 60초 |
| 스키마 검증 실패 | baseline 반환 | 60초 |
| 서킷 오픈 중 | 즉시 baseline (fetch 스킵) | — |

---

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VERUM_API_URL` | (없음) | Verum 서버 URL. **미설정 시 전체 모듈 비활성화** |
| `VERUM_API_KEY` | (없음) | Verum 인증 키 |
| `VERUM_DEPLOYMENT_ID` | (없음) | 사용할 배포 ID |
| `VERUM_TIMEOUT_MS` | `3000` | config 조회 타임아웃 |
| `VERUM_RECORD_TIMEOUT_MS` | `5000` | trace 기록 타임아웃 |
| `VERUM_FAILURE_COOLDOWN_MS` | `60000` | 5xx/timeout 후 서킷 쿨다운 |
| `VERUM_AUTH_COOLDOWN_MS` | `1800000` | 401/403 후 서킷 쿨다운 (30분) |

> `VERUM_DEPLOYMENT_ID`가 없으면 `resolveSystemPrompt`는 즉시 baseline을 반환합니다.
> 프로덕션과 개발 환경 모두 안전한 기본값입니다.

---

## 테스트 격리

테스트 파일에서 **반드시** `beforeEach`에 호출:

```typescript
import { resetVerumClientForTests } from "@/lib/verum";

beforeEach(() => {
  resetVerumClientForTests(); // 싱글턴 서킷 상태 초기화
});
```

---

## 현재 사용 범위

| 서비스 | 상태 | 비고 |
|---|---|---|
| 타로 리딩 | ✅ 적용 | `src/app/api/tarot/reading/route.ts` |
| 사주 리딩 | 🔲 미적용 | 향후 확장 대상 |
| 신점 메시지 | 🔲 미적용 | 향후 확장 대상 |

---

## 확장 로드맵

현재 이 모듈은 `src/lib/verum/`에 단독으로 위치합니다.
사용 범위 확장에 따라 구조가 점진적으로 변경될 예정입니다:

```
Phase 1 (현재) ─ src/lib/verum/
   타로만 A/B 테스트. 단일 모듈.

Phase 2 (사주·신점 확장 시) ─ src/lib/ai/
   src/lib/ai/
   ├── experiment/verum/   ← 현재 lib/verum 이동
   └── README.md

Phase 3 (복수 실험 도구 추가 시) ─ src/platform/
   src/platform/
   ├── experiment/         ← A/B 테스트, feature flags
   └── llm/                ← providers + prompt 관리
```

> 로드맵 전환 기준: Verum이 2개 이상 서비스에 적용되거나,
> 두 번째 실험 도구(feature flag, 프롬프트 버전 관리 등)가 추가될 때.
