# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로, 사주, 신점 리딩을 받는 운세 종합 콘텐츠 플랫폼.

이 파일은 세션 시작용 빠른 지도입니다. 세부 규칙과 긴 설명은 `docs/`의 주제별 문서를 정본으로 삼습니다.

업무 유형별 진행 순서는 `.claude/rules/workflow.md`에 정의되어 있으며 매 세션 자동 로드된다.

## 세션 시작 순서

1. `git status --short`로 사용자 변경 사항을 먼저 확인한다.
2. 요청과 관련된 파일만 읽되, 불확실한 내용은 코드와 문서를 대조한다.
3. 문서 정합성은 [`docs/README.md`](docs/README.md)에서 주제별 정본을 찾아 확인한다.
4. 운영 상태 확인이 필요한 작업은 [`docs/operations/monitoring.md`](docs/operations/monitoring.md)를 따른다.
5. 코드 변경 후 관련 문서도 함께 갱신한다.

## 기술 스택

| 영역 | 현재 기준 |
|---|---|
| 언어/프레임워크 | TypeScript strict, Next.js 16.2.11 App Router, React 19.2.4 |
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
├── app/             # App Router. 라우트 그룹 분리: (immersive)=몰입형(타로·사주·신점 세션/진입·character/[id], Footer 미렌더) / (site)=일반(홈·결과·마이페이지·약관 등, Footer 포함) / api
├── components/      # card, character, chat, common, effects, home, layout, saju, session, shinjeom, skin, tarot
│   ├── card/        # CardFace, CardBack, CardItem, CardDeck, CardSpread, CardStyleSelector (스타일 선택 UI)
│   ├── common/      # UserInfoForm (mode: "tarot"|"saju"|"shinjeom"), PageSpinner, BirthTimeInput,
│   │                # ResultPageShell, ResultShareButton, ReadingText, Toast, Icon,
│   │                # LocaleConfirmModal, PrivacyConsentModal, SessionClaimer (로그인 시 익명 세션 claim)
│   ├── effects/     # ThemeEffectEngine, ThemeAtmosphereLayer, InteractionEffects, ServiceBackground,
│   │                # ParticleOverlay, MysticBackground, ScrollReveal, CanvasParticleLayer(파티클 렌더),
│   │                # ServiceIllustrations(서비스별 장면 일러스트), mysticUtils.ts·themeAtmosphere.ts(순수 함수·설정)
│   ├── session/     # ResultTextCard, SessionActionButtons, ReadingErrorState, ReadingSectionBlock (타로 카드별 3-섹션 UI 블록)
│   └── tarot/       # CardInterpretationList (카드별 해석 목록), TarotResultPanel (결과 패널),
│                    # ReadingProgressIndicator (리딩 진행 인디케이터)
├── data/            # cards, characters, home, saju, shinjeom/, skins, spreads, topics, mbti, topics-meta
│   └── cardStyles.ts  # CardStyleId, 4가지 아트 스타일, THEME_TO_STYLE_MAP
├── hooks/           # Zustand store와 UI/streaming hooks
│   ├── useCardStyleStore.ts      # 카드 스타일 persist 스토어
│   ├── useReadingReveal.ts       # 타로 카드 텍스트 reveal 타이밍 제어
│   ├── useShinjeomSession.ts     # 신점 세션 상태 스토어
│   ├── useSajuSession.ts         # 사주 세션 상태 스토어
│   ├── useSession.ts             # 타로 세션 상태 스토어
│   ├── useUserInfoForm.ts        # UserInfoForm 상태·핸들러 훅
│   ├── usePreselectCharacter.ts  # URL 파라미터·선호 상담사 자동 선택
│   ├── useResetScrollOnStep.ts   # step 변경 시 스크롤 최상단 초기화
│   ├── useTarotReading.ts        # 타로 SSE 스트리밍·대기 연출
│   ├── useTarotCardSelection.ts  # 타로 카드선택·리딩진행 컨트롤러
│   ├── useSajuReading.ts         # 사주 리딩진행 컨트롤러
│   ├── useShinjeomChat.ts        # 신점 대화·최종리딩 컨트롤러
│   ├── useSettings.ts            # 설정 페이지 상태·핸들러 컨트롤러
│   └── (+ useLocaleStore, useGenderStore, useSkinStore, useFavoriteCharacter, useTheme, useSSEStream, useCardAnimation, useCharacter, useReducedMotionStore 등)
├── i18n/            # locale 감지, Provider, useT, translations
├── lib/             # env, auth, db, storage, validation, request/rate-limit 유틸
│   ├── storage/card-style.ts  # getCardStyleImageUrl·getCardStyleBackUrl·getServiceBackgroundUrl. card-styles 자산은 Cloudflare R2(cdn.xzawed.xyz), storageBase()가 NEXT_PUBLIC_ASSET_BASE_URL↔Supabase 폴백 분기
│   ├── storage/index.ts       # getCardImageUrl·getCardBackUrl·getCardThumbnailUrl (카드 스킨 6종). card-skins 자산은 R2(cdn.xzawed.xyz/card-skins, 2026-07-07 이전), skinBase()가 NEXT_PUBLIC_ASSET_BASE_URL↔postgres 로컬↔Supabase 3-way 분기
│   ├── storage/character-image.ts # getCharacterImageUrl(id,mood) — 캐릭터 이미지 R2(cdn.xzawed.xyz/characters)↔로컬 public 폴백. 배포 이미지는 .dockerignore로 public/images/characters 제외(배포 슬림화)
│   ├── share-utils.ts         # shareWithUrl·shareWithText (3서비스 공통 공유 유틸)
│   └── guest-sessions.ts      # 익명 세션 id localStorage 보관 (로그인 시 claim 대상)
├── services/        # core AI provider/fallback + tarot/saju/shinjeom 서비스
├── styles/          # theme-effects.css(테마 이펙트 CSS 변수), service-illustrations.css(장면별 keyframe),
│                    # home-effects.css(홈 히어로 카드 덱 스타일)
├── test-helpers/    # Vitest 공통 mock/setup
└── types/           # 공유 타입

docs/                # specs(SDD), tests(TDD), wbs, architecture, conventions, design, operations, workflow, archive, superpowers
e2e/                 # Playwright specs
scripts/
├── e2e-full/        # E2E 전수 검증 오케스트레이터
└── generate-assets/ # Replicate API 이미지 생성 (카드·배경·데코 341장)
supabase/migrations/ # Supabase SQL migrations
```

## 핵심 아키텍처

- AI 신뢰성: `src/services/core/`의 `FallbackProvider`가 Grok 우선 호출 후 Claude로 fallback. 리딩 결과 JSON은 `parseJsonSafe`(트레일링 콤마 내성)·`streamReadingWithParseRetry`(parseError 시 1회 재생성)로 형식 위반 내성을 갖는다. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- DB/Auth 추상화: `DB_PROVIDER=supabase|postgres`에 따라 DB, Auth, Storage 구현을 런타임 분기. 상세는 [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md), [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md).
- 익명 세션 claim: 게스트 상태에서 만든 세션은 `user_id=NULL`로 저장돼 로그인 후 mypage 이력에서 누락된다. `rememberGuestSession`(`lib/guest-sessions.ts`)이 localStorage에 보관한 세션 id를, 로그인 감지 시 `SessionClaimer`가 `POST /api/sessions/claim`으로 귀속시킨다. 설계 정본 [`docs/superpowers/specs/2026-06-23-anon-session-claim-design.md`](docs/superpowers/specs/2026-06-23-anon-session-claim-design.md).
- API 보안: Rate Limit -> Zod `safeParse` -> Auth -> 소유권 검증 순서. 새 API는 [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)를 먼저 확인.
- SSE 스트리밍: 타로/사주/신점 리딩은 `SSE_HEADERS`, `fetchSSEStream()`, `AbortController` 패턴을 사용. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- i18n: `middleware`가 locale을 결정하고 `x-locale` 헤더와 쿠키를 유지. 상세는 [`docs/architecture/i18n.md`](docs/architecture/i18n.md), [`docs/conventions/i18n-style.md`](docs/conventions/i18n-style.md).
- 레이아웃 그룹: `RootLayout`(`src/app/layout.tsx`)은 `html`/`body`·Provider·`Header`·전역 오버레이만 담당하고 `main`/`Footer`/`MobileNav`는 라우트 그룹 레이아웃이 소유한다. `(immersive)`(타로·사주·신점 세션/진입, `character/[id]`)는 100dvh 풀스크린 경험이라 **Footer를 렌더하지 않아** 이중 스크롤을 구조적으로 제거한다. `(site)`(홈·결과·마이페이지·약관 등)는 Footer를 유지하되 **`min-h-screen`(100vh) 금지** — sticky-footer(`body` `min-h-dvh flex flex-col`)에 높이를 위임한다. 세부 규칙(외부 lazy 이미지 페이지의 min-height 예외, safe-area, z-index)은 정본 [`docs/conventions/cross-platform.md`](docs/conventions/cross-platform.md)를 따른다.
- 카드 아트 스타일: `CardStyleId`(dark-fantasy·art-nouveau·anime-mystical·modern-digital), `THEME_TO_STYLE_MAP`으로 테마 자동 매핑. `useCardStyleStore`가 사용자 override를 persist. `CardFace`/`CardBack`/`CardItem`은 styleId → skinId → SVG 순으로 이미지 우선순위 처리.
- 테마 이펙트: `ThemeEffectEngine`이 CSS 변수(`--theme-glow-color`, `--theme-particle-color` 등)를 주입. `ThemeAtmosphereLayer`(글로우·파티클 5-레이어), `InteractionEffects`(`InteractionClickParticles` — `document.addEventListener` 방식, pointer-events-none), `ServiceBackground`(AI 배경 이미지 `getServiceBackgroundUrl(service, activeTheme)` + `CanvasParticleLayer` + `ThemeAtmosphere` 내장 — `fixed inset-0 -z-10`, `loading="lazy"` 으로 `window.load` 비블로킹), `src/styles/theme-effects.css` 로 구성.
- 타로 텍스트 reveal: `useReadingReveal` 스토어가 `showLabel` 플래그를 관리. `CardFace` → `CardItem` → `CardSpread` → 타로 세션 페이지로 prop 체인 전달. result phase 진입 시에만 카드명 텍스트 노출.
- 프리미엄 리딩 구조 (PR #414 + #420): 타로 `CardInterpretationItem`에 `symbolism`/`situation`/`action` 3-섹션 추가, `ReadingSectionBlock` 컴포넌트로 렌더링. 타로 max_tokens 공식: `min(15000 + cardCount × 9000 + 15000, 65000)` (cap 65,000). 사주 최대 60,000, 신점 최종 리딩 48,000 고정. 하위 호환: `interpretation` 필드 기존 데이터 fallback 유지. 사주·신점은 `overallReading`이 정본이며 구 4-섹션 스키마(`SajuSections`/`ShinjeomSections`)는 사용하지 않는다(폐지 경위: [`docs/operations/known-issues.md`](docs/operations/known-issues.md)).
- 질문 직답(directAnswer) — answer-first 계약: `ReadingResult.directAnswer`는 사용자의 구체 질문에 "먼저" 답하는 필드다. `buildDirectAnswerContract(domain)`(`prompt-builder.ts`)가 schemaLine·systemSpec·footerReminder를 한 곳에서 방출해 지시-스키마-파서 드리프트를 구조적으로 차단한다(질문 재진술 → 방향 단언 → 확신 수위 표기 → 근거, "균등 나열" 헤지 금지). 3서비스 공통 배선(스키마+parseResult+`ResultTextCard` 렌더), DB 영속(마이그 023 `direct_answer`)은 본 리딩 insert와 분리된 best-effort UPDATE. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- 쉬운 말 계약(가독성): `buildReadabilityContract(domain)`(`prompt-builder.ts`)가 3서비스 공통 `systemSpec`·`fewShot`·`footerReminder`를 한 곳에서 방출한다(directAnswer와 동일 패턴). 원칙은 **"분량 축소가 아니라 같은 분량을 쉬운 말로"** — 문단 수·max_tokens는 불변, 전문용어 즉시 풀어쓰기·화려체/신탁체 완화·소제목 평이화·캐릭터 `speechStyle` 손질로 구체성만 높인다. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).

## 캐릭터/데이터 기준

- 캐릭터 12명: `arcana`, `miko`, `seonhwa`, `hoshi`, `luna`, `rei`, `cairn`, `zero`, `haru`, `ren`, `lix`, `ethan`.
- 캐릭터 표정(`Mood`)은 **6종**: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`.
  `idle`은 표정이 아니라 **`default`가 저장된 파일 이름**이다(`SpriteAnimator`의 `MOOD_TO_FILE`이 매핑). 파일명을 다루는 타입은 `CharacterImageFileStem`.
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
pnpm check:env-docs       # env.ts와 env 문서 정합성 (정본 문서 실종 시 하드 실패)
pnpm check:doc-links      # 문서 링크 + 코드가 하드코딩한 docs 경로 검증 (docs/·CLAUDE.md·.claude/·README·e2e/)
pnpm check:guards         # 가드가 결함에 실제로 반응하는지 검증 (결함 주입 → 실패해야 통과, 13건)
pnpm check:workflow-env-parity # deploy.yml↔weekly-qa.yml의 NEXT_PUBLIC_* 빌드 변수 일치(블록 단위)
pnpm check:workflow-artifacts # Playwright 리포트가 if:failure()로 회귀하는 것 차단
pnpm check:image-budget   # 캐릭터 마스터 치수·용량 + 필수표정 6종·WebP 변형 5단 존재(누락 시 프로덕션 404)
pnpm i18n:check           # 번역 키 drift 검출
pnpm eval:reading         # 리딩 품질 계약 검증(directAnswer·overallReading·parseError, SSE 파싱). EVAL_BASE_URL로 대상 지정, 실 AI 호출(온디맨드)
pnpm smoke:prod           # 배포 후 프로덕션 스모크(health·DB·홈+자산호스트 인라인·R2 이미지·캐릭터 변형). --reading=리딩1건. post-deploy-smoke.yml이 Railway 배포 성공 직후 자동 실행(실패 시 워크플로는 green, Issue로 알림)
pnpm verify:railway-config # standalone 배포 필수조건 검증(startCommand=node server.js·HOSTNAME=0.0.0.0). railway login 필요
pnpm generate:assets      # Replicate API로 카드/배경/데코 이미지 생성 (REPLICATE_API_KEY 필요)
pnpm generate:assets:skip # 이미 존재하는 이미지 건너뛰고 생성
pnpm upload:assets:r2     # 카드/배경을 Cloudflare R2에 업로드 (정본, etag=md5 검증, .env.r2.local 필요)
pnpm upload:assets:r2:skip # R2에 이미 있는 키 건너뛰고 업로드
pnpm upload:skins:r2      # 카드 스킨(6종)을 Cloudflare R2에 업로드 (card-skins/, etag=md5, .env.r2.local 필요)
pnpm upload:skins:r2:skip # R2에 이미 있는 스킨 키 건너뛰고 업로드
pnpm upload:assets        # (구) Supabase Storage 업로드 — card-styles는 R2로 이전됨, 정본 아님
pnpm upload:assets:skip   # (구) 이미 존재하는 이미지 건너뛰고 Supabase 업로드
```

> 카드 아트·서비스 배경·카드 스킨(6종, 2026-07-07 이전)·캐릭터는 모두 Cloudflare R2(`cdn.xzawed.xyz`) 서빙 — **Supabase Storage는 이미지 자산 0**. 카드 아트/배경 추가는 `add-card-asset` 스킬·`card-style-manager` 에이전트, 스킨은 `skin-manager` 에이전트. 정본 [`docs/conventions/image-assets.md`](docs/conventions/image-assets.md).

명령어 정책은 [`docs/workflow/scripts.md`](docs/workflow/scripts.md), 테스트 정책은 [`docs/tests/unit-testing.md`](docs/tests/unit-testing.md), [`docs/tests/e2e-testing.md`](docs/tests/e2e-testing.md)를 따른다.

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
- SSR/Hydration: **렌더 트리 모양을 클라이언트 전용 값으로 가르지 않는다.** 미디어 쿼리·`persist` 스토어·`window`·`Date`·`Math.random`으로 `return null`이나 요소 종류를 바꾸면 hydration이 깨져 그 사이 클릭이 유실된다(실측: React #418). 렌더 유무를 가르는 자리는 `useReducedMotionSafe`/`useHydrated`(`useSyncExternalStore`)를 쓰고, `useEffect`+`setState` 방식은 lint가 막는다. 값만 바꾸는(예: `animate` prop) 용도는 제약 없음. 정본: [`docs/specs/platform/rendering-contract.md`](docs/specs/platform/rendering-contract.md)
- API 입력: 타입 단언보다 Zod schema와 `safeParse`를 사용한다.
- i18n: UI 텍스트는 번역 키를 우선 추가하고 `t()`/`useT()`로 노출한다.
- 테스트 파일: API 라우트 테스트는 `src/__tests__/api/`에 둔다.
- 패키지 추가: `pnpm-lock.yaml` 변동과 peer dependency 변화를 확인한다.
- SonarCloud 동기화: 새 TS 파일 추가 시 `sonar.coverage.exclusions`와 `sonar.cpd.exclusions`를 `sonar-project.properties`에 함께 추가한다.

## 업무별 진입점

| 업무 | 먼저 볼 문서 |
|---|---|
| **SSR/hydration 규칙(계약)** | [`docs/specs/platform/rendering-contract.md`](docs/specs/platform/rendering-contract.md) |
| **테스트 계층·게이트 전략** | [`docs/tests/strategy.md`](docs/tests/strategy.md) |
| **잔여 작업·차단 요인** | [`docs/wbs/README.md`](docs/wbs/README.md) |
| 시스템 구조 | [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md) |
| AI/프롬프트 | [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md) |
| DB/Auth | [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md), [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md) |
| 캐릭터/카드/스킨 | [`docs/architecture/data-model.md`](docs/architecture/data-model.md) |
| 새 기능/페이지/API | [`docs/workflow/task-playbooks.md`](docs/workflow/task-playbooks.md) |
| 배포/운영 | [`docs/operations/deployment.md`](docs/operations/deployment.md), [`docs/operations/operation-guide.md`](docs/operations/operation-guide.md) |
| **서비스 종료·폐쇄** | [`docs/operations/service-shutdown.md`](docs/operations/service-shutdown.md) |
| 미구현/기술부채 | [`docs/operations/known-issues.md`](docs/operations/known-issues.md) |

## Claude 자율 관리 규칙

- `.claude/agents/`에는 반복 작업용 에이전트 정의가 있다.
- 훅, deny 규칙, 배포 관련 파괴적 변경은 사용자 확인 후 진행한다.
- 문서 변경 보고 형식:

```text
문서 변경: [파일명] - 변경 이유: [이유] - 변경 내용: [1줄 요약]
```
