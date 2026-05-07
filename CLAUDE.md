# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로·사주 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 세션 시작 순서

1. **이 CLAUDE.md 전체** — 프로젝트 구조·규칙·아키텍처 파악
2. **`git log --oneline -10`** — 최근 변경사항
3. **메모리 확인** — `~/.claude/projects/.../MEMORY.md`
4. **MCP 연동** — SonarCloud QG + Railway 배포 상태 확인 (작업 전 필수). → [`docs/operations/monitoring.md`](docs/operations/monitoring.md)
   - SonarCloud: `curl -s -u "SONARQUBE_TOKEN:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight"`
   - Railway: `railway link --project 24bdc6b7-db99-4487-896e-d4bd68dbb6b3 --environment production --service ArcanaInsight` 선행 필수
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
├── components/      # card/character/chat/common/effects/home/layout/saju/skin/tarot/ (CharacterDisplay·CharacterAuraLayer·ShuffleCeremony·ServiceBackground·LanguageSwitcher 등)
├── i18n/            # config·detect·LocaleProvider·useT·server-locale + translations/{ko,en,ja,shared}
├── data/            # cards/, characters/, skins/, spreads/, saju/, shinjeom/, home/, topics.ts, birth-hours.ts, error-messages.ts, ui-copy.ts
├── hooks/           # Zustand stores (useSession·useSajuSession·useShinjeomSession·useLocaleStore 등) + useSSEStream, useTheme, useCharacter, useCardAnimation
├── lib/             # env.ts (getter 16개), request-utils.ts (SSE_HEADERS·jsonError), rate-limit.ts, db/ (getDb()·reading-saver), auth/ (getCurrentUser·requireUser·assertSessionOwnership), validation/ (api-schemas·Zod), storage/ (getCardImageUrl)
├── services/        # core/ (FallbackProvider·PromptBuilder·CircuitBreaker·http-utils), tarot/, saju/, shinjeom/
├── types/           # card.ts, character.ts, session.ts, service.ts, user-info.ts
├── test-helpers/    # mock-db, mock-auth, mock-request, mock-ai, reset-modules, api-route-setup
└── __tests__/api/   # API 라우트 단위 테스트 (vitest.config.ts exclude 우회) + locale-wiring

docs/                # architecture/ conventions/ workflow/ operations/ archive/ → [`docs/README.md`](docs/README.md)
supabase/migrations/ # 001+003~016 SQL (002 결번, PostgreSQL 모드: src/lib/db/schema/index.ts)
e2e/                 # 22개 spec, 3 디바이스
scripts/e2e-full/    # E2E 전수 검증 252 조합 (orchestrator/worker/reporter + matrix/flows/validators)
```

## 캐릭터 시스템

12명(arcana·miko·seonhwa·hoshi·luna·rei·cairn·zero·haru·ren·lix·ethan), 각자 다른 말투. → [`docs/architecture/data-model.md`](docs/architecture/data-model.md)

**표정 규칙 (6-mood)**: `default` → 세션 진입/대기 | `mystical` → 카드 선택/리딩 대기 | `smile` → 결과 도착 | `serious` / `surprised` / `wink` → 대기 대사 mood 연동. 에러 시 `default` 복귀. 대기 대사 중 표정은 `line.mood` 따름.

**이미지 경로**: 12캐릭터 모두 `nukki/[mood].png` (1408×768)

## 핵심 아키텍처

**AI 신뢰성**: `services/core/` = Grok 우선 + Claude 자동 fallback. → [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md)

**DB_PROVIDER**: `supabase`(기본) ↔ `postgres` 즉시 전환. `getDb()` / `getCurrentUser()` / `getCardImageUrl()` 자동 분기. → [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md)

**API 보안**: Rate Limit → Zod safeParse → requireUser → assertSessionOwnership. → [`docs/architecture/auth-abstraction.md`](docs/architecture/auth-abstraction.md)

**SSE 스트리밍**: tarot/saju/shinjeom reading API. 서버: `SSE_HEADERS`+`jsonError()`(`request-utils.ts`), `readSseLines`+`withAbortTimeout`(`http-utils.ts`). 클라이언트: `fetchSSEStream()`(`useSSEStream.ts`, `AbortSignal` 지원). 클라이언트 hard timeout 180s — `AbortController`+`finished` 가드, 초과 시 `readingErrorReason="timeout"`. `/api/daily-card`는 JSON.

**share_token**: `/*/result/[id]` 공개 공유. 소유자 전용 = `assertReadingAccess("owner")`.

**비주얼 FX 시스템**: `CharacterAuraLayer`(오라·reduced-motion), `GlowBurstRing`(표정 전환 버스트), `ServiceBackground`(서비스별 배경 -z-10), `SpriteAnimator`(mood별 drop-shadow). OG 팩토리: `src/app/_og/ResultOgBase.tsx` → `makeResultOgResponse(config)` (SonarCloud 중복 방지).

**ShuffleCeremony**: `src/components/tarot/ShuffleCeremony.tsx` — 카드 선택 진입 시 2.2s Canvas rAF 의식 4단계(덱컷→글로우→타이프라이터→부채꼴). 클릭/Enter/Space·`prefers-reduced-motion` 스킵. `getWaitingLinesData(locale)` 경유 ko/en/ja 분기. N=9 고정.

**리딩 max_tokens**: Grok-3 reasoning 토큰 흡수 + 한국어 1.3배 비효율 고려해 +30~40% 상향. `reasoning_effort:"low"` 주입(`buildReasoningOption(model)` — grok-3 계열만), `AI_TIMEOUT_MS=120000`, 빈 응답 throw→Claude fallback 자동 전환. `GROK_REASONING_EFFORT`·`GROK_MODEL` 환경변수로 제어.
- **타로**: `computeReadingMaxTokens(cardCount)` (`src/app/api/tarot/reading/route.ts`) — 1장→2600, 3장→4500, 5장→6500, 7장→8500, 9장→10500, 10장→18000(celtic-cross), 12장+→20000(zodiac 등).
- **사주**: `computeSajuReadingMaxTokens(timeRange, includeMonthly)` (`src/app/api/saju/reading/route.ts`) — includeMonthly→20000, full-fortune→17000, five-year→15000, three/next-year→13000, 기본 10000.
- **신점**: `SHINJEOM_TOKENS_FINAL=8500` / `SHINJEOM_TOKENS_CHAT=1500` (`src/app/api/shinjeom/message/route.ts`).

**parseError**: `ReadingResult.parseError` = `"truncated"|"invalid_json"|"fallback_text"|"missing_fields"` (`src/types/service.ts`). parseError 있으면 SSE done 송신 + **DB INSERT 차단** (빈 결과 화면 방지). 클라이언트는 캐릭터 에러 메시지·재시도 표시 (타로 `truncated`만 부분 결과 유지).

**reading-saver locale 가드**: `src/lib/db/reading-saver.ts` `safeLocale()` — 잘못된 locale 입력 시 'ko' 자동 치환 → 016 마이그레이션 CHECK 제약(`locale IN ('ko','en','ja')`) 위반 차단.

**SpreadPosition rotation**: `SpreadPosition.rotation?: number` — celtic-cross position 1에 `rotation: 90` (전통 레이아웃). `CardSpread.tsx` 카드 컨테이너 `transform: rotate(Ndeg)` (라벨 회전 제외).

**캐릭터 경험 시스템**: `CharacterId` union (`CHARACTER_IDS as const`). `CHAR_ENTRANCE`(입장 설정), `CHARACTER_RESULT_MOODS`(결과 mood). 6-mood 연동: 카드선택→`surprised`, 대기→`line.mood`, 결과→캐릭터별. 자유질문(`freeQuestion`→`buildFreeQuestionPrompt()`), 캐릭터 메모리(`getRecentCharacterMemory()`→system prompt 주입, 인증 사용자 전용). → [`docs/architecture/data-model.md`](docs/architecture/data-model.md)

**i18n 다국어 시스템**: ko/en/ja. middleware가 쿠키→Accept-Language→DEFAULT로 locale 결정 → `x-locale` 헤더. `useT()` (클라이언트) / `t(key, locale)` (서버). 사전: `src/i18n/translations/{ko,en,ja}/index.ts` + `shared/keys.ts`. DB 5테이블에 `locale CHECK('ko','en','ja')` (016 마이그레이션). INSERT 시 `getRequestLocale()` 동봉 필수. AI 응답 locale: `buildCharacterHeader(locale)` `LANGUAGE_INSTRUCTIONS` — en/ja는 응답 언어 + JSON 키 영어 고정 강제(`parseJsonSafe` 실패 방지). 캐릭터 locale 헬퍼: `src/data/characters/locale-helpers.ts`. drift 검사: `pnpm i18n:check`. → [`docs/architecture/i18n.md`](docs/architecture/i18n.md)

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

> scripts 정책 → [`docs/workflow/scripts.md`](docs/workflow/scripts.md) | Windows E2E Docker 필수 → [`docs/workflow/e2e-testing.md`](docs/workflow/e2e-testing.md) | `smart-ci.spec.ts` CI 자동 제외(`testIgnore: process.env.CI`)

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
- **SSR 비결정 값 금지**: `new Date()`, `Math.random()`, `window` → `useEffect` 안에서만. `useState` 초기값은 `""`/`0`/`null` (React error #418 방지). `useEffect` 내 setState 직접 호출 금지 → `setTimeout(() => setState(...), 0)` + `return () => clearTimeout(t)` 필수 (`react-hooks/set-state-in-effect`).
- **`<Image fill>` sizes 필수**: 미설정 시 Mobile Android CI 타임아웃. `sizes="(max-width: 640px) 50vw, ..."` 필수.

### API · 보안 (새 라우트 추가 시)
- **API 스키마**: 새 라우트 → `api-schemas.ts` Zod 먼저 정의, `safeParse` 사용. 타입 단언 `as {...}` 금지.
- **Zod `null` vs `undefined`**: Zustand `null` 초기값 필드 → `.nullish()` 필수. 위반 시 프로덕션 400 (로컬 통과). → [`docs/conventions/zod-schemas.md`](docs/conventions/zod-schemas.md)
- **API 라우트 outer catch 커버리지**: `POST` 핸들러 최외부 `} catch {` 블록은 `checkRateLimit: vi.fn().mockRejectedValue(new Error(...))` 패턴으로 커버. 미커버 시 Codecov patch 실패.
- **SSE 라우트 fire-and-forget 패턴**: 스트림 전송 완료 후 DB 저장은 `void saveFn(args).catch(e => console.error("[tag]", e))` 패턴 필수. `await` 금지 (스트림 블로킹).
- **DB 어댑터 동적 require**: `getDb()`는 런타임 `require()` 로드. 새 어댑터 추가 시 정적 `import` 금지.
- **JSON 파싱 — 문자열 내 `{}` 주의**: AI 응답 파싱 시 반드시 `parseJsonSafe()` (`src/services/core/text-cleaner.ts`) 사용. → [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md#3-json-파싱-파이프라인)

### 테스트 · CI (테스트 작성·PR 전)
- **API 라우트 테스트 경로**: `src/app/api/` 내 `*.test.ts`는 vitest 수집 불가 → `src/__tests__/api/` 배치. → [`docs/workflow/unit-testing.md`](docs/workflow/unit-testing.md)
- **E2E 스펙 추가 시 인증 의존성 명시**: 실 Supabase 세션 요구 spec은 파일 상단에 `// ⚠️ 실 Supabase 인증 세션 필요 — CI testIgnore 대상` 주석 필수.
- **UI 텍스트 변경 시 E2E 셀렉터 동시 검토**: `e2e/` 내 `hasText`, `getByText`, `locator("text=")` 패턴 grep 후 같은 커밋에 수정.
- **E2E 드롭다운**: `button:has(img)+text=` 조합 오탐 발생 → `data-testid` 필수. 데스크탑·모바일 드롭다운 반드시 별도 `ref`+별도 `testid` — 동일 `ref` 공유 시 React last-wins로 outside-click 오탐(드롭다운 선택 즉시 닫힘).
- **Mobile Android 스크롤 테스트**: `domcontentloaded` 직후 scrollTo/scrollHeight flaky → `load`+`networkidle` 두 단계 대기 + scrollHeight polling(최대 10s) + `window.scrollTo`&`mouse.wheel` 병행 필수.

- **Enum 화이트리스트 하드코딩 금지**: API 라우트에서 Zod `z.enum([...])` 검증 통과 후 일부 값만 하드코딩으로 재검증하면 나머지 값이 누락됨. `spreadResolver.getSpreadByType(val)` 처럼 유틸 메서드로 전체 enum 검증 필수. session/route.ts·reading/route.ts 모두 적용.
- **DB CHECK 제약과 앱 코드 동기화 필수**: DB schema에 CHECK 제약이 있는 enum 컬럼(spread_type, topic 등)에 새 값 추가 시 마이그레이션(ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT) 필수. 앱 코드만 수정하면 DB INSERT 500.

### 패키지 · 빌드 (의존성 추가·수정 시)
- **패키지 추가 후 lockfile 변동 확인 필수**: `pnpm add` 후 `git diff pnpm-lock.yaml | grep "^[-+].*version"` 으로 피어 의존성 버전 변동 검토.
- **npm 미등록 패키지 side-effect import 즉시 차단**: `import "미등록패키지/path"` 형태는 모듈 로딩 시점에 vitest·Next.js 전체 차단. 새 PR에서 발견 시 병합 전 제거.
- **비슷한 파일 N개 생성 시 공통 베이스 추출 검토**: 동일 의도 파일 2개 이상 → 팩토리/베이스 우선 설계. SonarCloud `new_duplicated_lines_density` 임계치 3%.

### i18n 다국어 (UI 텍스트·번역·locale 작업 시)
- **LocaleProvider SSR 패턴 필수**: `useEffect` 내 `setLocale()` 동기 호출 금지. `setTimeout(() => setLocale(initial), 0); return () => clearTimeout(t)` 패턴 사용. 미준수 시 hydration error #418 발생.
- **번역 키 정의 우선**: 새 UI 텍스트 추가 → ① `src/i18n/translations/shared/keys.ts`에 타입 추가 → ② `ko/index.ts` (SSOT) 채움 → ③ `en/index.ts` 임시 영문 (외부 번역 대기) → ④ `ja/index.ts`는 일괄 마이그레이션 시 추가. ko 사전이 SSOT, en/ja는 부분 번역 허용 (Partial<SharedKeys>).
- **`t()` namespace 정확성 필수**: `flatten()`이 `${namespace}.${innerKey}`로 키 생성. namespace 불일치 시 `t()` fallback이 **키 문자열 자체를 반환** → 화면 노출 UX 최악. 새 키 전 `grep "innerKey" shared/keys.ts`로 위치 확인.
- **LanguageSwitcher 별도 ref+testid 필수**: 데스크탑·모바일 각각. 동일 ref 공유 시 React last-wins 오탐.
- **INSERT에 locale 동봉 필수**: `getRequestLocale()` 경유. 미동봉 시 DEFAULT 'ko' → en/ja 사용자 데이터 오염.
- **E2E 셀렉터 data-testid 우선**: 한글 `hasText` regex는 i18n 텍스트 변경에 깨짐.

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

**에이전트** (`.claude/agents/`): `character-add`, `divination-scaffold`, `page-builder`, `quality-gate`, `skin-manager`, `theme-creator`

**훅**: PreToolUse `git push*` → `scripts/pre-push-checks.sh` (tsc+lint+build)

**자율 관리 원칙**: 필요하면 즉시 생성, 불필요하면 즉시 삭제, 변경 후 보고. 파괴적 변경(deny 규칙·훅 삭제)만 사전 확인.

**문서 관리**: 코드 변경 시 관련 문서 동시 업데이트. 중복은 링크로 대체. **High 등급(CLAUDE.md, README*, docs/architecture/*, known-issues.md, LICENSE) 변경 시 multi-agent ≥2 분리 검증 필수** (정합성·누락·구조). 변경 보고:
```
📄 문서 변경: [파일명] — 변경 이유: [이유] — 변경 내용: [1줄 요약]
```

## 운영 체계

**Claude CLI**: 기획·구현·검토·배포 (7단계). **Grok API**: 리딩+이미지 전용. **n8n Cloud**: Spec Tracker/Quality Monitor/Weekly Report. **단일 진실 소스**: CLAUDE.md + `docs/` → [`docs/README.md`](docs/README.md). **MCP 자율 진단**: PR CI/QG Fail/Railway 이상/push 전 — 요청 없이 수집, MCP 미로드 시 REST/CLI 대체. → [`docs/operations/monitoring.md`](docs/operations/monitoring.md)
