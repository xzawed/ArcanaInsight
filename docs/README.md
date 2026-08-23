# ArcanaInsight 문서 인덱스

이 폴더는 프로젝트의 장기 정본 문서를 주제별로 보관합니다. 루트 `CLAUDE.md`는 빠른 진입점이고, 세부 규칙과 배경 설명은 이 문서들이 기준입니다.

## 읽는 순서 (스펙 우선)

문서는 **무엇을 보장하는가 → 어떻게 만들었는가 → 어떻게 검증하는가 → 어떻게 운영하는가 → 무엇이 남았는가** 순으로 읽습니다.

| 순서 | 폴더 | 답하는 질문 | 진입 문서 |
|---|---|---|---|
| 1 | `specs/` | 시스템이 무엇을 **보장**하는가 (SDD) | [specs/README.md](specs/README.md) |
| 2 | `architecture/` · `conventions/` | 어떻게 **구현**했는가 | [architecture/system-overview.md](architecture/system-overview.md) |
| 3 | `tests/` | 무엇이 그 보장을 **검증**하는가 (TDD) | [tests/strategy.md](tests/strategy.md) |
| 4 | `operations/` | 어떻게 **운영·배포**하는가 | [operations/operation-guide.md](operations/operation-guide.md) |
| 5 | `wbs/` | 무엇이 **남았고 무엇에 막혀** 있는가 | [wbs/README.md](wbs/README.md) |

> 명세와 설계의 차이: **명세를 어기면 코드가 틀린 것**이고, 설계 문서와 코드가 어긋나면 둘 중 무엇을 고칠지는 상황에 따릅니다. 상세는 [specs/README.md](specs/README.md).

## 업무 유형별 진입점

| 업무 | 진입 문서 |
|---|---|
| SSR/hydration 규칙 (계약) | [specs/platform/rendering-contract.md](specs/platform/rendering-contract.md) |
| 테스트 계층·게이트 전략 | [tests/strategy.md](tests/strategy.md) |
| 잔여 작업·차단 요인 | [wbs/README.md](wbs/README.md) |
| 시스템 구조 이해 | [architecture/system-overview.md](architecture/system-overview.md) |
| AI/LLM fallback, SSE, JSON 파싱 | [architecture/ai-infrastructure.md](architecture/ai-infrastructure.md) |
| DB 공급자 전환 | [architecture/db-abstraction.md](architecture/db-abstraction.md) |
| Auth 추상화와 API 보안 | [architecture/auth-abstraction.md](architecture/auth-abstraction.md) |
| 캐릭터, 카드, 스킨 데이터 | [architecture/data-model.md](architecture/data-model.md) |
| 다국어 인프라 | [architecture/i18n.md](architecture/i18n.md) |
| 코드 변경 절차 | [workflow/code-change-process.md](workflow/code-change-process.md) |
| 단위 테스트 | [tests/unit-testing.md](tests/unit-testing.md) |
| E2E 테스트 | [tests/e2e-testing.md](tests/e2e-testing.md) |
| 반복 작업별 파일 가이드 | [workflow/task-playbooks.md](workflow/task-playbooks.md) |
| 스크립트 정책 | [workflow/scripts.md](workflow/scripts.md) |
| CI/CD 파이프라인 | [workflow/ci-cd.md](workflow/ci-cd.md) |
| 코딩 스타일 | [conventions/coding-style.md](conventions/coding-style.md) |
| 레이아웃 규칙 | [conventions/layout-rules.md](conventions/layout-rules.md) |
| 크로스 플랫폼 품질 | [conventions/cross-platform.md](conventions/cross-platform.md) |
| Zod/API 입력 검증 | [conventions/zod-schemas.md](conventions/zod-schemas.md) |
| 이미지 에셋 | [conventions/image-assets.md](conventions/image-assets.md) |
| i18n 작성 규칙 | [conventions/i18n-style.md](conventions/i18n-style.md) |
| UI 디자인 브리프/구현계획 | [design/design-brief.md](design/design-brief.md), [design/implementation-plan.md](design/implementation-plan.md) |
| 환경변수 | [operations/env-variables.md](operations/env-variables.md) |
| 운영자 가이드 | [operations/operation-guide.md](operations/operation-guide.md) |
| 미구현/기술부채 | [operations/known-issues.md](operations/known-issues.md) |
| 배포/롤백 | [operations/deployment.md](operations/deployment.md) |
| 배포 품질/안전 가이드 | [operations/deploy-safety-guide.md](operations/deploy-safety-guide.md) |
| 모니터링/QA | [operations/monitoring.md](operations/monitoring.md) |
| 서비스 종료·저장소 폐쇄 | [operations/service-shutdown.md](operations/service-shutdown.md) |

## 폴더 구조

```text
docs/
├── README.md
├── specs/                    # 명세(SDD) — 무엇을 보장하는가
│   ├── README.md
│   └── platform/
│       └── rendering-contract.md
├── tests/                    # 테스트(TDD) — 무엇이 그 보장을 검증하는가
│   ├── strategy.md           # 계층별 책임·게이트 정책
│   ├── unit-testing.md
│   └── e2e-testing.md
├── wbs/                      # 작업 분해 — 무엇이 남았고 무엇에 막혀 있는가
│   └── README.md
├── architecture/
│   ├── system-overview.md
│   ├── ai-infrastructure.md
│   ├── db-abstraction.md
│   ├── auth-abstraction.md
│   ├── data-model.md
│   └── i18n.md
├── conventions/
│   ├── coding-style.md
│   ├── cross-platform.md
│   ├── i18n-style.md
│   ├── image-assets.md
│   ├── layout-rules.md
│   └── zod-schemas.md
├── design/
│   ├── design-brief.md
│   ├── implementation-plan.md
│   ├── characters/
│   └── screenshots/
├── workflow/                 # 작업 절차 (테스트 문서는 tests/로 이동)
│   ├── ci-cd.md
│   ├── code-change-process.md
│   ├── scripts.md
│   └── task-playbooks.md
├── operations/
│   ├── deployment.md
│   ├── deploy-safety-guide.md
│   ├── e2e-incidents.md      # E2E CI 인시던트 계측·이력 정본
│   ├── env-variables.md
│   ├── known-issues.md
│   ├── monitoring.md
│   ├── operation-guide.md
│   └── service-shutdown.md  # 운영 종료·데이터 파기·저장소 폐쇄 절차 정본
├── archive/
│   └── ai-quality-roadmap.md
└── superpowers/         # 방법론 기반 계획·설계 보관소
    ├── plans/           # 활성 계획 (완료분은 archive/, 각 archive에 README 인벤토리)
    │   └── archive/     # 동결 — 링크 검사 제외
    └── specs/           # 활성 설계 — 살아있는 문서가 링크하므로 링크 검사 대상
        └── archive/     # 동결 — 링크 검사 제외
```

> **개수는 적지 않는다.** 예전에는 "활성 설계 20 / 완료 설계 12"처럼 수치를 박아뒀는데
> 실제와 3배 넘게 어긋난 채 방치됐다. 파일 목록은 `check:doc-links`가 강제하지만
> 수치는 검증되지 않는다 — 애초에 적지 않는 편이 정확하다.

## 관리 원칙

- 루트 `CLAUDE.md`에는 빠른 판단에 필요한 요약과 링크만 둡니다.
- 중복 설명이 필요하면 한 곳을 정본으로 두고 다른 문서에서는 링크로 참조합니다.
- 코드와 달라지기 쉬운 숫자(테스트 수, 커버리지 상세, 버전)는 가능하면 검증 스크립트나 `package.json`을 기준으로 안내합니다.
- 변경 후에는 `pnpm check:doc-links`로 문서 링크를 확인합니다.
