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
├── app/             # App Router. 라우트 그룹 분리: (immersive)=몰입형(타로·사주·신점 세션/진입·character/[id], Footer 미렌더) / (site)=일반(홈·결과·마이페이지·약관 등, Footer 포함) / api
├── components/      # card, character, chat, common, effects, home, layout, saju, session, shinjeom, skin, tarot
│   ├── card/        # CardFace, CardBack, CardItem, CardDeck, CardSpread, CardStyleSelector (스타일 선택 UI)
│   ├── common/      # UserInfoForm (mode: "tarot"|"saju"|"shinjeom"), PageSpinner, BirthTimeInput,
│   │                # ResultPageShell, ResultShareButton, ReadingText, Toast, Icon,
│   │                # LocaleConfirmModal, PrivacyConsentModal, SessionClaimer (로그인 시 익명 세션 claim)
│   ├── effects/     # ThemeEffectEngine, ThemeAtmosphereLayer, InteractionEffects,
│   │                # ServiceBackground, ParticleOverlay, MysticBackground, ScrollReveal,
│   │                # CanvasParticleLayer (particle-engine.ts 기반, density: low/medium/high, prefers-reduced-motion 지원),
│   │                # ServiceIllustrations (TarotScene·SajuScene·ShinjeomScene + useMouseParallax FAR/MID/NEAR 3레이어)
│   │                # mysticUtils.ts — particleStyle·particleMotion 순수 함수
│   │                # themeAtmosphere.ts — ThemeAtmosphereLayer 전용 파티클 종류·설정
│   ├── session/     # ResultTextCard, SessionActionButtons, ReadingErrorState, ReadingSectionBlock (3서비스 공통)
│   └── tarot/       # CardInterpretationList (카드별 해석 목록), TarotResultPanel (결과 패널),
│                    # CardFlipEffect, ReadingProgressIndicator, CardSpreadEffects
├── data/            # cards, characters, home, saju, shinjeom/, skins, spreads, topics, mbti, topics-meta, error-messages
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
│   ├── useTarotReading.ts        # 타로 SSE 스트리밍·대기 연출·elapsed 카운터
│   ├── useTarotCardSelection.ts  # 타로 세션 카드선택·리딩진행 컨트롤러 훅 (레이스 가드 포함, page=view 분리)
│   ├── useSajuReading.ts         # 사주 세션 리딩진행 컨트롤러 훅 (SSE·대기연출·타임아웃, page=view 분리)
│   ├── useShinjeomChat.ts        # 신점 세션 대화·최종리딩 컨트롤러 훅 (page=view 분리)
│   ├── useSettings.ts            # 설정 페이지 상태·핸들러·storage 컨트롤러 훅 (page=view 분리)
│   └── (+ useLocaleStore, useGenderStore, useSkinStore, useFavoriteCharacter, useTheme, useSSEStream, useCardAnimation, useCharacter, useReducedMotionStore 등)
├── i18n/            # locale 감지, Provider, useT, translations
├── lib/             # env, auth, db, storage, validation, request/rate-limit 유틸
│   ├── storage/card-style.ts  # getCardStyleImageUrl·getCardStyleBackUrl·getServiceBackgroundUrl. card-styles 자산은 Cloudflare R2(cdn.xzawed.xyz), storageBase()가 NEXT_PUBLIC_ASSET_BASE_URL↔Supabase 폴백 분기
│   ├── share-utils.ts         # shareWithUrl·shareWithText (3서비스 공통 공유 유틸)
│   └── guest-sessions.ts      # 익명 세션 id localStorage 보관 (로그인 시 claim 대상)
├── services/        # core AI provider/fallback + tarot/saju/shinjeom 서비스
├── styles/          # theme-effects.css — CSS variable 기반 5-레이어 이펙트 정의
│                    # service-illustrations.css — 장면별 CSS 클래스 + 11개 keyframe (orbit-spin, spark-twinkle, ember-drift, mist-rise, crystal-pulse 등)
│                    # home-effects.css — 홈 히어로 카드 덱 스타일 (hero-tarot-card, hero-card-idle keyframe, CSS vars 기반)
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
- 익명 세션 claim (PR: 리딩 이력 미노출 수정): 게스트/만료 세션 상태에서 만든 세션은 `user_id=NULL`로 저장되어 로그인 mypage 이력(`findMany("sessions",{user_id})`)에서 누락된다. `rememberGuestSession`(`lib/guest-sessions.ts`)이 생성 시 sessionId를 localStorage에 보관 → `SessionClaimer`가 로그인 감지 시 `POST /api/sessions/claim` → `db.claimSessions`가 `UPDATE sessions SET user_id WHERE id IN(...) AND user_id IS NULL`로 귀속. 설계 정본 [`docs/superpowers/specs/2026-06-23-anon-session-claim-design.md`](docs/superpowers/specs/2026-06-23-anon-session-claim-design.md).
- API 보안: Rate Limit -> Zod `safeParse` -> Auth -> 소유권 검증 순서. 새 API는 [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)를 먼저 확인.
- SSE 스트리밍: 타로/사주/신점 리딩은 `SSE_HEADERS`, `fetchSSEStream()`, `AbortController` 패턴을 사용. 상세는 [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md).
- i18n: `middleware`가 locale을 결정하고 `x-locale` 헤더와 쿠키를 유지. 상세는 [`docs/architecture/i18n.md`](docs/architecture/i18n.md), [`docs/conventions/i18n-style.md`](docs/conventions/i18n-style.md).
- 레이아웃 그룹: RootLayout(`src/app/layout.tsx`)은 `html`/`body`(`min-h-dvh flex flex-col` sticky-footer 컨테이너)·Provider·`Header`·전역 오버레이만 담당하고 `main`/`Footer`/`MobileNav`는 라우트 그룹 레이아웃이 소유한다. `(immersive)`(타로·사주·신점 세션/진입, `character/[id]`)는 100dvh 풀스크린 경험이라 **Footer를 렌더하지 않아** 스테이지 아래로 document가 추가 스크롤되는 '이중 스크롤'을 구조적으로 제거. `(site)`(홈·결과·마이페이지·약관 등)는 Footer를 유지. **뷰포트 높이 규칙(PR #428)**: `(site)`에서 `min-h-screen`(=100vh) 금지 — 페이지 래퍼의 100vh가 `main` 패딩(112px)과 합산돼 '유령 스크롤'(빈 영역)+Footer 가림을 유발. (site) 콘텐츠 래퍼는 min 높이 없이 sticky-footer에 위임, 중앙정렬 래퍼(로그인)는 `min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)]`, `Footer`는 모바일 네비 회피 `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`. **(immersive) 진입 래퍼(PR #431)**: outer는 min-height 없이 `relative overflow-hidden` — 스테이지(`h-[calc(100dvh-7rem)]`)가 높이 지배(이중 스크롤 0). ⚠️ 외부 lazy 이미지(`ServiceBackground`) 페이지에는 dvh 기반 min-height 금지(E2E `load` 지연, PR #428) — min-height 제거 또는 스테이지 height 사용. 정본: [`docs/conventions/cross-platform.md`](docs/conventions/cross-platform.md). 타로 `ReadingProgressIndicator`는 모바일 대사창(z-30) 위에 보이도록 `z-40`.
- 카드 아트 스타일: `CardStyleId`(dark-fantasy·art-nouveau·anime-mystical·modern-digital), `THEME_TO_STYLE_MAP`으로 테마 자동 매핑. `useCardStyleStore`가 사용자 override를 persist. `CardFace`/`CardBack`/`CardItem`은 styleId → skinId → SVG 순으로 이미지 우선순위 처리.
- 테마 이펙트: `ThemeEffectEngine`이 CSS 변수(`--theme-glow-color`, `--theme-particle-color` 등)를 주입. `ThemeAtmosphereLayer`(글로우·파티클 5-레이어), `InteractionEffects`(`InteractionClickParticles` — `document.addEventListener` 방식, pointer-events-none), `ServiceBackground`(AI 배경 이미지 `getServiceBackgroundUrl(service, activeTheme)` + `CanvasParticleLayer` + `ThemeAtmosphere` 내장 — `fixed inset-0 -z-10`, `loading="lazy"` 으로 `window.load` 비블로킹), `src/styles/theme-effects.css` 로 구성.
- 타로 텍스트 reveal: `useReadingReveal` 스토어가 `showLabel` 플래그를 관리. `CardFace` → `CardItem` → `CardSpread` → 타로 세션 페이지로 prop 체인 전달. result phase 진입 시에만 카드명 텍스트 노출.
- 프리미엄 리딩 구조 (PR #414 + #420): 타로 `CardInterpretationItem`에 `symbolism`/`situation`/`action` 3-섹션 추가. 사주 `SajuSections`(structure/elements/fortune/guidance), 신점 `ShinjeomSections`(spiritual/current/obstacles/future)가 `ReadingResult`에 optional로 포함. `ReadingSectionBlock` 컴포넌트가 3서비스 공통 섹션 UI 렌더링. 타로 max_tokens 공식: `min(15000 + cardCount × 9000 + 15000, 65000)` (cap 65,000). 사주·신점 최대 60,000. 하위 호환: `interpretation` 필드 기존 데이터 fallback 유지.
- 질문 직답(directAnswer) — answer-first 계약: `ReadingResult.directAnswer`는 사용자의 구체 질문에 "먼저" 답하는 필드다. `buildDirectAnswerContract(domain)`(`prompt-builder.ts`)가 **schemaLine(JSON 스켈레톤)·systemSpec(작성 지침)·footerReminder를 한 곳에서 방출**해 지시-스키마-파서 드리프트를 구조적으로 차단(이전 결함: 사주 route가 directAnswer 지시를 붙였으나 사주 스키마·파서·UI엔 필드가 없어 답이 소실). 지침: ① 질문 재진술 → ② 가장 유력한 한 방향 단언 → ③ 확신 수위 문체 표기("분명히" / "~쪽으로 기울어 있습니다" / "단서는 있으나 확정하기엔 이릅니다") → ④ 근거(도메인별: 카드/세운·월운/상)+전제조건. "모든 상황 균등 나열" 헤지는 안티패턴으로 **금지**. 사적 사실은 완충하되 방향은 커밋(2축 분리), 민감 도메인(건강·재정·법률)은 확답 대신 경향+전문가 상담 권유로 강등. **3서비스 공통 배선**(타로·사주·신점 모두 스키마+parseResult+결과화면 최상단 `ResultTextCard` 렌더). 앵커: 타로·사주는 자유질문 입력창(200자, `buildFreeQuestionPrompt`), 신점은 chat 첫 사용자 메시지를 핵심질문으로 재노출. 사주 시간 지평 연계: `detectSajuTimeHorizon`+`applyHorizonToCalcOptions`가 질문의 시간창(이번 주/달/올해/내년)을 감지해 드롭다운과 무관하게 해당 월운/세운 데이터를 결정론적으로 주입. 타로는 결과 최상단에 `directAnswer` 렌더(answer-first). DB 영속(마이그 023 `direct_answer` 컬럼): `persistDirectAnswer`가 본 리딩 insert와 **분리된 best-effort UPDATE**로 기록 → 재방문(`result/[id]`)·공유 결과에도 노출. 컬럼 미적용 환경에서도 UPDATE만 조용히 실패해 본 저장 무영향. ⚠️ 마이그 023은 운영 DB 적용 필요.

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
pnpm upload:assets:r2     # 카드/배경을 Cloudflare R2에 업로드 (정본, etag=md5 검증, .env.r2.local 필요)
pnpm upload:assets:r2:skip # R2에 이미 있는 키 건너뛰고 업로드
pnpm upload:assets        # (구) Supabase Storage 업로드 — card-styles는 R2로 이전됨, 정본 아님
pnpm upload:assets:skip   # (구) 이미 존재하는 이미지 건너뛰고 Supabase 업로드
```

> 카드 아트·서비스 배경은 Cloudflare R2(`cdn.xzawed.xyz`) 서빙. 추가/수정 절차는 `add-card-asset` 스킬·`card-style-manager` 에이전트. 정본 [`docs/conventions/image-assets.md`](docs/conventions/image-assets.md).

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
