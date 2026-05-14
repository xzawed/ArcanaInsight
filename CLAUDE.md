# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로, 사주, 신점 리딩을 받는 운세 종합 콘텐츠 플랫폼.

이 파일은 세션 시작용 빠른 지도입니다. 세부 규칙과 긴 설명은 `docs/`의 주제별 문서를 정본으로 삼습니다.

업무 유형별 진행 순서는 [`.claude/WORKFLOW.md`](.claude/WORKFLOW.md)를 참고한다.

## 세션 시작 순서

1. `git status --short`로 사용자 변경 사항을 먼저 확인한다.
2. 요청과 관련된 파일만 읽되, 불확실한 내용은 코드와 문서를 대조한다.
3. 문서 정합성은 [`docs/README.md`](docs/README.md)에서 주제별 정본을 찾아 확인한다.
4. 운영 상태 확인이 필요한 작업은 [`docs/operations/monitoring.md`](docs/operations/monitoring.md)를 따른다.
5. 코드 변경 후 관련 문서도 함께 갱신한다.

## 기술 스택

| 영역 | 현재 기준 |
|---|---|
| 언어/프레임워크 | TypeScript strict, Next.js 16.2.6 App Router, React 19.2.4 |
| 스타일/애니메이션 | Tailwind CSS v4, Framer Motion v12.38 |
| AI | Grok API 우선, Claude API 자동 fallback |
| 인증/DB | Supabase Auth + Supabase PostgreSQL 기본, `DB_PROVIDER=postgres` 전환 시 NextAuth.js v5 + Drizzle |
| 상태/패키지 | Zustand v5, pnpm 10.33.0 |
| i18n | 자체 translations 모듈, ko/en/ja, `ai_locale` 쿠키 |
| 테스트 | Vitest, Playwright. 실제 테스트 수는 coverage 실행 결과를 기준으로 확인 |
| 배포 | GitHub Actions, Railway |

## 프로젝트 구조

```text
src/
├── app/             # App Router 페이지와 API
├── components/      # card, character, chat, common, effects, home, layout, saju, shinjeom, skin, tarot
│   ├── card/        # CardFace, CardBack, CardItem, CardStyleSelector (스타일 선택 UI)
│   ├── common/      # UserInfoForm (mode: "tarot"|"saju"|"shinjeom"), PageSpinner, BirthTimeInput
│   └── effects/     # ThemeEffectEngine, ThemeAtmosphereLayer, InteractionEffects,
│                    # ServiceBackground, ParticleOverlay, MysticBackground, ScrollReveal
├── data/            # cards, characters, home, saju, shinjeom/, skins, spreads, topics, mbti, topics-meta
│   └── cardStyles.ts  # CardStyleId, 4가지 아트 스타일, THEME_TO_STYLE_MAP
├── hooks/           # Zustand store와 UI/streaming hooks
│   ├── useCardStyleStore.ts   # 카드 스타일 persist 스토어 (arcana-card-style)
│   ├── useReadingReveal.ts    # 타로 카드 텍스트 reveal 타이밍 제어 스토어
│   ├── useShinjeomSession.ts  # 신점 세션 상태 스토어 (UserInfo 포함)
│   ├── useSajuSession.ts      # 사주 세션 상태 스토어
│   ├── useSession.ts          # 타로 세션 상태 스토어
│   ├── useUserInfoForm.ts     # UserInfoForm 상태·핸들러 추출 훅 (mode: tarot|saju|shinjeom)
│   ├── usePreselectCharacter.ts  # URL ?character= 파라미터 + 선호 상담사 자동 선택
│   ├── useResetScrollOnStep.ts   # step 변경 시 스크롤 최상단 초기화 (3페이지 공통)
│   └── (+ useLocaleStore, useGenderStore, useSkinStore, useFavoriteCharacter, useTheme, useSSEStream, useCardAnimation, useCharacter, useReducedMotionStore 등)
├── i18n/            # locale 감지, Provider, useT, translations
├── lib/             # env, auth, db, storage, validation, request/rate-limit 유틸
│   └── storage/card-style.ts  # getCardStyleImageUrl, getCardStyleBackUrl
├── services/        # core AI provider/fallback + tarot/saju/shinjeom 서비스
├── styles/          # theme-effects.css — CSS variable 기반 5-레이어 이펙트 정의
├── test-helpers/    # Vitest 공통 mock/setup
└── types/           # 공유 타입

docs/                # architecture, conventions, workflow, operations, archive
e2e/                 # Playwright specs
scripts/
├── e2e-full/        # E2E 전수 검증 오케스트레이터
└── generate-assets/ # Replicate API 이미지 생성 (카드·배경·데코 341장)
supabase/migrations/ # Supabase SQL migrations
```

## 핵심 아키텍처

- AI 신뢰성: `src/services/core/`의 `FallbackProvider`가 Grok 우선 호출 후 Claude로 fallback. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- DB/Auth 추상화: `DB_PROVIDER=supabase|postgres`에 따라 DB, Auth, Storage 구현을 런타임 분기. 상세는 [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md), [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md).
- API 보안: Rate Limit -> Zod `safeParse` -> Auth -> 소유권 검증 순서. 새 API는 [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)를 먼저 확인.
- SSE 스트리밍: 타로/사주/신점 리딩은 `SSE_HEADERS`, `fetchSSEStream()`, `AbortController` 패턴을 사용. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- i18n: `middleware`가 locale을 결정하고 `x-locale` 헤더와 쿠키를 유지. 상세는 [`docs/architecture/i18n.md`](docs/architecture/i18n.md), [`docs/conventions/i18n-style.md`](docs/conventions/i18n-style.md).
- 카드 아트 스타일: `CardStyleId`(dark-fantasy·art-nouveau·anime-mystical·modern-digital), `THEME_TO_STYLE_MAP`으로 테마 자동 매핑. `useCardStyleStore`가 사용자 override를 persist. `CardFace`/`CardBack`/`CardItem`은 styleId → skinId → SVG 순으로 이미지 우선순위 처리.
- 테마 이펙트: `ThemeEffectEngine`이 CSS 변수(`--theme-glow-color`, `--theme-particle-color` 등)를 주입. `ThemeAtmosphereLayer`(글로우·파티클 5-레이어), `InteractionEffects`(`InteractionClickParticles` — `document.addEventListener` 방식, pointer-events-none), `ServiceBackground`, `src/styles/theme-effects.css` 로 구성.
- 타로 텍스트 reveal: `useReadingReveal` 스토어가 `showLabel` 플래그를 관리. `CardFace` → `CardItem` → `CardSpread` → 타로 세션 페이지로 prop 체인 전달. result phase 진입 시에만 카드명 텍스트 노출.

## 캐릭터/데이터 기준

- 캐릭터 12명: `arcana`, `miko`, `seonhwa`, `hoshi`, `luna`, `rei`, `cairn`, `zero`, `haru`, `ren`, `lix`, `ethan`.
- 캐릭터 표정 타입: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`.
- 캐릭터 이미지는 `public/images/characters/[id]/nukki-enhanced/[mood].png` 경로를 사용한다.
- 카드, 스프레드, 스킨, 토픽 정본은 `src/data/`에 있다. 문서 설명은 [`docs/architecture/data-model.md`](docs/architecture/data-model.md).

## 주요 명령어

```bash
pnpm dev                  # 개발 서버
pnpm build                # 프로덕션 빌드
pnpm lint                 # ESLint
pnpm type-check           # tsc --noEmit
pnpm test:coverage        # Vitest + coverage
pnpm test:e2e             # Playwright
pnpm test:e2e:full        # 전수 E2E
pnpm test:e2e:full:ci     # 대표 케이스 E2E
pnpm sync:test-count      # 고정 테스트 수가 있는 문서 동기화
pnpm check:env-docs       # env.ts와 env 문서 정합성
pnpm check:doc-links      # 문서 링크 검증
pnpm i18n:check           # 번역 키 drift 검출
pnpm generate:assets      # Replicate API로 카드/배경/데코 이미지 생성 (REPLICATE_API_KEY 필요)
pnpm generate:assets:skip # 이미 존재하는 이미지 건너뛰고 생성
pnpm upload:assets        # 생성된 이미지를 Supabase Storage에 업로드
pnpm upload:assets:skip   # 이미 존재하는 이미지 건너뛰고 업로드
```

명령어 정책은 [`docs/workflow/scripts.md`](docs/workflow/scripts.md), 테스트 정책은 [`docs/workflow/unit-testing.md`](docs/workflow/unit-testing.md), [`docs/workflow/e2e-testing.md`](docs/workflow/e2e-testing.md)를 따른다.

## 환경변수

전체 목록과 전환 절차는 [`docs/operations/env-variables.md`](docs/operations/env-variables.md)가 정본이다.

## 변경 프로세스

상세 절차는 [`docs/workflow/code-change-process.md`](docs/workflow/code-change-process.md)를 따른다.

1. 코드/문서 변경 범위를 확인한다.
2. 관련 테스트와 정적 검사를 실행한다.
3. 사용자 변경 사항을 보존한다.
4. 변경한 동작과 문서를 함께 보고한다.

커밋 prefix와 브랜치 규칙은 [`docs/conventions/coding-style.md`](docs/conventions/coding-style.md)에 있다.

## 필수 주의사항

- 레이아웃: 캐릭터 등장 페이지의 5:5 규칙과 모바일 배치는 [`docs/conventions/layout-rules.md`](docs/conventions/layout-rules.md)를 따른다.
- 크로스 플랫폼: `100vh` 대신 `100dvh`, safe-area, focus-visible 규칙은 [`docs/conventions/cross-platform.md`](docs/conventions/cross-platform.md)를 따른다.
- SSR/Hydration: 비결정 값(`Date`, `Math.random`, `window`)은 클라이언트 effect 안에서만 다룬다.
- API 입력: 타입 단언보다 Zod schema와 `safeParse`를 사용한다.
- i18n: UI 텍스트는 번역 키를 우선 추가하고 `t()`/`useT()`로 노출한다.
- 테스트 파일: API 라우트 테스트는 `src/__tests__/api/`에 둔다.
- 패키지 추가: `pnpm-lock.yaml` 변동과 peer dependency 변화를 확인한다.
- SonarCloud 동기화: 새 TS 파일 추가 시 `sonar.coverage.exclusions`와 `sonar.cpd.exclusions`를 `sonar-project.properties`에 함께 추가한다.

## 업무별 진입점

| 업무 | 먼저 볼 문서 |
|---|---|
| 시스템 구조 | [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md) |
| AI/프롬프트 | [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md) |
| DB/Auth | [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md), [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md) |
| 캐릭터/카드/스킨 | [`docs/architecture/data-model.md`](docs/architecture/data-model.md) |
| 새 기능/페이지/API | [`docs/workflow/task-playbooks.md`](docs/workflow/task-playbooks.md) |
| 배포/운영 | [`docs/operations/deployment.md`](docs/operations/deployment.md), [`docs/operations/operation-guide.md`](docs/operations/operation-guide.md) |
| 미구현/기술부채 | [`docs/operations/known-issues.md`](docs/operations/known-issues.md) |

## Claude & Codex 역할 분담

**Claude 담당**: 기획·설계·아키텍처·문서·뼈대 스캐폴딩·PR 검토·머지 판단
**Codex 담당**: 코드 구현·단위 테스트·E2E 수정·로컬 검증 4종 실행

핸드오프 형식·재진입 조건·파일 소유권·품질 게이트 전체는 [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md)가 정본이다.

## Claude 자율 관리 규칙

- `.claude/agents/`에는 반복 작업용 에이전트 정의가 있다.
- 훅, deny 규칙, 배포 관련 파괴적 변경은 사용자 확인 후 진행한다.
- 문서 변경 보고 형식:

```text
문서 변경: [파일명] - 변경 이유: [이유] - 변경 내용: [1줄 요약]
```
