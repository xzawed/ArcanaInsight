# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로·사주 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 세션 시작 순서

1. **이 CLAUDE.md 전체** — 프로젝트 구조·규칙·아키텍처 파악
2. **`git log --oneline -10`** — 최근 변경사항
3. **메모리 확인** — `~/.claude/projects/.../MEMORY.md`
4. **요청 관련 파일만 Read** — 전체 코드베이스 탐색 금지
5. **불확실하면 질문 전에 코드 확인** — 추측 금지

## 기술 스택

| | |
|---|---|
| **언어·프레임워크** | TypeScript strict, Next.js 16.2.1 (App Router), React 19.2.4 |
| **스타일링·애니메이션** | Tailwind CSS v4 (`@theme`), Framer Motion v12.38 |
| **AI** | Grok API (xAI) 우선 + Claude API 자동 fallback |
| **인증·DB** | Supabase Auth / NextAuth.js v5 (DB_PROVIDER별 전환) |
| **DB ORM** | Supabase PostgreSQL / Drizzle ORM (DB_PROVIDER별 전환) |
| **상태·패키지** | Zustand v5.0, pnpm 10.33.0 |
| **테스트** | Vitest 2.0 (618개, statements 88%), Playwright (3 디바이스) |
| **CI/CD·호스팅** | GitHub Actions → Railway |

## 프로젝트 구조

```
src/
├── app/             # Pages & API (tarot·saju·shinjeom·mypage·auth·character·settings)
├── components/      # card/, character/, chat/, common/, effects/, home/, layout/, saju/, skin/, tarot/
├── data/            # cards/, characters/, skins/, spreads/, topics.ts, birth-hours.ts
├── hooks/           # Zustand stores + useSSEStream, useTheme, useFavoriteCharacter
├── lib/
│   ├── env.ts       # 환경변수 getter 16개 (하드코딩 금지)
│   ├── request-utils.ts  # getClientIp / pickFields / jsonError / SSE_HEADERS
│   ├── rate-limit.ts
│   ├── db/          # getDb() — SupabaseAdapter / PostgresAdapter (DB_PROVIDER 분기)
│   ├── auth/        # getCurrentUser() / requireUser() / assertSessionOwnership()
│   ├── validation/  # api-schemas.ts (Zod 7종)
│   └── storage/     # getCardImageUrl() — provider별 이미지 URL
├── services/        # core/ (FallbackProvider·PromptBuilder·CircuitBreaker·http-utils), tarot/, saju/, shinjeom/
├── types/           # card.ts, character.ts, session.ts, service.ts, user-info.ts
├── test-helpers/    # mock-db, mock-auth, mock-request, mock-ai, reset-modules, api-route-setup
└── __tests__/api/   # API 라우트 단위 테스트 (vitest.config.ts exclude 우회)

docs/                # → docs/README.md 인덱스
├── architecture/    # system-overview, ai-infrastructure, db-abstraction, auth-abstraction, data-model
├── conventions/     # coding-style, layout-rules, cross-platform, zod-schemas, image-assets
├── workflow/        # e2e-testing, unit-testing, task-playbooks, code-change-process, ci-cd
├── operations/      # known-issues, env-variables, deployment, monitoring, operation-guide
└── archive/         # process-diagrams, skills-original, ai-quality-roadmap

supabase/migrations/ # 001~011 SQL (002 결번, PostgreSQL 모드: src/lib/db/schema/index.ts)
e2e/                 # 19개 spec, 3 디바이스 — → docs/workflow/e2e-testing.md
scripts/             # sync-test-count.ts, check-env-docs.ts, check-doc-links.ts, pre-push-checks.sh
```

## 캐릭터 시스템

12명, 각자 다른 말투로 타로·사주·신점 전체 제공. 상세: [`docs/architecture/data-model.md`](docs/architecture/data-model.md)

| ID | 이름 | 성별 | 말투 | 특기 |
|---|---|---|---|---|
| `arcana` | 아르카나 | 여 | ~네요/~해요, 신비 | 직관·감성 |
| `miko` | 미코 | 여 | ~입니다, 엄숙 | 영적 해석 |
| `seonhwa` | 선화 | 여 | ~랍니다, 우아 | 동양적 해석 |
| `hoshi` | 호시 | 여 | ~야/~지, 반말+이모지 | 캐주얼 |
| `luna` | 루나 | 여 | ~요/~네요, 다정·신비 | 힐링 |
| `rei` | 레이 | 여 | ~야/~지, 건조·핵심 | 냉철 분석 |
| `cairn` | 카이른 | 남 | ~습니다, 격식 | 젠틀 |
| `zero` | 제로 | 남 | ~다/~지, 시적 저음 | 로맨틱 |
| `haru` | 하루 | 남 | ~요/~세요, 친근 | 응원·힐링 |
| `ren` | 렌 | 남 | ~오/~하오, 고풍 | 선인 |
| `lix` | 릭스 | 남 | ~는데/~ㄹ까, 장난 | 트릭스터 |
| `ethan` | 에단 | 남 | ~거든요, 친절·상세 | 학구적 |

**표정 규칙 (3단계만)**: `default` → 세션 진입/대기 | `mystical` → 카드 선택/리딩 대기 | `smile` → 결과 도착. 에러 시 `default` 복귀. 대기 대사 중 표정 변경 금지.

**이미지 경로**: 12캐릭터 모두 `nukki/[mood].png` (1408×768)

## 핵심 아키텍처

**AI 신뢰성**: `services/core/` = Grok 우선 + Claude 자동 fallback. → [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md)

**DB_PROVIDER**: `supabase`(기본) ↔ `postgres` 즉시 전환. `getDb()` / `getCurrentUser()` / `getCardImageUrl()` 자동 분기. → [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md)

**API 보안**: Rate Limit → Zod safeParse → requireUser → assertSessionOwnership. → [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md)

**SSE 스트리밍**: tarot/saju/shinjeom reading API. 서버 공통 헤더 `SSE_HEADERS` + `jsonError()` (`src/lib/request-utils.ts`), Provider 공통 SSE 리더 `readSseLines` + `withAbortTimeout` (`src/services/core/http-utils.ts`). 클라이언트 `fetchSSEStream()` (`src/hooks/useSSEStream.ts`). `/api/daily-card`는 JSON (비스트리밍).

**share_token**: `/*/result/[id]` 공개 공유. 소유자 전용 = `assertReadingAccess("owner")`.

## 명령어

```bash
pnpm dev           # 개발 서버
pnpm build         # 프로덕션 빌드
pnpm lint          # ESLint
pnpm type-check    # tsc --noEmit
pnpm test:coverage # Vitest + 커버리지 (statements 88%)
pnpm test:e2e      # Playwright (3 디바이스)
pnpm exec tsx scripts/sync-test-count.ts       # CLAUDE.md 테스트 수 동기화
pnpm exec tsx scripts/check-env-docs.ts        # env.ts ↔ env-variables.md 정합성
pnpm exec tsx scripts/check-doc-links.ts       # docs 링크 검증
```

> **Windows E2E**: Docker 필수. → [`docs/workflow/e2e-testing.md`](docs/workflow/e2e-testing.md)

## 환경변수

→ 전체 목록·전환 방법: [`docs/operations/env-variables.md`](docs/operations/env-variables.md)

**Supabase 모드 필수**: `GROK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`

**PostgreSQL 모드 추가**: `DB_PROVIDER=postgres`, `POSTGRES_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`

## 코드 변경 프로세스

→ 상세: [`docs/workflow/code-change-process.md`](docs/workflow/code-change-process.md)

**7단계**: 코드변경 → 로컬검증(`type-check + lint + test + build`) → 리뷰 → 커밋+PR → CI → 머지+배포 → **CLAUDE.md 최신화(필수, 예외 없음)**

**커밋 prefix**: `feat:` 새기능 | `fix:` 버그 | `docs:` 문서 | `chore:` 설정 | `refactor:` 구조개선 | `style:` UI | `test:` 테스트 | `merge:` 머지

**CI/CD**: PR→main: lint→build→E2E. 주간QA 토요일. Railway 자동배포. → [`docs/workflow/ci-cd.md`](docs/workflow/ci-cd.md)

## 레이아웃 규칙 (필수 준수)

캐릭터 등장 모든 페이지. 상세: [`docs/conventions/layout-rules.md`](docs/conventions/layout-rules.md)

- **데스크탑**: 캐릭터 `md:w-1/2` + 콘텐츠 `md:w-1/2` (5:5 flex)
- **모바일**: `flex-col`. 캐릭터 `h-[25%]`, 콘텐츠 `overflow-y-auto`
- **CSS mask 표준값** (수치 임의 변경 금지):
  ```
  top: transparent 0% → black 14%    bottom: transparent 0% → black 18%
  left/right: transparent 0% → black 10%
  ```
- `CharacterDisplay` 컴포넌트 사용 시 자동 적용. 직접 `<Image>` 사용 시 래퍼 div에 적용.

## 크로스 플랫폼 규칙 (필수 준수)

상세: [`docs/conventions/cross-platform.md`](docs/conventions/cross-platform.md)

- **`100vh` 금지** → `100dvh` 사용 (iOS Safari 호환). 패턴: `h-[calc(100dvh-7rem)]`
- **하단 고정 요소**: `pb-[env(safe-area-inset-bottom)]` 필수
- **`overflow-x: clip`** (`hidden` 대신 — iOS 스크롤 바운스 호환)
- **포커스**: `:focus { outline: none }` + `:focus-visible { outline: ... }` 유지

## 필수 주의사항

1. **Zod `null` vs `undefined`**: Zustand `null` 초기값 필드 → `.nullish()` 필수. 위반 시 프로덕션 400 (로컬 통과) — **2026-04-24 장애 원인**. → [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)
2. **SSR 비결정 값 금지**: `new Date()`, `Math.random()` 등 → `useEffect` 안에서만. 초기값은 `""`/`0`/`null`. React error #418 방지.
3. **`<Image fill>` sizes 필수**: 미설정 시 Mobile Android CI 타임아웃. `sizes="(max-width: 640px) 50vw, ..."` 필수.
4. **API 라우트 테스트 경로**: `src/app/api/` 내 `*.test.ts`는 vitest 수집 불가 → `src/__tests__/api/` 배치. → [`docs/workflow/unit-testing.md`](docs/workflow/unit-testing.md)
5. **API 스키마**: 새 라우트 → `api-schemas.ts` Zod 먼저 정의, `safeParse` 사용. 타입 단언 `as {...}` 금지.
6. **API 라우트 outer catch 커버리지**: `POST` 핸들러 최외부 `} catch {` 블록은 `checkRateLimit: vi.fn().mockRejectedValue(new Error(...))` 패턴으로 커버. 미커버 시 Codecov patch 실패.

## 업무 유형별 가이드

→ 상세: [`docs/workflow/task-playbooks.md`](docs/workflow/task-playbooks.md)

| 업무 | 진입 파일 | 에이전트 |
|------|----------|---------|
| 새 캐릭터 | `src/data/characters/index.ts`, `waiting-lines.ts` | `character-add` |
| 새 운세 서비스 | `src/services/core/ai-provider.ts` | `divination-scaffold` |
| 새 페이지 | `src/app/layout.tsx`, `Header.tsx`, `MobileNav.tsx` | `page-builder` |
| 테마·스타일 | `src/app/globals.css`, `useTheme.ts` | `theme-creator` |
| 카드 스킨 | `src/data/skins/index.ts`, `src/lib/storage/index.ts` | `skin-manager` |
| DB 스키마 | `supabase/migrations/`, `src/lib/db/schema/index.ts` | — |
| AI 프롬프트 | `src/services/core/prompt-builder.ts`, `[service]-service.ts` | — |
| 코드 품질 검증 | `pnpm type-check && pnpm lint && pnpm build` | `quality-gate` |

## 미구현 기능·기술 부채

→ **정본**: [`docs/operations/known-issues.md`](docs/operations/known-issues.md)

- rate-limit: UPSTASH_REDIS_REST_URL 미설정 시 in-memory fallback (분산 처리 미활성화)

## Claude 자율 관리 규칙

| 리소스 | 경로 |
|--------|------|
| 스킬 | `~/.claude/skills/` / superpowers |
| 에이전트 | `.claude/agents/*.md` |
| 훅 | `.claude/settings.json` hooks |
| 문서 | 프로젝트 내 모든 `.md` |

**에이전트** (`.claude/agents/`): `character-add`, `divination-scaffold`, `page-builder`, `quality-gate`, `skin-manager`, `theme-creator`

**훅**: PreToolUse → Bash `git push*` → `scripts/pre-push-checks.sh` (tsc+lint+build)

**자율 관리 원칙**: 필요하면 즉시 생성, 불필요하면 즉시 삭제, 변경 후 보고. 파괴적 변경(deny 규칙·훅 삭제)만 사전 확인.

**문서 관리**: 코드 변경 시 관련 문서 동시 업데이트. 중복은 링크로 대체. **High 등급(CLAUDE.md, README*, docs/architecture/*, known-issues.md, LICENSE) 변경 시 multi-agent ≥2 분리 검증 필수** (정합성·누락·구조). 변경 보고:
```
📄 문서 변경: [파일명] — 변경 이유: [이유] — 변경 내용: [1줄 요약]
```

## 운영 체계

**Claude CLI**: 기획·구현·검토·배포 모두 수행 (7단계 프로세스)

**Grok API**: 프로덕션 리딩 + 이미지 생성 전용 (비용 최적화)

**n8n Cloud** (`xzawed.app.n8n.cloud`): Spec Tracker / Quality Monitor / Weekly Report 운영 중. → [`docs/operations/monitoring.md`](docs/operations/monitoring.md)

**단일 진실 소스**: 이 CLAUDE.md + `docs/` 체계. → [`docs/README.md`](docs/README.md) 인덱스
