# ArcanaInsight 다국어(i18n) 도입 마스터 플랜

## Context

ArcanaInsight를 한국어/영어/일본어 3개 locale로 확장하기 위한 점진 도입 계획이다. 12 에이전트(Round 1×4 + Round 2×4 + Round 3 위험 + Round 4 PR 설계 + Round 5×2 검토)와 직접 grep 검증으로 범위를 확정했고, 사용자 결정 3건을 반영했다.

핵심 결정:
- **URL 구조**: flat + 쿠키 + middleware 확장 (subpath 채택 시 영향 57곳 vs flat 5곳, 10배 차이)
- **라이브러리**: 커스텀 middleware + 자체 translations 모듈 (next-intl 미설치, 학습곡선 회피)
- **신점**: 1차 비활성 → PR-6에서 (c)+(d) 하이브리드 (Korean Cultural Reading 컬렉션, 한국어 원문+로마자+영문 해설)
- **번역 소스**: 전면 외부 번역 (전문 번역가 의뢰) — 캐릭터 페르소나·도메인 용어·AI 응답 품질이 외부 번역에 직접 의존
- **출시 순서**: 영어 먼저(PR-1~4) → 검증 후 일본어 추가(PR-5)

## 확정된 사실 (5 라운드 검증)

| 항목 | 직접 측정 |
|---|---|
| 고유 한글 문자열 | **2,022개** (`grep -rh '"[^"]*[가-힯]' src/`) |
| UI 한글 라인 (코멘트 포함) | 3,287줄 |
| 카드 데이터 unique 한글 | 299 (major-arcana 66 + minor-arcana 249 + symbols 22) |
| 스프레드 unique 한글 | 87 |
| 사주 constants 한글 | 51 |
| 캐릭터 텍스트 필드 | 12 × 5 (greeting/personality/description/speciality/speechStyle) = 60 |
| waiting-lines 한글 라인 | 186 (tarot 60 + saju 54 + loading 12 + sajuAnalyzing 12 + cardPreview 12 + characterError 24 + shuffleCeremony 12) |
| AI 프롬프트 한글 라인 | prompt-builder 88 + saju-service 64 = 152 |
| 페이지·라우트 | 17 page.tsx + 25 Link href + 14 router.push |
| E2E 셀렉터 | text 기반 셀렉터 120개 (R1-A의 25개는 5배 과소평가) |
| 테스트 케이스 | 21 spec 파일 × 평균 ~8 test = 약 165 (3 locale 매트릭스 시 495 실행) |

## 직접 검증으로 발견된 R4 명세 보정사항 (Round 5)

1. **Drizzle 스키마 위치 정정**: `src/lib/db/schema/profiles.ts`·`schema/readings.ts` 별도 파일은 없음 → 모두 `src/lib/db/schema/index.ts`에 통합. PR-1 영향 파일 명세 수정.
2. **`card.name` 객체화 영향 9개 파일** (CardFace.tsx·prompt-builder.ts·daily-card·tarot session/result 등) + 80개 카드 데이터 수정. PR-3 작업량 +2h.
3. **Translations 15 파일 SonarCloud 중복 위험**: 공통 베이스(`translations/shared/keys.ts` 또는 factory) 추출 강제 (CLAUDE.md L223 "비슷한 파일 N개" 규칙).
4. **useThemeStore 패턴 결함**: `setMode` useEffect 내 직접 호출 (CLAUDE.md L199-200 setTimeout 패턴 위배 가능). useLocaleStore에서는 setTimeout(() => setLocale(...), 0) + cleanup return 패턴 강제.
5. **sessions 테이블 locale 컬럼 누락 발견**: character-context.ts WHERE locale 필터 위해 sessions에도 locale 컬럼 필요. 016 마이그레이션에 sessions 추가.
6. **E2E 매트릭스 재계산**: 21 spec × 3 locale = 63이 아니라 ~165 test × 3 = 495 실행. CI 시간 영향 30분→60분+.
7. **시간 추정 21% 보정**: PR-1 6→7~8h, PR-2 8→10~11h, PR-3 12→13~14h, PR-4 16→20h, PR-5 18→21h, PR-6 14→22h. 총 74h → **93~96h** (12 영업일).

## 누락 영역 (Round 5에서 발견 → 각 PR에 반영)

- **카드 이미지 alt 텍스트** (CardFace.tsx에 `alt={card.nameKo}` 하드코딩) → PR-3
- **에러 페이지** (`app/not-found.tsx`, `app/error.tsx`) → PR-1 (인프라)
- **AI 응답 일본어 문자 처리** (parseJsonSafe가 「」 같은 일본어 따옴표 안전한지) → PR-5 단위 테스트
- **사용자 locale 자동 감지 후 1회 confirm 모달** (브라우저 영어 → 자동 영어로 가지 말고 "English? 한국어?" 확인) → PR-2
- **locale 변경 토스트 알림** ("Language changed to English") → PR-2
- **NextAuth.js DB_PROVIDER=postgres 모드 영향** (profiles vs auth.users) → PR-1 마이그레이션에서 양 모드 모두 처리
- **OG 이미지 폰트** (Noto Sans JP embedded 필요) → PR-5
- **사주 십성 영문 표준 조사** (Five Elements/Wood,Fire vs 학술) → PR-3에서 외부 번역가에 가이드 제공

---

## PR-1: i18n Foundation (인프라·DB·Provider)

**위험도**: P0 (서비스 차단 위험 영역) / **시간**: 7~8h / **의존성**: 없음

### 목표
라우팅·쿠키·DB 컬럼·Provider·`<html lang>` 동적화. UI 텍스트 0건 변경. 영어 locale 인프라만 활성화.

### 신규 파일
- `src/i18n/config.ts` — `LOCALES = ['ko','en','ja'] as const`, `DEFAULT_LOCALE = 'ko'`, `LOCALE_COOKIE = 'ai_locale'`, `COOKIE_MAX_AGE = 30*24*60*60`
- `src/i18n/detect.ts` — `detectLocale(req)`: 쿠키 → Accept-Language → DEFAULT 우선순위
- `src/i18n/translations/index.ts` — `t(key, locale)` + ko fallback (`en→ko / ja→ko`), 빈 사전 객체 (`ko/en/ja: {}`)
- `src/i18n/LocaleProvider.tsx` — Client Context, `useLocale()` 훅
- `src/hooks/useLocaleStore.ts` — Zustand (useThemeStore 패턴 + setTimeout 보정 적용, persist 미사용 — 쿠키가 SSOT)
- `src/app/api/locale/route.ts` — POST `{locale}` → Set-Cookie + 200 응답
- `supabase/migrations/016_locale_columns.sql`:
  ```sql
  ALTER TABLE profiles ADD COLUMN locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko','en','ja'));
  ALTER TABLE sessions ADD COLUMN locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko','en','ja'));
  ALTER TABLE readings ADD COLUMN locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko','en','ja'));
  ALTER TABLE saju_readings ADD COLUMN locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko','en','ja'));
  ALTER TABLE shinjeom_readings ADD COLUMN locale TEXT DEFAULT 'ko'
    CHECK (locale IN ('ko','en','ja'));
  -- 5개 테이블 RLS 정책 재발급 (015 패턴 참고)
  ```
- `src/app/not-found.tsx` 신규 (locale 인식 — 또는 기존 점검 후 i18n)
- `src/app/error.tsx` 신규 (동일)

### 수정 파일
- `middleware.ts` (~+25줄) — Supabase auth 호출 후 `detectLocale` → `request.cookies.set(...)` + `response.headers.set('x-locale', locale)`. **Auth 응답 객체 보존** (R-02)
- `src/app/layout.tsx` (~+10줄) — async server component 전환, `cookies().get('ai_locale')`로 lang 결정, `<html lang={locale}>`, `<LocaleProvider initial={locale}>` 래핑
- `src/lib/db/schema/index.ts` (~+20줄) — Drizzle 스키마에 locale 컬럼 (sessions/profiles/readings/saju_readings/shinjeom_readings)
- `src/lib/auth/supabase-auth.ts` (~+5줄) — `getCurrentUser()` 반환에 `locale: 'ko'|'en'|'ja'` 포함
- `src/lib/validation/api-schemas.ts` — locale 필드 스키마 추가 (`z.enum(['ko','en','ja']).nullish()`)

### 위험 매핑
- **R-01 hydration**: `<html lang>` 서버에서 cookie 결정, client useState 동일값 보장
- **R-02 middleware 체인**: Supabase auth 먼저, locale 헤더만 추가
- **R-03 RLS**: 015 패턴 따라 5개 테이블 정책 재발급
- **R-15 URL 호환**: 쿼리/path 변경 0

### 검증
- `pnpm type-check && pnpm lint && pnpm test` (기존 714개 통과)
- `curl -I http://localhost:3000/ -H 'Accept-Language: en'` → `Set-Cookie: ai_locale=en`
- DB: `SELECT locale, COUNT(*) FROM profiles GROUP BY locale` → 모두 'ko'
- E2E `home.spec.ts`·`auth.spec.ts` 0회귀
- `parseJsonSafe()` 일본어 따옴표 단위 테스트 (선제적)

---

## PR-2: UI 텍스트 영어 1차 + LanguageSwitcher

**위험도**: P1 / **시간**: 10~11h / **의존성**: PR-1

### 목표
Header/Footer/Home/Settings 핵심 페이지 영어 번역 + translations 모듈 구조 + data-testid 1차 + LanguageSwitcher + locale 변경 토스트.

### 신규 파일
- `src/i18n/translations/shared/keys.ts` — namespace key 타입 정의 (drift 방지)
- `src/i18n/translations/{ko,en,ja}/{common,header,footer,home,settings}.ts` 5×3=15 파일 (ja는 빈 객체로 PR-5 placeholder)
- `src/components/layout/LanguageSwitcher.tsx` — 데스크탑·모바일 별도 ref + 별도 testid (PR #211 교훈)
- `src/components/common/LocaleConfirmModal.tsx` — 첫 방문 시 자동 감지 locale ↔ 한국어 선택 모달
- `src/components/common/Toast.tsx` 또는 기존 활용 — locale 변경 알림

### 수정 파일
- `src/components/layout/Header.tsx`, `Footer.tsx`, `MobileNav.tsx` — `t()` 호출 + LanguageSwitcher 배치
- `src/app/page.tsx`, `src/app/settings/page.tsx`, `src/data/home/*` — 한글 → key 추출
- `src/data/ui-copy.ts` — translations 모듈로 이관
- `src/app/layout.tsx` — skip-link 텍스트 t() 적용

### 변경 내용
1. namespace 규칙 확정: `header.nav.tarot`, `home.hero.title` 형식
2. 하드코딩 한글 → `t('namespace.key')` 호출, 한국어 값을 `ko` 사전으로 이관
3. **외부 번역가 위탁**: 100키 영어 번역 (사용자 결정 — 전면 외부 번역)
4. data-testid 1차 부여 (E2E text 셀렉터 의존 제거 시작)
5. LanguageSwitcher: ko/en/ja 드롭다운, 데스크탑 `data-testid="lang-option-${l}"`, 모바일 `data-testid="mobile-lang-option-${l}"`
6. 첫 방문 LocaleConfirmModal: 쿠키 미존재 + Accept-Language이 ko 아닐 때 표시
7. setLocale 호출 시 토스트 알림

### 위험 매핑
- **R-01**: 서버·클라이언트 동일 사전 유효, fallback chain 단위 테스트
- **R-12 E2E**: data-testid 도입 시작
- **R-13 drift**: namespace 키 타입 강제

### 검증
- 쿠키 `ai_locale=en` → Home/Settings 영어 표시
- 쿠키 `ai_locale=ja` → 한국어 표시 (ja 빈 객체이므로 fallback 동작)
- `e2e/home.spec.ts`·`settings.spec.ts` testid 마이그레이션, ko/en 통과
- `e2e/theme.spec.ts` 패턴 따른 `language-switcher.spec.ts` 신규 (드롭다운 모바일/데스크탑 분리 검증)
- `translations/index.test.ts` 신규 — fallback 동작 검증

---

## PR-3: 도메인 데이터 영어 (카드·스프레드·사주·UI 데이터)

**위험도**: P1 / **시간**: 13~14h / **의존성**: PR-2

### 목표
카드 299·스프레드 87·사주 constants 51·topics·birth-hours·error-messages 영어 번역 + 카드/스프레드 객체 다국어 구조 전환 + fallback chain 안전화.

### 신규 파일
- `src/data/cards/locale-helpers.ts` — `getCardName(card, locale)`, `getCardMeaning(card, position, locale)` (항상 ko fallback 보장)
- `src/data/cards/__tests__/locale-helpers.test.ts`
- `docs/i18n/glossary.md` — 외부 번역가용 도메인 용어집 (사주 십성·오방색·타로 카드 표준 영문명)

### 수정 파일
- `src/types/card.ts` — `name: string` → `name: { ko: string; en: string; ja?: string }`, `meanings`도 객체화 (R-04 nameJa 부재 fallback)
- `src/data/cards/major-arcana.ts` (22장 × 6필드)
- `src/data/cards/minor-arcana.ts` (56장)
- `src/data/cards/symbols.ts`
- `src/data/spreads/index.ts` (스프레드 이름·position description)
- `src/data/saju/constants.ts`, `categories.ts` — 천간·지지·오행·십성·신살 영문
- `src/data/topics.ts`, `src/data/birth-hours.ts`, `src/data/error-messages.ts`
- `src/components/card/CardFace.tsx` (alt 텍스트 locale 인식, `getCardName(card, locale)`)
- `card.name` 객체화 영향 9개 파일 (CardFace·prompt-builder·daily-card·tarot session/result/[id] 등)

### 변경 내용
1. 타입 먼저 i18n 객체로 변경 (대량 변경 1회)
2. 외부 번역가 의뢰: 용어집(glossary) 기반으로 437개 항목 영문화
3. 카드 컴포넌트에서 `getCardName(card, locale)` 호출로 교체
4. saju 십성 영문 표준 채택 (일반 통용: Companion/Rival/Output/Hurt/Wealth/Officer/Resource/Seal 등) — 외부 번역가가 학술/대중 톤 선택
5. spreads position 설명 (Past/Present/Future 등 표준)

### 위험 매핑
- **R-04 nameJa fallback**: 타입에서 `ja?` 옵셔널, helper에서 ko fallback
- **R-09 도메인 용어 표준화**: glossary.md 작성
- **R-06 오번역**: 외부 번역가 검수

### 검증
- 카드/스프레드 단위 테스트가 ko/en 양쪽 데이터 검증
- E2E `tarot-flow.spec.ts` en 모드: 카드 결과 영문 표시
- `getCardName(card, 'ja')` → ko 반환 (모든 80장)

---

## PR-4: 캐릭터 페르소나 + AI 프롬프트 영어

**위험도**: P1 (캐릭터 정체성 보존이 가장 어려운 영역) / **시간**: 20h / **의존성**: PR-3

### 목표
12 캐릭터 영문 페르소나 재작성(번역 아닌 로컬라이즈) + waiting-lines 186줄 영문 + AI 프롬프트 locale 분기 + 메모리 locale 필터.

### 신규 파일
- `docs/i18n/character-voice-guide.md` — 외부 번역가용 캐릭터 보이스 가이드 (12 캐릭터 × 영어 화법 시그니처: arcana=elegant mystic, hoshi=casual GenZ, ren=archaic "thee/thou" 등)
- `docs/i18n/character-qa-checklist.md` — 12×3 페르소나 톤 일관성 QA 체크리스트
- `src/services/core/__tests__/prompt-builder.locale.test.ts` — locale 분기 단위 테스트
- `scripts/check-ai-quality.ts` — staging에서 캐릭터별 AI 응답 샘플 수집 (회귀 테스트 도구)

### 수정 파일
- `src/types/character.ts` — `CharacterConfig`에 `nameI18n`/`personalityI18n`/`speechStyleI18n` 같은 i18n 객체 필드 추가 (또는 캐릭터 객체 자체를 locale별 분리)
- `src/data/characters/index.ts` (~237줄) — 캐릭터별 5필드(greeting/personality/description/speciality/speechStyle)에 영문 추가
- `src/data/characters/waiting-lines.ts` (~300줄) — 라인별 `{ko, en}` 객체화, mood 보존
- `src/services/core/prompt-builder.ts` (~+30줄) — `buildPrompt({locale, character, ...})` 시그니처, `LANGUAGE_INSTRUCTIONS[locale]` 도입 ("Respond strictly in English"), `LOCALES`와 동일 source enum
- `src/services/saju/saju-service.ts` — OHAENG/TEN_STARS 영문 매핑 적용 (PR-3 산출물 활용)
- `src/lib/db/character-context.ts` — `loadMemory(userId, characterId, locale)`, `WHERE locale = $1` 필터 (R-08 cross-locale 오염 방지)
- `src/services/*/route.ts` — readings 저장 시 locale 동봉

### 변경 내용
1. 외부 번역가 캐릭터 보이스 가이드 작성 (한국어 어미 → 영어 화법 시그니처)
2. 12 캐릭터 영문 페르소나 외부 번역 + 자체 검수
3. waiting-lines 186줄 영어 — mood 보존 검증 스크립트
4. prompt-builder locale 파라미터 9개 호출부 수정
5. character-context 메모리 조회에 locale 필터, save 시 locale 기록
6. AI 응답 품질 staging 회귀 테스트 (캐릭터별 샘플 5개 × 3 service)

### 위험 매핑
- **R-05 캐릭터 정체성**: 외부 번역 + 보이스 가이드
- **R-07 응답 언어 일치**: LANGUAGE_INSTRUCTIONS 명시
- **R-08 메모리 cross-locale**: WHERE locale 필터

### 검증
- prompt-builder 단위 테스트 (locale=en 시 영문 system prompt 포함)
- 통합 테스트: en 세션에서 메모리는 en만 로드 (DB 쿼리 검증)
- E2E `character.spec.ts` en 모드
- staging AI 응답 5×3 캐릭터 검증

---

## PR-5: 일본어 전체 (PR-2~4 자산의 ja 복제)

**위험도**: P1 / **시간**: 21h / **의존성**: PR-2, PR-3, PR-4

### 목표
PR-2~4의 영어 자산 구조에 일본어 데이터 채우기. 구조 변경 0. **출시 순서: 영어 안정화 후 일본어** (사용자 결정).

### 수정 파일
- `src/i18n/translations/ja/{common,header,footer,home,settings}.ts` 5 파일 — UI 일본어
- `src/data/cards/*.ts` — `nameJa`, `meaningsJa` 채우기 (Round 2-B에서 nameJa 부재 확인됨, 보충 필수)
- `src/data/spreads/index.ts`, `src/data/saju/{constants,categories}.ts`, `src/data/topics.ts`, `src/data/birth-hours.ts`, `src/data/error-messages.ts`
- `src/data/characters/index.ts` — 12캐릭터 일본어 페르소나 (외부 번역가, 일본어 화법 시그니처: miko=巫女敬語, hoshi=ギャル체, ren=古風候文)
- `src/data/characters/waiting-lines.ts` — 186줄 일본어
- `src/services/core/prompt-builder.ts` — `LANGUAGE_INSTRUCTIONS.ja = "日本語で回答してください"`
- `src/app/layout.tsx` — Noto Sans JP 폰트 추가 (locale=ja 시), OG 이미지 폰트 embedded

### 변경 내용
1. 카드 nameJa 부재 항목 식별 → 일본어 표기 보충 (R-04)
2. 캐릭터별 일본어 페르소나 외부 번역 (12명)
3. waiting-lines 186줄 일본어
4. AI prompt 일본어 지시
5. 일본어 폰트 로드 + OG 이미지 embedded
6. parseJsonSafe 일본어 따옴표(「」) 단위 테스트 강화

### 위험 매핑
- **R-04 nameJa**: 보충 완료
- **R-05 캐릭터 정체성**: 일본어 화법 시그니처
- **R-07 응답 언어**: 일본어 지시
- **R-09 사주 일본 한자**: 일본어는 기존 한자 사용 가능 (영어보다 직접적)

### 검증
- 쿠키 `ai_locale=ja` → 모든 페이지 일본어
- E2E ja 모드 home/settings/tarot/saju/character 통과
- AI 응답 일본어 staging 확인
- `getCardName(card, 'ja')` 단위 테스트: 모든 80 카드 ja 필드 존재

---

## PR-6: E2E 마무리 + SEO + 신점 하이브리드

**위험도**: P2 / **시간**: 22h / **의존성**: PR-5

### 목표
E2E 셀렉터 testid 전환 마무리, hreflang/OG metadata, 신점 (c)+(d) 하이브리드 활성화, 키 drift CI 차단.

### 신규 파일
- `src/data/shinjeom/cultural-readings.ts` — 한국어 원문 + 영문 해설 + 로마자 병기 (Korean Cultural Reading 컬렉션, c+d 하이브리드)
- `src/services/shinjeom/shinjeom-i18n.ts` — locale별 한국어+로마자+영문 해설 렌더링
- `src/components/shinjeom/CulturalReadingDisplay.tsx` — 신점 하이브리드 UI
- `scripts/check-translation-keys.ts` — ko/en/ja 키 drift 검출 (CI)
- `e2e/i18n-matrix.spec.ts` — locale matrix 회귀 테스트

### 수정 파일
- `src/app/layout.tsx` — `generateMetadata` 동적화, `alternates.languages` (hreflang `ko-KR`, `en-US`, `ja-JP`, `x-default`), `openGraph.locale`
- `src/app/_og/ResultOgBase.tsx` + 7개 OG 라우트 — locale query 수용
- `e2e/*.spec.ts` (21개) — text 셀렉터 → testid 잔여분 전환
- `playwright.config.ts` — projects에 locale별 storageState (쿠키 ai_locale 사전 주입)
- `package.json` scripts — `i18n:check` 추가
- `.github/workflows/sonar.yml` 또는 `docs-sync.yml` — `pnpm i18n:check` 추가
- `src/app/shinjeom/page.tsx` 등 — locale=en/ja 시 cultural-readings 진입 활성화

### 변경 내용
1. `generateMetadata(props)` 도입, hreflang `x-default` + ko/en/ja
2. 신점 페이지 locale=en/ja에서 재활성화: 한국어 원문 + 로마자 transliteration + 영문 해설 동시 표시
3. E2E smart-ci.spec.ts에 locale 환경변수 매트릭스 (165 test × 3 locale = 495)
4. CI: `pnpm i18n:check` script로 키 drift 차단 (R-13)
5. 토큰 비용 모니터링: prompt-builder 로그에 locale 태그
6. 사주 십성·오방색 영문/일문 용어집 최종본 docs/ 내 보관

### 위험 매핑
- **R-06 신점 하이브리드**: c+d 채택
- **R-10 토큰 모니터링**
- **R-11 E2E 셀렉터 마무리**
- **R-13 drift 검증**
- **R-14 hreflang SEO**

### 검증
- `curl /` HTML head에 `<link rel="alternate" hreflang="en" href="..." />` 4개 (ko/en/ja/x-default)
- E2E ko/en/ja 매트릭스 통과 (CI 시간 60분 내)
- 신점 ko/en/ja 모드 진입 가능, 한자/로마자 병기 단위 테스트
- DB: `SELECT locale, count(*) FROM shinjeom_readings GROUP BY locale`
- `pnpm i18n:check` exit 0

---

## 의존성 그래프

```
PR-1 (Foundation, 7~8h)
  └─→ PR-2 (UI 영어 + LangSwitcher, 10~11h)
        └─→ PR-3 (도메인 영어, 13~14h)
              └─→ PR-4 (캐릭터 + AI 영어, 20h)
                    └─→ PR-5 (일본어 전체, 21h)
                          └─→ PR-6 (E2E + SEO + 신점, 22h)
```

순차 의존 (각 PR이 이전 PR의 자산을 활용). 병렬 진행 불가능 (단, 외부 번역 발주는 PR-2 완료 후 PR-3·4·5 자료를 한꺼번에 의뢰 가능).

## 시간 추정 (Round 5 보정)

| PR | 명세 | 보정 | 비고 |
|---|---|---|---|
| PR-1 | 6h | **7~8h** | RLS 5개 테이블 정책 재발급 시간 |
| PR-2 | 8h | **10~11h** | 외부 번역 의뢰 + LocaleConfirmModal·Toast 추가 |
| PR-3 | 12h | **13~14h** | card.name 객체화 9개 파일 영향 |
| PR-4 | 16h | **20h** | 캐릭터 페르소나 외부 번역 검수, AI staging 회귀 |
| PR-5 | 18h | **21h** | nameJa 보충, 일본어 폰트, parseJsonSafe ja 검증 |
| PR-6 | 14h | **22h** | E2E 165→495 매트릭스, 신점 하이브리드 UI |
| **총합** | **74h** | **93~96h** | 단일 개발자 12 영업일 |

**외부 번역 작업 별도**: 캐릭터 페르소나 12명 × 5필드 × 2 locale + 카드 80장 × 6필드 × 2 + waiting-lines 186 × 2 + UI 100키 × 2 + 도메인 용어 ~150 × 2 = **약 2,000 단위 외부 번역**. 발주·검수·반영 일정 별도(2~3주 권장).

## 위험 매트릭스 요약 (Round 3에서 식별, 15개)

- **P0 (서비스 차단)**: R-01 hydration, R-02 middleware Auth 체인, R-03 RLS 누락, R-04 nameJa fallback
- **P1 (UX 손상)**: R-05 캐릭터 정체성, R-06 도메인 용어, R-07 AI 응답 언어, R-08 메모리 cross-locale
- **P2 (운영 부담)**: R-09 토큰 비용, R-10 E2E 셀렉터 120개, R-11 키 drift, R-12 URL 호환
- **P3 (개선)**: R-13 OG locale, R-14 hreflang SEO, R-15 사용자 locale 학습

각 PR이 어느 위험을 해결하는지 위 PR 명세에 매핑 완료.

## 핵심 검증 게이트 (모든 PR 공통)

```bash
pnpm type-check && pnpm lint && pnpm test
pnpm exec tsx scripts/check-doc-links.ts
pnpm exec tsx scripts/check-env-docs.ts
# PR-6 머지 후 추가
pnpm i18n:check  # 키 drift 차단
```

PR-1 머지 직후 추가:
```bash
# DB 016 마이그레이션 검증
curl -s -u "$SONARQUBE_TOKEN:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight"
```

## Critical Files for Implementation

- `/home/user/ArcanaInsight/middleware.ts` (PR-1, locale 분기 + Supabase Auth 체인)
- `/home/user/ArcanaInsight/src/app/layout.tsx` (PR-1, async server + html lang 동적)
- `/home/user/ArcanaInsight/src/lib/db/schema/index.ts` (PR-1, locale 컬럼 5개 테이블)
- `/home/user/ArcanaInsight/supabase/migrations/016_locale_columns.sql` (PR-1, 신규)
- `/home/user/ArcanaInsight/src/i18n/` (PR-1, 디렉토리 신규)
- `/home/user/ArcanaInsight/src/types/card.ts` (PR-3, name 객체화)
- `/home/user/ArcanaInsight/src/data/characters/index.ts` (PR-4, 영어 페르소나)
- `/home/user/ArcanaInsight/src/services/core/prompt-builder.ts` (PR-4, locale 분기)
- `/home/user/ArcanaInsight/src/lib/db/character-context.ts` (PR-4, locale 메모리 필터)

## 작업하지 않을 것 (의도적 제외)

- **subpath URL 구조**: 영향 57곳 vs flat 5곳 — flat 채택 후 후일 추가 도입 가능
- **next-intl/next-i18next 라이브러리**: 학습곡선·React 19 호환 부분적 — 자체 모듈로 충분
- **신점 영어/일본어 직역**: 도메인 의미 손실 → c+d 하이브리드만 채택
- **사용자 locale 자동 강제 전환**: 첫 방문 시 모달로 사용자가 명시 선택

## 추가 의사결정 필요 항목

1. **외부 번역가 발주 시점**: PR-1 머지 후 즉시 vs PR-3 진입 시 — 비용·일정 트레이드오프
2. **SonarCloud 임계치**: i18n 도입으로 코드 라인 수 30% 증가 예상 → 중복도 임계치 일시 완화 협의
3. **PR 처리 방식**: 4개 커밋 누적 단일 PR(이전 작업 패턴) vs 6개 분리 PR — 사용자 결정 필요 시점

---

**예상 완료 일정**: 단일 개발자 12 영업일(코드 작업) + 외부 번역 2~3주 = **3~4주 출시 가능**. 영어 PR-1~4 완료 후 시장 출시 가능, 일본어는 PR-5~6 완료 후 추가 활성화.

---

## 실제 완료 현황 (2026-05-06)

| PR | 내용 | 상태 |
|---|---|---|
| PR-1 ~ PR-A | i18n 인프라·DB·LocaleProvider·session/reading 배선 | ✅ 머지 완료 |
| PR-B | CLAUDE.md·architecture 문서 갱신 | ✅ 머지 완료 |
| PR-C (feat/i18n-locale-ai-response) | Grok locale 분기 AI 응답·UI en/ja·waiting-lines en/ja | ✅ 완료 (브랜치) |

**PR-C 완료 항목:**
- `prompt-builder.ts`: `LANGUAGE_INSTRUCTIONS` map — AI 응답이 locale 언어로 자동 생성
- `tarot/saju/shinjeom result 페이지`: 한국어 하드코딩 → `t(key, locale)` 전환
- `waiting-lines-en.ts` / `waiting-lines-ja.ts`: 12캐릭터 대사 en/ja 번역 완료
- `waiting-lines-i18n.ts`: `getWaitingLinesData(locale)` — 세션 컴포넌트·ShuffleCeremony 진입점
- `ja/index.ts`: UI namespace (header/footer/home/settings/tarot/saju/shinjeom) 완성
- 762개 테스트 통과, type-check·lint·build 클린
