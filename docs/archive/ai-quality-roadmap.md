> **📦 아카이브 문서** — AI 품질 인프라 확장 로드맵입니다.
> 이전 위치: `docs/ai-quality-roadmap.md` (PR-2에서 이동)

# AI 품질 인프라 구조 및 확장 로드맵

> 이 문서는 ArcanaInsight의 LLM 품질 향상 인프라(`src/lib/verum/`)의
> 현재 배치 근거와 향후 확장 계획을 정의합니다.

---

## 1. 현재 구조 (Phase 1)

### AI/LLM 관련 코드 전체 지도

```
src/
├── lib/
│   └── verum/          ─── [품질 레이어] "무엇을 말할까"
│       ├── README.md       A/B 프롬프트 라우팅
│       ├── client.ts       Verum API 클라이언트
│       ├── resolver.ts     공개 진입점
│       ├── router.ts       traffic_split 선택
│       ├── cache.ts        TTL 캐시
│       ├── schemas.ts      입력 검증
│       └── errors.ts       에러 분류
│
└── services/
    └── core/           ─── [신뢰성 레이어] "누가 말할까"
        ├── grok-provider.ts      Grok API
        ├── claude-provider.ts    Claude API (fallback)
        ├── fallback-provider.ts  자동 전환 로직
        ├── prompt-builder.ts     캐릭터별 프롬프트 구성
        └── text-cleaner.ts       응답 정제
```

### 두 레이어의 책임 분리

| 관심사 | 레이어 | 위치 | 독립 실패 가능 |
|---|---|---|---|
| **"어떤 프롬프트?"** (A/B 테스트) | 품질 레이어 | `lib/verum/` | ✅ (baseline fallback) |
| **"어떤 AI?"** (공급자 선택) | 신뢰성 레이어 | `services/core/` | ✅ (Claude fallback) |

> 두 레이어는 완전히 독립적으로 실패 가능합니다.
> Verum 장애 → 기존 프롬프트 사용 유지
> Grok 장애 → Claude로 자동 전환
> 둘 다 장애 → "AI 서비스 일시 불가" 메시지

### 현재 사용 현황 (2026-04-24)

| 서비스 | Verum A/B | Fallback Provider |
|---|---|---|
| 타로 리딩 | ✅ | ✅ |
| 사주 리딩 | ❌ (미적용) | ✅ |
| 신점 메시지 | ❌ (미적용) | ✅ |
| 일일 카드 | ❌ (미적용) | ✅ |

---

## 2. Phase 2 — `src/lib/ai/` 통합 (사주·신점 확장 시)

### 전환 기준

다음 조건 중 **하나라도** 충족되면 Phase 2로 이전:
- Verum이 사주 또는 신점 서비스에도 적용될 때
- `lib/` 내에 두 번째 AI 관련 모듈이 추가될 때

### 목표 구조

```
src/lib/ai/               ← 신규 디렉토리
├── README.md             ← AI 인프라 전체 개요
├── experiment/
│   └── verum/            ← lib/verum/ 이동 (import 경로 변경)
│       ├── README.md
│       ├── client.ts
│       ├── resolver.ts
│       └── ...
└── (future) prompt/      ← 프롬프트 버전 관리 등 추가 예정
```

### 이전 시 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/app/api/tarot/reading/route.ts` | import 경로 `@/lib/verum` → `@/lib/ai/experiment/verum` |
| `src/app/api/saju/reading/route.ts` | 동일 (Phase 2에서 Verum 적용 시) |
| `src/app/api/shinjeom/message/route.ts` | 동일 |
| `vitest.config.ts` | coverage.include 경로 수정 |
| `sonar-project.properties` | exclusions 경로 수정 |
| `CLAUDE.md` | 프로젝트 구조 트리 업데이트 |

> **예상 변경 비용**: 6-8개 파일, 30분 이내

---

## 3. Phase 3 — `src/platform/` 승격 (복수 실험 도구 추가 시)

### 전환 기준

- 두 번째 독립적인 실험 도구 추가 (Feature Flag, 프롬프트 버전 관리, LLM 평가 시스템 등)
- 모니터링/분석 인프라가 서비스 레이어에서 분리될 필요가 생길 때

### 목표 구조

```
src/platform/             ← 신규 최상위 레이어
├── README.md             ← 플랫폼 레이어 정의
├── experiment/
│   ├── verum/            ← A/B 테스트
│   └── (future) flags/   ← Feature Flag
└── llm/
    ├── providers/        ← services/core에서 이동 (grok, claude, fallback)
    └── prompt/           ← 프롬프트 빌더, 클리너
```

> **주의**: Phase 3는 `services/core/`도 이동 대상에 포함됩니다.
> 변경 파일 수 20+, 계획 수립 후 단일 PR로 진행 권장.

---

## 4. 각 Phase 의사결정 트리

```
새 AI 관련 코드 추가 시:
    │
    ├─ "기존 verum과 같은 성격" (A/B, 실험)
    │       └─ Phase 1: lib/verum/ 내 파일 추가
    │
    ├─ "AI 인프라이지만 verum과 다른 목적"
    │   └─ Phase 2 전환 시점인가?
    │           ├─ Yes → lib/ai/ 구조로 이전 후 새 모듈 추가
    │           └─ No  → 임시로 lib/에 추가, 다음 관련 작업 시 Phase 2로 전환
    │
    └─ "AI 공급자 추가" (새 LLM 벤더)
            └─ services/core/에 새 provider 파일 추가 (Phase 관계없음)
```

---

## 5. 현재 구조 유지 근거 (Why Not Move Now)

| 이유 | 근거 |
|---|---|
| 사용처 1곳 | `tarot/reading/route.ts` 단 1파일 import |
| 서킷 브레이커 안정화 필요 | PR #113 머지 직후, 운영 검증 기간 필요 |
| 변경 비용 > 이득 | 현재 시점에서 이동 시 이득: 네이밍만. 비용: 6-8개 파일 수정 |
| 문서로 충분히 보완 가능 | `README.md` + CLAUDE.md 다이어그램으로 발견 가능성 확보 |

---

## 6. 참고 문서

- [`src/lib/verum/README.md`](../../src/lib/verum/README.md) — Verum SDK 상세 사용 가이드
- [`CLAUDE.md` — AI/LLM 인프라 레이어 구조](../../CLAUDE.md#ai-llm-인프라-레이어-구조) — 아키텍처 다이어그램
- [`CLAUDE.md` — 핵심 아키텍처 패턴](../../CLAUDE.md#핵심-아키텍처-패턴) — 전체 패턴 목록
