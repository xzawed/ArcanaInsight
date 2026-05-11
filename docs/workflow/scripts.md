# Scripts 운영 정책

> **담당**: Claude (`pnpm check:doc-links`, `pnpm check:env-docs` 결과 해석·대응 결정) | Codex (`pnpm type-check`, `pnpm lint`, `pnpm test:coverage`, `pnpm build` 실행)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)

> `scripts/` 디렉토리의 모든 스크립트를 호출 위치·용도·실행 빈도로 분류한 인덱스.

## 1. 자동 호출 (CI / git hook)

| 스크립트 | 호출 위치 | 용도 |
|---|---|---|
| `pre-push-checks.sh` | `.claude/settings.json` PreToolUse hook | `tsc --noEmit` + `eslint` + `next build` 통과 확인 후 push 허용 |
| `check-doc-links.ts` | `.github/workflows/docs-sync.yml` + `pnpm check:doc-links` | docs/ 내 상대 링크·앵커 검증, 깨진 링크 보고 |
| `check-translation-keys.ts` | `.github/workflows/docs-sync.yml` + `pnpm i18n:check` | 번역 키 drift 검출 (ko/en/ja 동기화 검증) |
| `e2e-full/orchestrator.ts` | `pnpm test:e2e:full` / `pnpm test:e2e:full:ci` | 252 조합 멀티 에이전트 E2E (CI 자동 미연동, 수동 또는 별도 트리거) |

## 2. 명령어 등록 (`pnpm <name>`)

| 명령어 | 스크립트 | 용도 |
|---|---|---|
| `pnpm check:doc-links` | `check-doc-links.ts` | docs 링크 검증 (로컬·CI) |
| `pnpm check:env-docs` | `check-env-docs.ts` | `src/lib/env.ts` ↔ `docs/operations/env-variables.md` 정합성 |
| `pnpm i18n:check` | `check-translation-keys.ts` | 번역 키 drift 검출 (로컬·CI) |
| `pnpm sync:test-count` | `sync-test-count.ts` | vitest 실제 테스트 수 측정 후 CLAUDE.md·unit-testing.md 자동 갱신 |
| `pnpm generate:assets` | `generate-assets/index.ts` | Replicate API로 카드·배경·데코 이미지 생성 (`REPLICATE_API_KEY` 필요) |
| `pnpm generate:assets:skip` | `generate-assets/index.ts --skip-existing` | 이미 존재하는 이미지를 건너뛰고 생성 |
| `pnpm download:skins` | `download-skin-images.ts` | Supabase Storage 스킨 이미지 로컬 다운로드 (관리자) |
| `pnpm upload:assets` | `generate-assets/upload-to-supabase.ts` | 로컬 카드·배경·데코 이미지를 Supabase Storage 업로드 |
| `pnpm upload:assets:skip` | `generate-assets/upload-to-supabase.ts --skip-existing` | 이미 존재하는 이미지를 건너뛰고 업로드 |
| `pnpm test:e2e:full` | `e2e-full/orchestrator.ts --mode=full --workers=6` | 전수 E2E (실서버 + 실 API 키 필요) |
| `pnpm test:e2e:full:ci` | `e2e-full/orchestrator.ts --mode=ci` | CI 대표 12 조합 |

## 3. 수동 자산 생성 (`tsx scripts/<name>.ts` 직접 실행)

> 1년에 1~2회 자산 갱신할 때만 실행. npm script 미등록.

| 스크립트 | 용도 |
|---|---|
| `generate-characters.ts` | 캐릭터 이미지 생성 (Grok 이미지 API, 구버전) |
| `generate-character-images-v2.mjs` | 캐릭터 누끼 이미지 생성 v2 (현행 기준) |
| `generate-card-images.ts` | 타로 카드 이미지 생성 |
| `generate-skin-images.ts` | 카드 스킨 이미지 생성 |
| `generate-backgrounds.ts` | 배경 이미지 생성 |
| `generate-icons.ts` | 아이콘 이미지 생성 |
| `generate-placeholders.sh` | 플레이스홀더 이미지 생성 (bash) |
| `upload-skin-images.ts` | 로컬 스킨 이미지를 Supabase Storage 업로드 |

## 4. e2e-full 디렉토리 (멀티 에이전트 E2E)

| 파일 | 역할 |
|---|---|
| `orchestrator.ts` | 진입점 — 매트릭스 분배·워커 관리·결과 집계 |
| `worker.ts` | Playwright 실행 단위 |
| `reporter.ts` | 결과 보고 |
| `types.ts` | 공통 타입 |
| `matrix/` | 캐릭터·타로·사주·신점·CI subset 매트릭스 정의 |
| `flows/` | 서비스별 플로우 |
| `validators/` | 구조·콘텐츠 검증 (Haiku API 사용) |

**CI 통합 정책**: 정기 실행 미연동. 주간 QA 또는 릴리즈 전 수동 트리거. 사유는 실 API 키·실 Supabase 세션 필요.

## 5. 기타

- 모든 새 스크립트는 추가 시 본 문서에 행을 더해 호출 정책을 명시한다.
- 자동 호출 스크립트(`pre-push-checks.sh`, `check-doc-links.ts`)는 깨지면 push·CI 차단 — 수정 시 같은 PR에 검증 결과 첨부 필수.
