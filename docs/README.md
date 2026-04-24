# ArcanaInsight 문서 인덱스

이 폴더는 CLAUDE.md의 세부 내용을 업무 유형별로 분류한 하위 문서 모음입니다.
CLAUDE.md는 포인터(≤250줄)만 유지하며, 각 주제의 정본은 이 폴더 안에 위치합니다.

## 업무 유형별 진입점

| 업무 | 진입 문서 |
|------|----------|
| 시스템 구조 이해 | [architecture/system-overview.md](architecture/system-overview.md) |
| AI 인프라 이해 | [architecture/ai-infrastructure.md](architecture/ai-infrastructure.md) |
| DB 추상화 이해 | [architecture/db-abstraction.md](architecture/db-abstraction.md) |
| Auth 추상화·API 보안 | [architecture/auth-abstraction.md](architecture/auth-abstraction.md) |
| 캐릭터·카드·스킨 데이터 모델 | [architecture/data-model.md](architecture/data-model.md) |
| 코드 변경 절차 | [workflow/code-change-process.md](workflow/code-change-process.md) |
| E2E 테스트 실행 | [workflow/e2e-testing.md](workflow/e2e-testing.md) |
| 단위 테스트 패턴 | [workflow/unit-testing.md](workflow/unit-testing.md) |
| 캐릭터/스킨/페이지 추가 | [workflow/task-playbooks.md](workflow/task-playbooks.md) |
| CI/CD 파이프라인 | [workflow/ci-cd.md](workflow/ci-cd.md) |
| 코딩 스타일·컨벤션 | [conventions/coding-style.md](conventions/coding-style.md) |
| 레이아웃 5:5 규칙 | [conventions/layout-rules.md](conventions/layout-rules.md) |
| 크로스플랫폼 품질 | [conventions/cross-platform.md](conventions/cross-platform.md) |
| Zod 스키마·API 입력 검증 | [conventions/zod-schemas.md](conventions/zod-schemas.md) |
| 이미지 에셋 규칙 | [conventions/image-assets.md](conventions/image-assets.md) |
| 환경변수 목록 | [operations/env-variables.md](operations/env-variables.md) |
| 운영자 가이드 | [operations/operation-guide.md](operations/operation-guide.md) |
| 미구현/기술부채 | [operations/known-issues.md](operations/known-issues.md) |
| 배포/롤백 절차 | [operations/deployment.md](operations/deployment.md) |
| 모니터링·QA·n8n | [operations/monitoring.md](operations/monitoring.md) |
| 내부 흐름도 아카이브 | [archive/process-diagrams.md](archive/process-diagrams.md) |

## 폴더 구조

```
docs/
├── README.md                   # 이 파일 — 인덱스
├── architecture/               # "시스템을 이해한다" ✅ PR-3 완성
│   ├── system-overview.md
│   ├── ai-infrastructure.md
│   ├── db-abstraction.md
│   ├── auth-abstraction.md
│   └── data-model.md
├── workflow/                   # "어떻게 변경하는가" ✅ PR-4 완성
│   ├── e2e-testing.md          # PR-2
│   ├── unit-testing.md         # PR-3
│   ├── task-playbooks.md       # PR-3
│   ├── code-change-process.md  # PR-4
│   └── ci-cd.md                # PR-4
├── conventions/                # "어떻게 작성하는가" ✅ PR-3 완성
│   ├── coding-style.md
│   ├── layout-rules.md
│   ├── cross-platform.md
│   ├── zod-schemas.md
│   └── image-assets.md
├── operations/                 # "운영하는 법" ✅ PR-4 완성
│   ├── known-issues.md         # PR-1
│   ├── operation-guide.md      # PR-2 (이동)
│   ├── env-variables.md        # PR-4
│   ├── deployment.md           # PR-4
│   └── monitoring.md           # PR-4
└── archive/                    # "역사적 자료" ✅ PR-4 완성
    ├── skills-original.md      # PR-2 (이동)
    ├── ai-quality-roadmap.md   # PR-2 (이동)
    └── process-diagrams.md     # PR-4 (process.md 분해)
```

> **완성 현황**: PR-1(known-issues) → PR-2(archive 이동) → PR-3(architecture/conventions 분할)
> → PR-4(workflow/operations 완성 + process.md 분해) → PR-5(CLAUDE.md 250줄 축약)
