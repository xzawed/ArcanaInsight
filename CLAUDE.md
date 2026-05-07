# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로·사주 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 세션 시작 순서

1. **이 CLAUDE.md 전체** — 프로젝트 구조·규칙·아키텍처 파악
2. **`git log --oneline -10`** — 최근 변경사항
3. **메모리 확인** — `~/.claude/projects/.../MEMORY.md`
4. **MCP 연동** — SonarCloud Quality Gate + Railway 배포 상태 확인 (작업 전 필수)
   - SonarCloud: REST API 직접 호출 (MCP 툴 세션 미로드 시 대체)
     ```
     curl -s -u "SONARQUBE_TOKEN:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight"
     curl -s -u "SONARQUBE_TOKEN:" "https://sonarcloud.io/api/issues/search?componentKeys=xzawed_ArcanaInsight&types=BUG,VULNERABILITY,CODE_SMELL&statuses=OPEN&severities=BLOCKER,CRITICAL&ps=20"
     ```
   - Railway: MCP 툴 사용 전 반드시 CLI 링크 선행 필요
     ```
     railway link --project 24bdc6b7-db99-4487-896e-d4bd68dbb6b3 --environment production --service ArcanaInsight
     railway deployment list --json   # MCP 툴 미동작 시 대체
     ```
5. **요청 관련 파일만 Read** — 전체 코드베이스 탐색 금지
6. **불확실하면 질문 전에 코드 확인** — 추측 금지

## 기술 스택

| | |
|---|---|
| **언어·프레임워크** | TypeScript strict, Next.js 16.2.3 (App Router), React 19.2.4 |
| **스타일링·애니메이션** | Tailwind CSS v4 (`@theme`), Framer Motion v12.38 |
| **AI** | Grok API (xAI) 우선 + Claude API 자동 fallback |
| **인증·DB** | Supabase Auth / NextAuth.js v5 (DB_PROVIDER별 전환) |
| **DB ORM** | Supabase PostgreSQL / Drizzle ORM (DB_PROVIDER별 전환) |
| **상태·패키지** | Zustand v5.0, pnpm 10.33.0 |
| **다국어·i18n** | 자체 translations 모듈 + middleware locale 쿠키 (ko/en/ja) — → [`docs/architecture/i18n.md`](docs/architecture/i18n.md) |
| **테스트** | Vitest 2.0 (764개, statements 98%), Playwright (3 디바이스) |
| **CI/CD·호스팅** | GitHub Actions → Railway |

## 프로젝트 구조

```
src/
├── app/             # Pages & API (tarot·saju·shinjeom·mypage·auth·character·settings·api/locale)
├── components/      # card/, character/, chat/, common/, effects/, home/, layout/, saju/, skin/, tarot/
│   ├── common/      # Toast (locale 변경 알림), LocaleConfirmModal (첫방문 자동 감지)
│   ├── effects/     # MysticBackground (별자리·안개·룬 오버레이 z-[5]), ServiceBackground (배경 파티클 -z-10), ParticleOverlay, ScrollReveal
│   ├── layout/      # Header·Footer·MobileNav·LanguageSwitcher (데스크탑·모바일 분리 testid)
│   ├── character/   # CharacterDisplay (GlowBurstRing 내장), SpriteAnimator (drop-shadow 키프레임), CharacterAuraLayer (오라 링)
│   ├── tarot/       # ShuffleCeremony (카드 선택 진입 시 2.2s Canvas rAF 의식 애니메이션)
│   └── shinjeom/    # CulturalReadingDisplay (EN/JA locale에서 신점 주제 한국어 원문+로마자 병기)
├── i18n/            # config·detect·LocaleProvider·useT·server-locale + translations/{ko,en,ja,shared}
├── data/            # cards/, characters/, skins/, spreads/, saju/, shinjeom/, home/, topics.ts, birth-hours.ts, error-messages.ts, ui-copy.ts
├── hooks/           # Zustand stores: useSession, useSajuSession, useShinjeomSession, useSkinStore, useGenderStore, useFavoriteCharacter, useReducedMotionStore, useLocaleStore + useSSEStream, useTheme, useCharacter, useCardAnimation
├── lib/
│   ├── env.ts       # 환경변수 getter 16개 (하드코딩 금지)
│   ├── request-utils.ts  # getClientIp / pickFields / jsonError / SSE_HEADERS
│   ├── rate-limit.ts
│   ├── db/          # getDb() — SupabaseAdapter / PostgresAdapter (DB_PROVIDER 분기), reading-saver.ts (locale 동봉)
│   ├── auth/        # getCurrentUser() / requireUser() / assertSessionOwnership()
│   ├── validation/  # api-schemas.ts (Zod 7종 + LocaleSchema)
│   └── storage/     # getCardImageUrl() — provider별 이미지 URL
├── services/        # core/ (FallbackProvider·PromptBuilder·CircuitBreaker·http-utils), tarot/, saju/, shinjeom/
├── types/           # card.ts, character.ts, session.ts, service.ts, user-info.ts
├── test-helpers/    # mock-db, mock-auth, mock-request, mock-ai, reset-modules, api-route-setup
└── __tests__/api/   # API 라우트 단위 테스트 (vitest.config.ts exclude 우회) + locale-wiring

docs/                # → docs/README.md 인덱스
├── architecture/    # system-overview, ai-infrastructure, db-abstraction, auth-abstraction, data-model
├── conventions/     # coding-style, layout-rules, cross-platform, zod-schemas, image-assets
├── workflow/        # e2e-testing, unit-testing, task-playbooks, code-change-process, ci-cd
├── operations/      # known-issues, env-variables, deployment, monitoring, operation-guide
└── archive/         # process-diagrams, skills-original, ai-quality-roadmap

supabase/migrations/ # 001 + 003~016 SQL (002 결번, 15개 파일, PostgreSQL 모드: src/lib/db/schema/index.ts)
e2e/                 # 22개 spec (smart-ci.spec.ts 포함), 3 디바이스 — → docs/workflow/e2e-testing.md
scripts/
├── e2e-full/        # 멀티 에이전트 E2E 전수 검증 (252 조합)
│   ├── orchestrator.ts, worker.ts, reporter.ts
│   ├── matrix/      # characters.ts, tarot.ts, saju.ts, shinjeom.ts, ci-subset.ts
│   ├── flows/       # tarot-flow.ts, saju-flow.ts, shinjeom-flow.ts
│   └── validators/  # structure-validator.ts, content-validator.ts (Haiku API)
└── sync-test-count.ts, check-env-docs.ts, check-doc-links.ts, pre-push-checks.sh
```

## 캐릭터 시스템

12명, 각자 다른 말투로 타로·사주·신점 전체 제공. 상세: [`docs/architecture/data-model.md`](docs/architecture/data-model.md)

| ID | 이름 | 성별 | 말투 | 특기 |
|---|---|---|---|---|
| `arcana` | 아르카나 | 여 | ~네요/~해요, 신비 | 직관·감성 |
| `miko` | 미코 | 여 | ~입니다, 엄숙 | 영적 해석 |
| `seonhwa` | 선화 | 여 | ~세요/~랍니다, 우아 | 동양적 해석 |
| `hoshi` | 호시 | 여 | ~야/~지, 반말+이모지 | 캐주얼 |
| `luna` | 루나 | 여 | ~요/~네요, 다정·신비 | 힐링 |
| `rei` | 레이 | 여 | ~야/~지, 건조·핵심 | 냉철 분석 |
| `cairn` | 카이른 | 남 | ~습니다, 격식 | 젠틀 |
| `zero` | 제로 | 남 | ~다/~지, 시적 저음 | 로맨틱 |
| `haru` | 하루 | 남 | ~요/~세요, 친근 | 응원·힐링 |
| `ren` | 렌 | 남 | ~오/~하오, 고풍 | 선인 |
| `lix` | 릭스 | 남 | ~는데/~ㄹ까, 장난 | 트릭스터 |
| `ethan` | 에단 | 남 | ~거든요, 친절·상세 | 학구적 |

> **다국어 페르소나**: 영어·일본어 페르소나는 PR-4에서 외부 번역가 의뢰로 추가 예정 (캐릭터별 화법 시그니처 보존: arcana=elegant mystic, hoshi=casual GenZ, ren=archaic 등).

**표정 규칙 (6-mood)**: `default` → 세션 진입/대기 | `mystical` → 카드 선택/리딩 대기 | `smile` → 결과 도착 | `serious` / `surprised` / `wink` → 대기 대사 mood 연동. 에러 시 `default` 복귀. 대기 대사 중 표정은 `line.mood` 따름.

**이미지 경로**: 12캐릭터 모두 `nukki/[mood].png` (1408×768)

## 핵심 아키텍처

**AI 신뢰성**: `services/core/` = Grok 우선 + Claude 자동 fallback. → [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md)

**DB_PROVIDER**: `supabase`(기본) ↔ `postgres` 즉시 전환. `getDb()` / `getCurrentUser()` / `getCardImageUrl()` 자동 분기. → [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md)

**API 보안**: Rate Limit → Zod safeParse → requireUser → assertSessionOwnership. → [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md)

**SSE 스트리밍**: tarot/saju/shinjeom reading API. 서버 공통 헤더 `SSE_HEADERS` + `jsonError()` (`src/lib/request-utils.ts`), Provider 공통 SSE 리더 `readSseLines` + `withAbortTimeout` (`src/services/core/http-utils.ts`). 클라이언트 `fetchSSEStream()` (`src/hooks/useSSEStream.ts`). `/api/daily-card`는 JSON (비스트리밍).

**share_token**: `/*/result/[id]` 공개 공유. 소유자 전용 = `assertReadingAccess("owner")`.

**비주얼 FX 시스템**: 캐릭터 오라·글로우·배경 효과 레이어. `CharacterAuraLayer` (Framer Motion 오라 링 — OS `prefers-reduced-motion` OR `useReducedMotionStore` 사용자 설정 적용, 파티클 `willChange: "transform, opacity"`), `GlowBurstRing` (표정 전환 시 버스트, `CharacterDisplay` 내부 inline 컴포넌트), `ServiceBackground` (서비스별 전체화면 배경 -z-10 — tarot: 별 파티클 40개 황금각 분포 `willChange: "opacity"`, saju: 그라디언트 2레이어, shinjeom: 오방색 5레이어). `SpriteAnimator`는 mood별 `filter: drop-shadow` 키프레임 내장. OG 이미지 공통 팩토리: `src/app/_og/ResultOgBase.tsx` → `makeResultOgResponse(config)` (SonarCloud 중복 방지용).

**ShuffleCeremony**: 타로 카드 선택 진입 시 2.2초 Canvas rAF 의식 애니메이션. `phase === "card-shuffle"` 조건부 렌더 → `onComplete` 시 `setPhase("card-select")`. 4단계: ① 덱 컷(0–500ms) ② 글로우 폭발(500–700ms) ③ 타이프라이터(700–1400ms, 58ms/자) ④ 부채꼴 펼침(1400–2200ms, spring). 클릭·키보드(Enter/Space) 스킵, `prefers-reduced-motion` 즉시 스킵. `shuffleCeremonyText` 12캐릭터 텍스트 → `getWaitingLinesData(locale)` (`waiting-lines-i18n.ts`) — ko/en/ja 분기. N=9 고정(시각 효과, 실제 스프레드 크기 무관).

**리딩 max_tokens 정책 (3개 서비스 통일)**: 한국어 토큰 효율 영어 대비 1.3배 낮음 + JSON 오버헤드 + Grok 내부 reasoning(thinking) 토큰 흡수까지 고려한 안전 마진 — 4000 토큰 고정·11000 토큰 고정도 truncated 발견되어 +30~40% 추가 상향. 출력 토큰만 과금되므로 상한 자체는 비용 영향 없음. **xAI Grok-3 reasoning 모델은 max_tokens 안에 reasoning 토큰을 함께 소비하므로**, 추가로 ① **API 요청 본문에 `reasoning_effort: "low"` 옵션 주입** (`buildReasoningOption(model)` — `src/services/core/grok-provider.ts`, grok-3 계열만 적용·non-reasoning 모델은 제외해 400 회피), ② **`AI_TIMEOUT_MS` 기본값 60000→120000** (reasoning 모델 응답 시간 대응), ③ **`streamReading`에 빈 응답 throw 가드** (yield 0회면 throw → FallbackProvider Claude 자동 전환), ④ 시스템 프롬프트에 "내부 reasoning·생각 단계를 출력하지 마세요" 명시로 thinking 토큰 소비 다중 차단. 환경변수 `GROK_REASONING_EFFORT`(기본 `low`)·`GROK_MODEL`(기본 `grok-3`, 비추: `grok-4-fast-non-reasoning`로 변경 시 reasoning 완전 비활성)로 제어.
- **타로**: `computeReadingMaxTokens(cardCount)` (`src/app/api/tarot/reading/route.ts`) — 1장→2600, 3장→4500, 5장→6500, 7장→8500, 9장→10500, 10장→14000(celtic-cross), 12장+→16000(zodiac 등).
- **사주**: `computeSajuReadingMaxTokens(timeRange, includeMonthly)` (`src/app/api/saju/reading/route.ts`) — includeMonthly→20000, full-fortune→17000, five-year→15000, three/next-year→13000, 기본 10000.
- **신점**: `SHINJEOM_TOKENS_FINAL=8500` / `SHINJEOM_TOKENS_CHAT=1500` (`src/app/api/shinjeom/message/route.ts`).

**parseError 시그널 통일 (3개 서비스)**: `ReadingResult.parseError` union = `"truncated" | "invalid_json" | "fallback_text" | "missing_fields"` (`src/types/service.ts`). saju/shinjeom service `parseResult`도 핵심 필드(`overallReading`/`advice`) 빈 문자 시 `missing_fields` 부여, JSON 파싱 실패 + raw 텍스트 추출 성공 시 `fallback_text` 부여. 라우트는 `parseError` 있는 결과를 SSE done에 그대로 송신하지만 **DB INSERT는 차단** (result/[id] 빈 화면 방지). 클라이언트 session/page.tsx는 parseError 감지 시 캐릭터 에러 메시지 + 재시도 안내 (타로 `truncated`만 부분 결과 표시 유지).

**reading-saver locale 가드 (Fix D)**: `src/lib/db/reading-saver.ts` `safeLocale(locale)` — `isLocale(locale) ? locale : DEFAULT_LOCALE` (`src/i18n/config.ts` 재사용). 016 마이그레이션 CHECK 제약(`locale IN ('ko','en','ja')`) 위반 차단 — 빈 문자열·잘못된 locale 입력 시 'ko' 자동 치환 → INSERT 실패로 결과 미저장 방지.

**SpreadPosition rotation**: `src/types/session.ts` `SpreadPosition` 인터페이스에 `rotation?: number` 필드. celtic-cross position 1(도전/방해 요소)에 `rotation: 90` 설정 — 전통 레이아웃 준수. `CardSpread.tsx`에서 카드 컨테이너(`<div className="relative">`)에 `transform: rotate(Ndeg)` 적용 (라벨 회전 제외).

**캐릭터 경험 시스템**: `CharacterId` 타입 (`src/types/character.ts` — `CHARACTER_IDS as const` 기반 union). `CHAR_ENTRANCE: Record<CharacterId, EntranceConfig>` (SpriteAnimator 모듈 내 상수). 에러 대사: `characterErrorLines` / `defaultErrorLines` → `getWaitingLinesData(locale)` 경유 ko/en/ja 분기. 결과 mood: `CHARACTER_RESULT_MOODS` (`waiting-lines.ts`). 6-mood 전체 활성화: 카드 선택→`surprised`, 대기줄→`line.mood`, 결과→캐릭터별. 자유 질문: `freeQuestion` (Zustand `useSession`) → Zod 검증 → `buildFreeQuestionPrompt()`. 캐릭터 메모리: `getRecentCharacterMemory()` (`src/lib/db/character-context.ts`) → `buildCharacterMemoryPrompt()` → system prompt 주입 (인증 사용자 전용, 실패 시 빈 문자열 반환).

**i18n 페이지 마이그레이션 (PR #253)**: tarot/saju/mypage 페이지 i18n 적용. 데이터 파일에 multi-locale 필드 인라인(캐릭터 locale-helpers 패턴 재사용) — `src/data/spreads/index.ts` (`nameJa`, `shortDescKo/En/Ja`, `detailKo/En/Ja`, `iconId`, `positions[].labelJa`) + `getSpreadName/ShortDesc/Detail/PositionLabel` 헬퍼, `src/data/saju/categories.ts` (`labelEn/Ja`, `descEn/Ja`) + `getSajuTimeLabel/Desc/AreaLabel/Desc` 헬퍼, `src/data/topics-meta.ts` 신규(타로 6 + 사주 8 + 신점 6 = 20 토픽 메타) + `getTopicLabel/Desc/IconId(topic, locale)` 헬퍼. 페이지 카피만 사전 namespace 추가 — `tarot.page.*` (15키), `saju.page.*` (12키), `mypage.*` (22키). 사전 ko/en/ja 190/190/190 (drift 0). `data/ui-copy.ts` 폐기. 데이터 인라인 + 사전 분리로 CPD/namespace 폭발 방지.

**i18n 다국어 시스템**: 한국어(ko)·영어(en)·일본어(ja) 3개 locale. middleware가 쿠키→Accept-Language→DEFAULT 우선순위로 locale 결정 후 `x-locale` 헤더 부착. SSR layout이 `cookies()`로 `<html lang>` 동적 결정 + `LocaleProvider`가 client store(`useLocaleStore`) 동기화 (CLAUDE.md SSR 규칙: useEffect 내 setState `setTimeout` 래핑 필수). 클라이언트 호출 = `useT()` 훅, 서버 호출 = `t(key, locale)` 직접. 사전 모듈 `src/i18n/translations/{ko,en,ja}/index.ts` + 공통 베이스 `shared/keys.ts` (SonarCloud 중복 방지). DB 5개 테이블(profiles·sessions·readings·saju_readings·shinjeom_readings)에 `locale TEXT DEFAULT 'ko' CHECK` 컬럼 (016 마이그레이션) — `idx_sessions_user_locale` 인덱스 (PR-4 character-context 필터). `daily_cards`는 character_id+date 단일 사전(locale 분리 없음). 신규 세션·리딩 INSERT 시 `getRequestLocale()` (`src/i18n/server-locale.ts`)로 locale 동봉. 영어·일본어 사전 UI namespace 완성 (PR-C). 캐릭터 대사(waiting-lines) en/ja 전용 파일 — `src/data/characters/waiting-lines-{en,ja}.ts`. `getWaitingLinesData(locale)` (`waiting-lines-i18n.ts`) — 세션 컴포넌트·ShuffleCeremony locale 분기 진입점. AI 응답 locale: `buildCharacterHeader(locale)` `LANGUAGE_INSTRUCTIONS` map → ko=빈 문자(시스템 프롬프트가 이미 한국어이므로 노이즈 제거), en/ja는 응답 언어 강제 + **JSON 키 영어 고정 명시** ("Use the EXACT English JSON keys ..."). en/ja에서 모델이 키를 번역해 `parseJsonSafe` 실패하던 회귀 차단. **캐릭터 locale 헬퍼**: `src/data/characters/locale-helpers.ts` — `getCharacterGreeting/Description/Speciality(char, locale)` 순수 함수. `CharacterConfig`에 `greetingEn/Ja`, `descriptionEn/Ja`, `specialityEn/Ja` 옵션 필드 (PR #232). `getRecentCharacterMemory` locale 파라미터 — 로케일별 메모리 필터링. **번역 키 drift 검사**: `pnpm i18n:check` (`scripts/check-translation-keys.ts`) — en/ja orphan 키 발견 시 exit 1, CI docs-sync 단계에 포함. **hreflang**: `layout.tsx` `generateMetadata()` → `alternates.languages` ko/en/ja/x-default + `openGraph.locale`. **신점 하이브리드**: `src/data/shinjeom/cultural-readings.ts` — 6개 주제 한국어 원문·로마자 데이터. `src/components/shinjeom/CulturalReadingDisplay.tsx` — EN/JA locale에서 신점 주제 카드 하단에 `koTerm · romaja` 병기 (ko에서는 렌더링 안 함). `shinjeom/page.tsx` 전면 `useT()` 마이그레이션 (SHINJEOM_COPY 제거). `shinjeom` namespace에 page/topic 키 140개 총합. → [`docs/architecture/i18n.md`](docs/architecture/i18n.md)

## 명령어

```bash
pnpm dev           # 개발 서버
pnpm build         # 프로덕션 빌드
pnpm lint          # ESLint
pnpm type-check    # tsc --noEmit
pnpm test:coverage # Vitest + 커버리지 (statements 98%)
pnpm test:e2e      # Playwright (3 디바이스, smart-ci 제외)
pnpm test:e2e:full          # 전수 E2E: 252 조합, 6 워커 (실서버 + 실 API 키 필요)
pnpm test:e2e:full:ci       # CI 모드 오케스트레이터 (12 대표 케이스)
pnpm sync:test-count        # CLAUDE.md 테스트 수 동기화
pnpm check:env-docs         # env.ts ↔ env-variables.md 정합성
pnpm check:doc-links        # docs 링크 검증
pnpm i18n:check             # ko/en/ja 번역 키 drift 검출 (orphan 발견 시 exit 1)
```

> **scripts 운영 정책**: 자동 호출 / npm 등록 / 수동 자산 생성 분류 → [`docs/workflow/scripts.md`](docs/workflow/scripts.md)

> **Windows E2E**: Docker 필수. → [`docs/workflow/e2e-testing.md`](docs/workflow/e2e-testing.md)
>
> **E2E 전수 검증** (`pnpm test:e2e:full`): 타로 84 + 사주 96 + 신점 72 = 252 조합. 6 워커 병렬. 실 Supabase 세션 + Grok API 키 필요. CI에서는 `pnpm test:e2e:full:ci` (오케스트레이터 경유) 또는 수동 실행.
>
> **`smart-ci.spec.ts`**: `pnpm test:e2e` CI에서 자동 제외 (`testIgnore: process.env.CI`). 실 Supabase 인증 세션 없으면 플로우 실패.

## 환경변수

→ 전체 목록·전환 방법: [`docs/operations/env-variables.md`](docs/operations/env-variables.md)

**Supabase 모드 필수**: `GROK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`

**PostgreSQL 모드 추가**: `DB_PROVIDER=postgres`, `POSTGRES_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`

## 코드 변경 프로세스

→ 상세: [`docs/workflow/code-change-process.md`](docs/workflow/code-change-process.md)

**7단계**: 코드변경 → 로컬검증(`type-check + lint + test + build`) → 리뷰 → 커밋+PR → CI → 머지+배포 → **CLAUDE.md 최신화(필수, 예외 없음)**

**커밋 prefix**: `feat:` 새기능 | `fix:` 버그 | `docs:` 문서 | `chore:` 설정 | `refactor:` 구조개선 | `style:` UI | `test:` 테스트 | `merge:` 머지

**CI/CD**: PR→main: lint→build→E2E. 주간QA 토요일. Railway 자동배포. → [`docs/workflow/ci-cd.md`](docs/workflow/ci-cd.md)

**구현 계획서 필수 섹션** (`docs/superpowers/plans/*.md` 상단):
```markdown
## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)
- [ ] SSR/Hydration: useState 초기값·useEffect setState 패턴 해당 여부
- [ ] 비슷한 파일 N개 생성 여부 → 공통 베이스 추출 검토
- [ ] UI 텍스트 변경 여부 → E2E 셀렉터 동시 검토 필요
```
각 Task 검증 단계에 `pnpm type-check && pnpm lint` 포함 필수 (type-check만으로는 lint 규칙 미검출).

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

> 카테고리별로 그룹화. 해당 작업 시 관련 그룹만 우선 확인.

### SSR · Hydration (컴포넌트 작성 시)
- **SSR 비결정 값 금지**: `new Date()`, `Math.random()`, `window` 참조 → `useEffect` 안에서만. `useState` 초기값은 `""`/`0`/`null`. React error #418 방지.
- **`useEffect` 내 `setState` 동기 호출 금지** (`react-hooks/set-state-in-effect`): `useEffect` body에서 직접 호출 불가 → `setTimeout(() => setState(...), 0)` + `return () => clearTimeout(t)` 패턴 필수. — **2026-05-01 CharacterDisplay·HeroSection 린트 실패 원인**.
- **Hydration 안전 초기화 패턴**: `window` 분기·날짜·랜덤값을 `useState` lazy initializer에 넣으면 SSR/CSR 불일치로 hydration error #418 발생. 올바른 패턴: `useState("")` + `useEffect(() => { const t = setTimeout(() => setState(val), 0); return () => clearTimeout(t); }, [])`. — **2026-05-01 HeroSection hydration 오류 원인**.
- **`<Image fill>` sizes 필수**: 미설정 시 Mobile Android CI 타임아웃. `sizes="(max-width: 640px) 50vw, ..."` 필수.

### API · 보안 (새 라우트 추가 시)
- **API 스키마**: 새 라우트 → `api-schemas.ts` Zod 먼저 정의, `safeParse` 사용. 타입 단언 `as {...}` 금지.
- **Zod `null` vs `undefined`**: Zustand `null` 초기값 필드 → `.nullish()` 필수. 위반 시 프로덕션 400 (로컬 통과) — **2026-04-24 장애 원인**. → [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)
- **API 라우트 outer catch 커버리지**: `POST` 핸들러 최외부 `} catch {` 블록은 `checkRateLimit: vi.fn().mockRejectedValue(new Error(...))` 패턴으로 커버. 미커버 시 Codecov patch 실패.
- **SSE 라우트 fire-and-forget 패턴**: 스트림 전송 완료 후 DB 저장은 `void saveFn(args).catch(e => console.error("[tag]", e))` 패턴 필수. `await` 금지 (스트림 블로킹).
- **DB 어댑터 동적 require**: `getDb()`는 런타임 `require()` 로드. 새 어댑터 추가 시 정적 `import` 금지.
- **JSON 파싱 — 문자열 내 `{}` 주의**: AI 응답 파싱 시 반드시 `parseJsonSafe()` (`src/services/core/text-cleaner.ts`) 사용. — **2026-04-26 타로·신점 결과 노출 장애 원인**. → [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md#3-json-파싱-파이프라인)

### 테스트 · CI (테스트 작성·PR 전)
- **API 라우트 테스트 경로**: `src/app/api/` 내 `*.test.ts`는 vitest 수집 불가 → `src/__tests__/api/` 배치. → [`docs/workflow/unit-testing.md`](docs/workflow/unit-testing.md)
- **E2E 스펙 추가 시 인증 의존성 명시**: 실 Supabase 세션 요구 spec은 파일 상단에 `// ⚠️ 실 Supabase 인증 세션 필요 — CI testIgnore 대상` 주석 필수.
- **UI 텍스트 변경 시 E2E 셀렉터 동시 검토**: `e2e/` 내 `hasText`, `getByText`, `locator("text=")` 패턴 grep 후 같은 커밋에 수정. — **2026-05-01 사주 버튼 변경 후 E2E CI 실패 원인**.
- **E2E 드롭다운 버튼 셀렉터**: `Icon` 컴포넌트가 `<img>`로 렌더링되므로 `button:has(img)` + `text=` 조합은 auto 버튼 오탐 발생. 드롭다운 내 특정 버튼은 `data-testid` 부여 필수. 데스크탑·모바일 드롭다운은 반드시 별도 `ref` + 별도 `testid` 사용 — 동일 `ref` 공유 시 React last-wins로 outside-click 오탐 발생하며 드롭다운이 선택 즉시 닫힘. 예: 데스크탑 `data-testid="theme-option-${t.id}"`, 모바일 `data-testid="mobile-theme-option-${t.id}"`. — **2026-05-02 E2E dawn 3회 연속 실패 + 테마 드롭다운 즉시 닫힘 버그(PR #211) 원인**.

- **Enum 화이트리스트 하드코딩 금지**: API 라우트에서 Zod `z.enum([...])` 검증 통과 후 일부 값만 하드코딩으로 재검증하면 나머지 값이 누락됨. `spreadResolver.getSpreadByType(val)` 처럼 유틸 메서드로 전체 enum 검증 필수. session/route.ts·reading/route.ts 모두 적용. — **2026-05-02 celtic-cross 등 7종 타로 세션 생성 DB 제약 위반 + 리딩 전체 차단(PR #213, #216) 원인**.
- **DB CHECK 제약과 앱 코드 동기화 필수**: DB schema에 CHECK 제약이 있는 enum 컬럼(spread_type, topic 등)에 새 값 추가 시 마이그레이션(ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT) 필수. 앱 코드만 수정하면 DB INSERT 500. — **2026-05-02 012_spread_type_expand.sql 장애 원인**.

### 패키지 · 빌드 (의존성 추가·수정 시)
- **패키지 추가 후 lockfile 변동 확인 필수**: `pnpm add` 후 `git diff pnpm-lock.yaml | grep "^[-+].*version"` 으로 피어 의존성 버전 변동 검토. — **2026-05-01 lockfile 불일치 장애 원인**.
- **npm 미등록 패키지 side-effect import 즉시 차단**: `import "미등록패키지/path"` 형태는 모듈 로딩 시점에 vitest·Next.js 전체 차단. 새 PR에서 발견 시 병합 전 제거.
- **비슷한 파일 N개 생성 시 공통 베이스 추출 검토**: 동일 의도 파일 2개 이상 → 팩토리/베이스 우선 설계. SonarCloud `new_duplicated_lines_density` 임계치 3%. — **2026-05-01 OG 이미지 중복 SonarCloud 실패 원인**.

### i18n 다국어 (UI 텍스트·번역·locale 작업 시)
- **LocaleProvider SSR 패턴 필수**: `useEffect` 내 `setLocale()` 동기 호출 금지. `setTimeout(() => setLocale(initial), 0); return () => clearTimeout(t)` 패턴 사용. 미준수 시 hydration error #418 발생. — **`react-hooks/set-state-in-effect` 린트 위반 원인**.
- **번역 키 정의 우선**: 새 UI 텍스트 추가 → ① `src/i18n/translations/shared/keys.ts`에 타입 추가 → ② `ko/index.ts` (SSOT) 채움 → ③ `en/index.ts` 임시 영문 (외부 번역 대기) → ④ `ja/index.ts`는 PR-5에서 일괄. ko 사전이 SSOT, en/ja는 부분 번역 허용 (Partial<SharedKeys>).
- **LanguageSwitcher 데스크탑·모바일 별도 ref + 별도 testid 필수**: 동일 ref 공유 시 React last-wins로 outside-click 오탐. 데스크탑 `data-testid="lang-option-${l}"`, 모바일 `data-testid="mobile-lang-option-${l}"`. PR #211 테마 드롭다운 교훈 동일 적용.
- **API 라우트 INSERT에 locale 동봉 필수**: 신규 `sessions`·`readings` INSERT 시 `getRequestLocale()` (`src/i18n/server-locale.ts`)로 locale 결정 후 동봉. 미동봉 시 DEFAULT 'ko' 자동 입력 → 영어/일본어 사용자 데이터가 'ko'로 고정. — **PR-A 정합성 핫픽스 원인**.
- **E2E 셀렉터는 data-testid 우선**: 한글 텍스트 `hasText` regex 셀렉터는 i18n 텍스트 변경에 깨짐. nav·LanguageSwitcher·드롭다운은 `data-testid` 부여 필수. — **PR-A E2E `responsive.spec.ts` 수정 원인**.

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
| 다국어·번역 | `src/i18n/translations/shared/keys.ts`, `{ko,en,ja}/index.ts` | — |
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

**MCP 자율 진단 규칙**: 아래 트리거 발생 시 사용자 요청 없이 컨텍스트를 수집한다. MCP 툴이 세션에 로드되지 않으면 REST API / CLI로 대체한다.

| 트리거 | 수집 방법 | 목적 |
|---|---|---|
| PR 생성·머지 후 CI 결과 확인 시 | SonarCloud REST API `qualitygates/project_status` + `issues/search` | 신규 이슈 직접 파악 |
| SonarCloud Quality Gate Fail 감지 | REST API `measures/component` + `issues/search?severities=BLOCKER,CRITICAL` | 커버리지·버그·취약점 원인 수집 |
| Railway 배포 이상 의심 시 | `railway link` 후 `railway deployment list --json` 또는 `mcp__railway__get-logs` | 런타임 에러 로그 직접 수집 |
| 로컬 검증 통과 후 push 전 | SonarCloud REST API `qualitygates/project_status` | 직전 분석 베이스라인 확인 |

> **Railway MCP 주의**: `mcp__railway__*` 툴은 세션마다 `railway link` CLI 선행 필요. 링크 명령: `railway link --project 24bdc6b7-db99-4487-896e-d4bd68dbb6b3 --environment production --service ArcanaInsight`
> **SonarCloud MCP 주의**: `mcp/sonarqube` Docker 컨테이너가 실행 중이어도 MCP 툴이 세션에 로드되지 않는 경우 있음 → REST API로 대체.
