# Scripts 운영 정책

> **담당**: Claude (`pnpm check:doc-links`, `pnpm check:env-docs` 결과 해석·대응 결정) | Codex (`pnpm type-check`, `pnpm lint`, `pnpm test:coverage`, `pnpm build` 실행)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)

> `scripts/` 디렉토리의 모든 스크립트를 호출 위치·용도·실행 빈도로 분류한 인덱스.

## 1. 자동 호출 (CI / git hook)

| 스크립트 | 호출 위치 | 용도 |
|---|---|---|
| `pre-push-checks.sh` | `.claude/settings.json` PreToolUse hook | `tsc --noEmit` + `eslint` + `next build` 통과 확인 후 push 허용 |
| `hooks/upload-assets-r2-guard.sh` | `.claude/settings.json` PreToolUse `Bash(pnpm upload:assets*)` | `upload:assets`(`:r2` 없음=Supabase) 실행 시 "card-styles는 R2로 이전됨 → `upload:assets:r2` 사용" 확인 요청 |
| `check-doc-links.ts` | `.github/workflows/docs-sync.yml` + `pnpm check:doc-links` | docs/ 내 상대 링크(파일 존재) 검증. 동결 스냅샷(`superpowers/plans/archive`·`superpowers/specs`)은 제외, 깨진 링크 발견 시 exit 1(push·CI 차단) |
| `check-translation-keys.ts` | `.github/workflows/docs-sync.yml` + `pnpm i18n:check` | 번역 키 drift 검출 (ko/en/ja 동기화 검증) |
| `e2e-full/orchestrator.ts` | `pnpm test:e2e:full` / `pnpm test:e2e:full:ci` | 252 조합 멀티 에이전트 E2E (CI 자동 미연동, 수동 또는 별도 트리거) |
| `eval-reading.ts` | `pnpm eval:reading` | 리딩 품질 계약 회귀 검증 — 타로·사주·신점 리딩 API에 익명 요청→SSE 파싱→directAnswer·overallReading·parseError·본문 검증. CI 미연동(실 AI 호출·온디맨드), `EVAL_BASE_URL`로 대상 지정 |
| `smoke-prod.mjs` | `.github/workflows/post-deploy-smoke.yml` + `pnpm smoke:prod` | 배포 후 프로덕션 스모크 — health·홈+자산호스트 인라인·R2 이미지 200 검증(무비용). main push마다 배포 대기 후 자동 실행. `--reading`으로 타로 1건 포함(AI 비용), `SMOKE_BASE_URL`로 대상 지정 |
| `verify-railway-config.mjs` | `pnpm verify:railway-config` | standalone 배포 필수조건 검증 — Railway API로 `startCommand=node server.js`·서비스 변수 `HOSTNAME=0.0.0.0` assert(불일치 exit 1). `railway login`/`RAILWAY_API_TOKEN` 필요 |

## 2. 명령어 등록 (`pnpm <name>`)

| 명령어 | 스크립트 | 용도 |
|---|---|---|
| `pnpm check:doc-links` | `check-doc-links.ts` | docs 링크 검증 (로컬·CI) |
| `pnpm check:env-docs` | `check-env-docs.ts` | `src/lib/env.ts` ↔ `docs/operations/env-variables.md` 정합성 |
| `pnpm i18n:check` | `check-translation-keys.ts` | 번역 키 drift 검출 (로컬·CI) |
| `pnpm sync:test-count` | `sync-test-count.ts` | vitest 실제 테스트 수 측정 후 CLAUDE.md·unit-testing.md 자동 갱신 |
| `pnpm eval:reading` | `eval-reading.ts` | 리딩 품질 계약 검증(directAnswer·overallReading·parseError·SSE). `EVAL_BASE_URL` 지정(기본 프로덕션), `--service=` 필터. 실 AI 호출·온디맨드 |
| `pnpm smoke:prod` | `smoke-prod.mjs` | 배포 후 프로덕션 스모크(health·홈 자산호스트·R2 이미지). `SMOKE_BASE_URL` 지정, `--reading`=타로 1건. main push마다 CI 자동 실행 |
| `pnpm verify:railway-config` | `verify-railway-config.mjs` | standalone 배포 필수조건(startCommand·HOSTNAME) Railway API 검증 |
| `pnpm generate:assets` | `generate-assets/index.ts` | Replicate API로 카드·배경·데코 이미지 생성 (`REPLICATE_API_KEY` 필요) |
| `pnpm generate:assets:skip` | `generate-assets/index.ts --skip-existing` | 이미 존재하는 이미지를 건너뛰고 생성 |
| `pnpm generate:service-bg` | `generate-service-backgrounds.ts` | 서비스(타로/사주/신점) 배경 이미지 생성 |
| `pnpm generate:service-bg:skip` | `generate-service-backgrounds.ts --skip` | 기존 서비스 배경 건너뛰고 생성 |
| `pnpm download:skins` | `download-skin-images.ts` | (레거시) Supabase Storage 스킨 로컬 다운로드 — card-skins R2 이전(2026-07-07)으로 Supabase 버킷 삭제 후 무효 |
| `pnpm upload:assets:r2` | `generate-assets/upload-to-r2.ts` | **(정본)** 로컬 카드·배경 → Cloudflare R2(`cdn.xzawed.xyz/card-styles`), ETag=md5 무결성 검증. `.env.r2.local` 필요 |
| `pnpm upload:assets:r2:skip` | `generate-assets/upload-to-r2.ts --skip-existing` | R2에 이미 있는 키 건너뛰고 업로드 |
| `pnpm upload:skins:r2` | `generate-assets/upload-skins-r2.ts` | **(정본)** 로컬 카드 스킨 → Cloudflare R2(`cdn.xzawed.xyz/card-skins`), ETag=md5 검증. `.env.r2.local` 필요 |
| `pnpm upload:skins:r2:skip` | `generate-assets/upload-skins-r2.ts --skip-existing` | R2에 이미 있는 스킨 키 건너뛰고 업로드 |
| `pnpm upload:assets` | `generate-assets/upload-to-supabase.ts` | (레거시) Supabase Storage 업로드 — card-styles는 R2로 이전됨, **정본 아님**(가드 훅이 확인 요청) |
| `pnpm upload:assets:skip` | `generate-assets/upload-to-supabase.ts --skip-existing` | (레거시) Supabase 업로드, 기존 건너뜀 |
| `pnpm test:e2e:full` | `e2e-full/orchestrator.ts --mode=full --workers=6` | 전수 E2E (실서버 + 실 API 키 필요) |
| `pnpm test:e2e:full:ci` | `e2e-full/orchestrator.ts --mode=ci` | CI 대표 12 조합 |
| `pnpm enhance:images` | `enhance-character-images.mjs` | 캐릭터 이미지 보정 (Node.js) |
| `pnpm polish:images` | `polish-character-images.py` | 캐릭터 이미지 후처리 (Python) |
| `pnpm remove:bg:pilot` | `remove-character-bg.mjs --pilot` | 배경 제거 파일럿 (1장 테스트) |
| `pnpm remove:bg:full` | `remove-character-bg.mjs --full` | 전체 캐릭터 배경 제거 |

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
| `generate-assets/upload-skins-r2.ts` | 로컬 스킨 → Cloudflare R2(`card-skins/`) 업로드 (정본) |
| `upload-skin-images.ts` | ⚠️ (폐지) 로컬 스킨 → Supabase Storage 업로드 — R2 이전(2026-07-07)으로 대상 버킷 삭제됨 |

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
