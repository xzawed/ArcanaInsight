# ArcanaInsight 문서 인덱스

이 폴더는 프로젝트의 장기 정본 문서를 주제별로 보관합니다. 루트 `CLAUDE.md`는 빠른 진입점이고, 세부 규칙과 배경 설명은 이 문서들이 기준입니다.

## 업무 유형별 진입점

| 업무 | 진입 문서 |
|---|---|
| 시스템 구조 이해 | [architecture/system-overview.md](architecture/system-overview.md) |
| AI/LLM fallback, SSE, JSON 파싱 | [architecture/ai-infrastructure.md](architecture/ai-infrastructure.md) |
| DB 공급자 전환 | [architecture/db-abstraction.md](architecture/db-abstraction.md) |
| Auth 추상화와 API 보안 | [architecture/auth-abstraction.md](architecture/auth-abstraction.md) |
| 캐릭터, 카드, 스킨 데이터 | [architecture/data-model.md](architecture/data-model.md) |
| 다국어 인프라 | [architecture/i18n.md](architecture/i18n.md) |
| 코드 변경 절차 | [workflow/code-change-process.md](workflow/code-change-process.md) |
| 단위 테스트 | [workflow/unit-testing.md](workflow/unit-testing.md) |
| E2E 테스트 | [workflow/e2e-testing.md](workflow/e2e-testing.md) |
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

## 폴더 구조

```text
docs/
├── README.md
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
├── workflow/
│   ├── ci-cd.md
│   ├── code-change-process.md
│   ├── e2e-testing.md
│   ├── scripts.md
│   ├── task-playbooks.md
│   └── unit-testing.md
├── operations/
│   ├── deployment.md
│   ├── deploy-safety-guide.md
│   ├── env-variables.md
│   ├── known-issues.md
│   ├── monitoring.md
│   └── operation-guide.md
├── archive/
│   └── ai-quality-roadmap.md
└── superpowers/         # 방법론 기반 계획·설계 보관소
    ├── plans/           # 활성 계획 1
    │   └── archive/     # 완료 계획 38 (+README 인벤토리)
    └── specs/           # 활성 설계 20
        └── archive/     # 완료 설계 12 (+README 인벤토리)
```

## 관리 원칙

- 루트 `CLAUDE.md`에는 빠른 판단에 필요한 요약과 링크만 둡니다.
- 중복 설명이 필요하면 한 곳을 정본으로 두고 다른 문서에서는 링크로 참조합니다.
- 코드와 달라지기 쉬운 숫자(테스트 수, 커버리지 상세, 버전)는 가능하면 검증 스크립트나 `package.json`을 기준으로 안내합니다.
- 변경 후에는 `pnpm check:doc-links`로 문서 링크를 확인합니다.
