# ArcanaInsight 다국어(i18n) 도입 마스터 플랜

## Context

ArcanaInsight를 한국어/영어/일본어 3개 locale로 확장하기 위한 점진 도입 계획이다. 누적 24 에이전트 검증 (Round 1×4 + Round 2×4 + Round 3 위험 + Round 4 PR 설계 + Round 5×2 검토 + Z 시나리오 R1~R8 8회 + V1~V4 4회) 및 직접 grep 검증으로 범위를 확정했다. **2026-05 Z2 시나리오 채택**으로 외부 번역 의존성을 제거하고 부수 비용 0원 정책을 확정했다.

핵심 결정:
- **URL 구조**: flat + 쿠키 + middleware 확장 (subpath 채택 시 영향 57곳 vs flat 5곳, 10배 차이)
- **라이브러리**: 커스텀 middleware + 자체 translations 모듈 (next-intl 미설치, 학습곡선 회피)
- **신점**: 1차 비활성 → PR-6에서 (c)+(d) 하이브리드 (Korean Cultural Reading 컬렉션, 한국어 원문+로마자+영문 해설)
- **번역 소스 (Z2 시나리오·2026-05 확정)**: ① **AI 응답은 LLM 직접 다국어 생성** (Grok/Claude system prompt locale 분기, 기존 paid AI 재활용·추가 비용 0원) ② **정적 영역만 무료 NMT** (Cerebras·Groq·SambaNova·HuggingFace 4단 fallback, 카드 등록 불필요) ③ **캐릭터 페르소나·waiting-lines 자체 작성** (외부 번역가 발주 0건, 부수 비용 0원). 검증 근거: R1 (Gemini Free EEA/UK ToS 위반·DeepL Free 신규 가입 종료·Papago 외국 사용자 차단 → 4단 fallback 채택), V2 (Grok·Claude 다국어 캐릭터 보이스 8.5~9.5/10, 무료 LLM 7/10 대비 +1.5~2.5점 우위)
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

## PR-3: 정적 영역 영어 (Z2 시나리오 — PR-3a~3e 5개 분할)

**위험도**: P1 / **합계 시간**: 28h (보수, 표준 24h) / **의존성**: PR-2

> **Z2 시나리오 핵심**: PR-3은 **정적 영역만 처리** (UI 라벨·카드 이름·키워드·스프레드·사주 글로서리). 카드 의미문·캐릭터 페르소나·AI 프롬프트 등 동적 영역은 PR-4의 `prompt-builder.ts` locale 분기로 LLM이 직접 다국어 응답. 외부 번역가 발주 0건, NMT 4단 fallback (Cerebras·Groq·SambaNova·HuggingFace) 활용.

### PR-3a — i18n 인프라·sonar 선반영 (보수 7h, 표준 6h)
**필수 선행 조건** — sonar.exclusions 미선반영 시 PR-3f의 자동 생성 1000+ LOC가 SonarCloud Quality Gate 100% 실패 (V3 검증).

- `sonar-project.properties` cpd/coverage exclusions: `src/i18n/translations/{en,ja}/**`·`src/i18n/manifest/**`·`src/i18n/overrides/**`·`**/_generated.ts`·`scripts/i18n/**`
- `src/lib/env.ts` 4 신규 getter: `getCerebrasApiKey()`·`getGroqApiKey()`·`getSambaNovaApiKey()`·`getHuggingFaceApiKey()` (모두 nullable, 미설정 시 fallback chain skip)
- `docs/operations/env-variables.md` 4 환경변수 동시 갱신 → `pnpm check:env-docs` 통과
- 카드 데이터 helper 도입: `src/lib/i18n/card-helpers.ts` — `getCardName(card, locale)`·`getCardMeaning(card, position, locale)` (V3 옵션 B, ko fallback 보장)
- **객체화 대신 helper**: `card.name: string` 그대로 유지 + 별도 사전 `src/i18n/translations/{en,ja}/cards.ts` lookup → 변경 면적 5배 감소 (V1·V3 합의)

### PR-3b — NMT Provider 베이스·fallback chain (보수 3.5h, 표준 3h)
- `src/services/i18n-nmt/base-translation-provider.ts` 추상 클래스 (공통 fetch+AbortSignal+parseJsonSafe, npm SDK 0개)
- `cerebras-provider.ts`·`groq-provider.ts`·`sambanova-provider.ts`·`huggingface-provider.ts` (각 40~60 LOC, fetch only)
- `fallback-translator.ts` 4단 chain + 일일 quota counter + retry-with-backoff
- 단위 테스트 statements 100% (mock 위주, mock-ai.ts 패턴)
- **회피 옵션**: ~~Gemini Free~~(EEA/UK ToS 위반)·~~DeepL Free~~(신규 가입 종료)·~~Papago~~(외국 사용자 차단)·~~Azure F0~~(카드 등록 강제, 부수 비용 0원 정책 위반)

### PR-3c — 사주·도메인 글로서리 (사람 작성 SSOT, 보수 6h, 표준 5h)
- `docs/i18n/glossary.md` 카테고리별 표준 결정 기록 (8 카테고리)
- `src/i18n/glossary/typed.ts` 타입 안전 SSOT
  - 천간 10·지지 12·오행 5·**십성 10 (Joey Yap 표준 `Friend/Rob Wealth/Eating God/Hurting Officer/Indirect Wealth/Direct Wealth/Seven Killings/Direct Officer/Indirect Resource/Direct Resource`)**·12운성 12·타로 메이저 22 표준 영문/일문
  - 일본어 사주 음독 (`比肩(ひけん)`·`偏官(へんかん)` 등) — R7 표
  - 일본 타로 표준 표기 (`吊された男`·`運命の輪`·`女教皇` — R7 검증)
- `src/services/i18n-nmt/glossary-validator.ts` — NMT 출력에 글로서리 키 누락 시 재시도 정규식 검사

### PR-3d — 캐릭터 voice 가이드 (사람 작성 SSOT, 보수 8h, 표준 7h)
- `docs/i18n/character-voice-guide.md` 12명 × 영어/일본어 시그니처 + 5~8 few-shot
- `src/i18n/glossary/character-voices.ts` (CharacterId union 모두 커버)
- **R3·V2 위험 4명 강화 규칙**: ren=archaic ("thou hast", "in stillness", forbid forsooth/wherefore), lix=GenZ ("lol", "fr"), hoshi=GenZ + 일본어 ギャル (V2에서 hoshi 일본어 7.5/10 → 무료 LLM-judge cross-validation 강화), arcana=elegant mystic + 「にゃん」 음역
- 일본어 役割語 매핑: arcana=ですわ調·miko=でございます·ren=でござる/まする·hoshi=だよ/じゃん·cairn=お嬢様/若様 등

### PR-3e — 정적 영역 자동 번역 실행 (보수 3.5h, 표준 3h)
- `pnpm i18n:translate --area=ui|cards-keyword|spreads|saju --locale=en|ja` 실행 (약 900 NMT 호출)
- Cerebras 1차 → 30 RPM·1M tok/일 한도 → 약 1~2시간에 완료
- 글로서리 적용·LLM-judge 평균 점수 manifest 기록
- 미달 항목 재시도 3회 → 실패 시 `human-queue.jsonl`
- **사람 검수 필수**: 카드 키워드·표준 표기 인간 검수 1차 패스 (3~5h)
- 결과 git-tracked `_generated.ts` (sonar.exclusions 적용)

### Z2 정적 번역 영역 (약 900 항목, NMT 처리)
- UI 단문 437 (header·footer·home·settings·common·error·locale)
- 카드 영문명 78 (이미 SSOT 존재) + 일본어명 78 (R7 표 사람 작성)
- 카드 키워드 78×4 = 312 (Smith-Waite 표준 NMT)
- 스프레드 라벨·position 약 150
- 토픽·birth-hours·error-messages 약 50
- 캐릭터 메타 (이름·1줄 인사말) 24 (사람 작성)

### 위험 매핑 (Z2 보강)
- **R-04 nameJa fallback**: helper에서 ko fallback, 별도 사전 lookup
- **R-09 도메인 용어 표준화**: 글로서리 강제·정규식 검증
- **R-06 오번역**: LLM-judge cross-validation (Cerebras·Groq) + 사람 검수
- **Z-01 NMT 카드 키워드 평탄화**: Smith-Waite system prompt 강제 + 인간 검수
- **Z-02 카드 일본어명 직역**: R7 표 사람 작성 SSOT (NMT 미적용)

### 검증
- 카드/스프레드 단위 테스트가 ko/en 양쪽 데이터 검증
- E2E `tarot-flow.spec.ts` en 모드: 카드 결과 영문 표시
- `getCardName(card, 'ja')` → ja 사전 lookup, 부재 시 ko fallback (모든 78장)
- LLM-judge 평균 ≥ 7.5, 글로서리 violations = 0

---

## PR-4: 캐릭터 페르소나 + AI 프롬프트 locale 분기 (Z2 핵심)

**위험도**: P1 (Z2 시나리오 핵심 PR) / **시간**: 보수 17h / 표준 14h / **의존성**: PR-3a~3e

> **Z2 시나리오 핵심**: prompt-builder.ts locale 분기로 **Grok/Claude가 처음부터 영어/일본어 응답**. waiting-lines·카드 의미 등 **동적 영역 전체를 LLM이 직접 다국어 생성** → 외부 번역가 발주 영역이 system prompt locale 인스트럭션 + 캐릭터 페르소나 다국어 SSOT 작성으로 대체. R3 4명 위험 캐릭터(ren·lix·hoshi·arcana) 평가가 V2에서 +1.5~2.0점 상향 (paid Grok/Claude 직접 응답 → 8.5~9.5/10).

### 목표
12 캐릭터 영문 페르소나 재작성(번역 아닌 로컬라이즈) + waiting-lines 186줄 영문 + AI 프롬프트 locale 분기 + 메모리 locale 필터.

### 신규 파일
- `src/services/core/locale-instructions.ts` — `RESPONSE_LANG_INSTRUCTION[locale]`·`TOPIC_LABELS_BY_LOCALE`·`SPREAD_INTERPRETATION_HINT` 상수 (영문/일문 system prompt 텍스트)
- `src/data/characters/persona/{ko,en,ja}.ts` — 페르소나 SSOT 분리 (V1 옵션 B)
- `src/i18n/translations/{en,ja}/cards.ts` — 카드 의미 별도 사전 (옵션 B, ko 사전 무손상)
- `src/services/core/__tests__/prompt-builder.locale.test.ts` — locale 분기 단위 테스트 (en/ja 분기 12 케이스, ko 회귀 0)
- `scripts/check-ai-quality.ts` — staging에서 캐릭터별 AI 응답 샘플 수집 (회귀 테스트 도구)
- `docs/i18n/character-qa-checklist.md` — 12 캐릭터 × 3 locale × 4 mood = 144 항목 매뉴얼 검증 체크리스트

### 수정 파일
- `src/types/character.ts` — `CharacterConfig.persona: Record<Locale, LocalizedPersona>` 추가 (V1 옵션 B 합성 패턴)
- `src/data/characters/index.ts` — `getCharacterPersona(id, locale)` 헬퍼 + `persona/{ko,en,ja}.ts` 합성, ko fallback 보장
- `src/services/core/prompt-builder.ts` — **6 함수 시그니처에 `locale: Locale = "ko"` 파라미터 추가**: `buildCharacterHeader`·`buildSystemPrompt`·`buildReadingPrompt`·`buildUserInfoPrompt`·`buildFreeQuestionPrompt`·`buildCharacterMemoryPrompt`. default `"ko"`로 757개 테스트 회귀 0
- `src/services/{tarot,saju,shinjeom}/*-service.ts` — 3 서비스 클래스 메서드 시그니처 locale 파라미터 추가 + 한국어 하드코딩 라벨(TOPIC_LABELS·INSTRUCTIONS)을 locale-instructions.ts로 이관
- `src/app/api/{tarot,saju,shinjeom}/{reading,message}/route.ts` — **`getRequestLocale()` 이미 추출 중** (PR-A 머지 완료) → 함수 인자로 전파만 추가
- `src/app/api/daily-card/route.ts` — daily-card도 locale 분기 추가
- `src/lib/db/character-context.ts` — `getRecentCharacterMemory(db, userId, charId, locale, limit)` 시그니처 추가, `findMany` 필터에 `locale` 추가 (V1 옵션 1: 같은 locale만 — 016 마이그레이션 `idx_sessions_user_locale` 인덱스 즉시 활용)
- `src/lib/request-utils.ts` — `SSE_HEADERS`에 `charset=utf-8` 명시 1줄 (일본어 멀티바이트 안전 보강)

### 변경 내용 (Z2 핵심)
1. **system prompt locale 분기**: `LANGUAGE_INSTRUCTIONS[locale]` 도입 ("Respond strictly in English"·"日本語で回答してください"·한국어 그대로) — V2 검증 +50% 정확성 (Lilt Labs)
2. **캐릭터 페르소나 다국어 SSOT 자체 작성** (외부 번역가 발주 0건):
   - 영문 60줄 + 일문 60줄 = 120줄 (사용자 본인 작성, V2 가이드)
   - archaic English 가이드 (Shakespeare Resource Center·bardweb.net)
   - 일본어 役割語 가이드 (라이트노벨·시대극·ギャル語 코퍼스)
   - LLM 자가 검증 루프 (Claude/Grok에 "이 영문 페르소나가 캐릭터 시그니처를 보존하는가" 메타 질문)
3. **waiting-lines 186줄 동적 생성 가능**: 정적 번역 불필요 — 캐릭터 system prompt 기반 LLM 즉석 생성 (옵션) 또는 정적 NMT (PR-3e 산출물)
4. **카드 의미 별도 사전**: `src/i18n/translations/{en,ja}/cards.ts` 78×2 = 156 항목 lookup, ko 사전 무손상
5. **character-context cross-locale 정책 옵션 1**: 같은 locale 메모리만 활용. 신규 영어 사용자 메모리 0건 → KPI 측정 시점 ko/en 분리 명시
6. **AI 응답 품질 staging 회귀 테스트**: 캐릭터별 5개 × 3 service × 3 locale = 135 샘플 매뉴얼 검수
7. **hoshi 일본어 ギャル 보강** (V2 7.5/10 식별): 일본어 ギャル 코퍼스 few-shot 8~10개 + LLM cross-validation, 미달 시 PR-7 베타 피드백으로 사후 개선

### 위험 매핑 (Z2 갱신)
- **R-05 캐릭터 정체성**: paid Grok/Claude 직접 응답 (V2 8.5~9.5/10) + 자체 voice 가이드 + LLM-judge cross-validation
- **R-07 응답 언어 일치**: LANGUAGE_INSTRUCTIONS 강제 + system prompt 자체를 해당 언어로 로컬라이즈 (V2 슬라이드백 위험 회피)
- **R-08 메모리 cross-locale**: V1 옵션 1 (같은 locale만) — `idx_sessions_user_locale` 활용
- **Z-04 LLM 모델 업데이트 회귀**: `scripts/check-ai-quality.ts` staging 회귀 감지 자동화
- **Z-08 PII 유출 방지**: 정적 NMT 영역만 무료 API 호출, 사용자 입력은 절대 무료 NMT 미전송

### 검증
- prompt-builder 단위 테스트 (locale=en/ja 분기 12 케이스, ko default 757개 회귀 0)
- 통합 테스트: en 세션에서 메모리는 en만 로드 (`idx_sessions_user_locale` 인덱스 활용 확인)
- E2E `character.spec.ts` en 모드 + ja 모드
- staging AI 응답 5×3×3 = 135 캐릭터 샘플 매뉴얼 검증
- 캐릭터별 voice consistency LLM-judge ≥ 7.5 (V2 임계: ren 8.0, hoshi 7.0, 그 외 7.5)

---

## PR-5: 일본어 전체 (Z2 시나리오 — 정적 영역만 ja 복제)

**위험도**: P1 / **시간**: 보수 7h / 표준 6h / **의존성**: PR-2, PR-3, PR-4

> **Z2 시나리오**: 동적 영역(AI 응답·waiting-lines·카드 의미문)은 PR-4 system prompt locale 분기로 일본어 자동 처리 → PR-5는 **정적 영역만 일본어 복제**. 외부 번역 발주 0건. **사용자 일본어 미능통 → V2 hoshi 일본어 ギャル 7.5/10 위험은 PR-7 사용자 피드백 채널·LLM-judge cross-validation·일본인 무료 도움 모집으로 사후 보강**.

### 목표
PR-2~4의 영어 자산 구조에 일본어 데이터 채우기. 구조 변경 0. **출시 순서: 영어 안정화 후 일본어** (사용자 결정).

### 수정 파일
- `src/i18n/translations/ja/index.ts` — UI 일본어 (PR-3e NMT 산출물 + 사람 검수)
- `src/i18n/translations/ja/cards.ts` — 카드 의미 일본어 lookup 사전 (PR-3e NMT + R7 표준 표기 사후 치환)
- `src/data/cards/i18n/ja.ts` — 카드 nameJa SSOT (R7 표 사람 작성: `吊された男`·`運命の輪`·`女教皇` 등)
- `src/data/spreads/index.ts`, `src/data/saju/{constants,categories}.ts`, `src/data/topics.ts`, `src/data/birth-hours.ts`, `src/data/error-messages.ts` — 일본어 사전 채움
- `src/data/characters/persona/ja.ts` — 12 캐릭터 일본어 페르소나 (자체 작성, V2 役割語 가이드: arcana=ですわ調·miko=でございます·ren=でござる·hoshi=だよ/じゃん·cairn=お嬢様/若様)
- `src/services/core/locale-instructions.ts` — `RESPONSE_LANG_INSTRUCTION.ja = "必ず自然な日本語で応答してください。韓国語は使用しないこと。"`
- `src/app/layout.tsx` — `@fontsource/noto-sans-jp` 자가 호스팅 (V2 vercel/next.js#45080 Google Fonts 502 회피)
- `src/app/_og/ResultOgBase.tsx` — `@vercel/og` 일본어 글리프 폰트 buffer 명시 (두부 글리프 방지)

### 변경 내용
1. 카드 nameJa·키워드·의미 일본어 사전 (PR-3e NMT 산출물 + 사람 검수)
2. 캐릭터별 일본어 페르소나 자체 작성 (PR-4 voice 가이드 활용)
3. waiting-lines 일본어: 정적 사전 OR 동적 생성 (PR-4 system prompt 활용)
4. AI prompt 일본어 인스트럭션 활성화
5. 일본어 폰트 자가 호스팅 + OG 이미지 폰트 buffer
6. parseJsonSafe 일본어 따옴표(「」) 단위 테스트 강화 (V2 검증: 「」는 ASCII 외부 문자라 정규식 안전, 단 LLM이 JSON 키에 「」 사용 환각 방지 system prompt 명시)
7. hreflang `ja` + og:locale `ja_JP` 추가
8. **출시 게이트 보강**: 영어 출시 후 30일 안정화 → 일본어 베타 1주 → canary 24h → 정식 출시 (R6 출시 게이트 4단계)

### 위험 매핑 (Z2 갱신)
- **R-04 nameJa**: 사람 작성 SSOT (R7 표 매핑)
- **R-05 캐릭터 정체성**: 일본어 役割語 가이드 + LLM cross-validation
- **R-07 응답 언어**: 한국어 system prompt 슬라이드백 방지 (V2 — 일본어 system prompt 로컬라이즈)
- **Z-02 일본어 native 검수 부재**: PR-7 베타 피드백 + 일본인 무료 도움 모집 + ko fallback (출시 보류 옵션 가능)
- **Z-05 일본어 따옴표 「」**: parseJsonSafe 안전 (V2 검증), JSON 키에 ASCII `"` 강제 system prompt

### 검증
- 쿠키 `ai_locale=ja` → 모든 페이지 일본어
- E2E ja 모드 home/settings/tarot/saju/character 통과
- AI 응답 일본어 staging 5×3 캐릭터 검증 (V2 8.5~9.0/10 임계)
- `getCardName(card, 'ja')` 단위 테스트: 모든 80 카드 ja 사전 존재 또는 ko fallback
- LLM-judge 평균 ≥ 7.5 + 캐릭터별 voice consistency ≥ 7.5 (hoshi ギャル는 cross-validation 강화)
- 일본인 베타 사용자 1주 신고 ≤ 5건

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

## PR-7: 사용자 피드백 시스템 (Z2 신규 추가)

**위험도**: P1 (Z2 시나리오 회귀 감지 인프라) / **시간**: 보수 11h / 표준 10h / **의존성**: PR-3a (병렬 가능, PR-6 전 어디든)

> **Z2 시나리오 핵심**: 외부 검수 0건 (부수 비용 0원 정책) → 사용자 피드백 채널이 회귀 감지 1차 방어선. 동일 키 24h 내 3건 신고 누적 시 자동 격리.

### 신규 파일
- `supabase/migrations/017_translation_feedback.sql` — RLS 5개 정책 + DB CHECK 제약 + `idx_feedback_status_locale`·`idx_feedback_key` 인덱스
  - **대안 (V3 권고)**: 마이그레이션 보류 → `.github/ISSUE_TEMPLATE/translation-feedback.md` 1개 파일 대체. 신고 빈도 높아질 때 도입 결정
- `src/components/common/TranslationFeedback.tsx` — 결과 페이지 우하단 floating 버튼
- `src/app/api/feedback/translation/route.ts` — POST 엔드포인트 (rate-limit: 1 IP / 10분 / 3건)
- `src/app/admin/feedback/page.tsx` — admin role 운영 대시보드 (RLS admin only)

### 회귀 감지 메커니즘 (R6 다층 5단계)
- **Tier 1 (PR diff)**: 변경 키만 LLM-judge → 평균 < 7.5 또는 VCS < 7.0이면 PR 차단
- **Tier 2 (staging 1%)**: 1시간 윈도우 평균 임계 미달 시 Slack/Discord 웹훅
- **Tier 3 (back-translation 24h cron)**: en/ja → ko 역번역 cosine < 0.7 자동 큐
- **Tier 4 (사용자 피드백)**: 24h 내 동일 키 3건 누적 → 자동 격리 (즉시 ko fallback)
- **Tier 5 (행동 지표)**: 결과 페이지 체류 시간·재방문률 locale 비교, 영어 30%+ 짧으면 회귀 의심 플래그

---

## 의존성 그래프 (Z2 시나리오)

```
PR-1·PR-2·PR-A·PR-B (머지 완료 ✅)
  │
  ├─→ PR-3a (i18n 인프라·sonar, 7h)  ⚠️ 필수 선행
  │     │
  │     ├─→ PR-3b (NMT Provider 베이스·fallback, 3.5h)  ┐
  │     ├─→ PR-3c (사주·도메인 글로서리, 6h)           ├─ 병렬 가능
  │     ├─→ PR-3d (캐릭터 voice 가이드, 8h)            ┘
  │     │     │
  │     │     └─→ PR-3e (정적 NMT 실행·검수, 3.5h)
  │     │           │
  │     │           └─→ PR-4 (캐릭터·AI 프롬프트 locale 분기, 17h) ★ Z2 핵심
  │     │                 │
  │     │                 └─→ PR-5 (일본어 정적 영역, 7h)
  │     │                       │
  │     │                       └─→ PR-6 (E2E·SEO·신점, 27h)
  │     │
  │     └─→ PR-7 (사용자 피드백, 11h) ─ PR-6 전 어디서든 병렬
```

**병렬 가능 영역**: PR-3b·3c·3d 3개 동시 (단일 개발자 직렬 17.5h vs 멀티 에이전트 병렬 8h max). PR-7은 PR-3a 머지 후 PR-6 전 어디서든.

**임계 경로 (보수)**: 3a(7) → 3b·c·d max=8 → 3e(3.5) → 4(17) → 5(7) → 6(27) + 7(11) = **80.5h** (병렬 가정).

## 시간 추정 (Z2 시나리오 보정)

| PR | Z2 보수(h) | Z2 표준(h) | 비고 |
|---|---|---|---|
| PR-1 | 7~8 ✅ 머지 완료 | — | 참고용 |
| PR-2 | 10~11 ✅ 머지 완료 | — | 참고용 |
| PR-A | 핫픽스 ✅ 머지 완료 | — | locale wiring·sonar 정리 |
| PR-B | 핫픽스 ✅ 머지 완료 | — | 문서 정합성 |
| PR-3a | **7h** | 6h | sonar 선반영·env getter 4개·card helper |
| PR-3b | **3.5h** | 3h | NMT 4 Provider fetch only |
| PR-3c | **6h** | 5h | 글로서리 사람 작성 |
| PR-3d | **8h** | 7h | voice 가이드 사람 작성 |
| PR-3e | **3.5h** | 3h | NMT 자동 실행 + 검수 |
| PR-4 | **17h** | 14h | system prompt locale 분기 (Z2 핵심) |
| PR-5 | **7h** | 6h | 정적 영역 일본어만 |
| PR-6 | **27h** | 26h | E2E 495 매트릭스, 신점 하이브리드 |
| PR-7 | **11h** | 10h | 사용자 피드백 시스템 |
| **남은 합계** | **89h** | **80h** | 단일 개발자 (병렬 80.5h 임계 경로) |

**부수 비용 0원 확정** (V1·V2·V3·V4 합의):
- ❌ 외부 번역가 발주 (Fiverr·Upwork): **0건**
- ❌ Railway self-host (LibreTranslate $5/월): **0원**
- ❌ Azure F0 (카드 등록 강제): **회피**
- ❌ Gemini Free (EEA/UK ToS 위반·2025-12 quota 50~80% 삭감): **회피**
- ❌ DeepL Free (신규 가입 종료): **회피**
- ❌ Papago (외국 사용자 가입 차단): **회피**
- ✅ Cerebras·Groq·SambaNova·HuggingFace (모두 카드 등록 불필요·상업 사용 명시 허용·학습 미사용): **활용**
- ✅ 기존 paid Grok/Claude API: 토큰 비용 ko 100·en -19%·ja +21% (사용자 비율 ko:en:ja=7:2:1 가정 시 사실상 동등 -1.7%/월)

## Z2 시나리오 잔존 리스크 매트릭스

| ID | 영역 | 등급 | 대응 |
|---|---|---|---|
| Z-01 | 캐릭터 보이스 회귀 (NMT 평탄화) | P0 | 글로서리 강제 + voice 가이드 + locked phrase + LLM cross-validation |
| Z-02 | 일본어 native 검수 부재 | P1 | PR-7 베타 피드백 + 무료 도움 모집 + ko fallback + 출시 보류 옵션 |
| Z-03 | 무료 NMT 정책 변경 | P1 | 4-provider fallback chain + 월 1회 probe |
| Z-04 | LLM 모델 업데이트로 다국어 회귀 | P0 | LANGUAGE_INSTRUCTIONS + scripts/check-ai-quality 회귀 |
| Z-05 | parseJsonSafe 일본어 따옴표 | P1 | 단위 테스트 (text-cleaner.locale.test.ts) — 이미 존재 |
| Z-06 | NMT 글로서리 위반 | P1 | `pnpm i18n:nmt:diff` CI 강제 |
| Z-07 | 캐릭터 메모리 cross-locale 오염 | P0 | character-context.ts WHERE locale 필터 (옵션 1) |
| Z-08 | NMT 응답 PII 유출 | P0 | 정적 영역만 NMT, 사용자 입력 절대 미전송 |
| Z-09 | hoshi 일본어 ギャル 7.5/10 | P2 | LLM cross-validation 강화 + 베타 피드백 |
| Z-10 | hreflang SEO 누락 | P2 | PR-6 generateMetadata alternates 강제 |

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

## 추가 의사결정 사항 (Z2 시나리오 확정)

1. ~~**외부 번역가 발주 시점**~~: **2026-05 사용자 결정으로 외부 발주 0건** — Z2 시나리오 채택, 부수 비용 0원
2. **SonarCloud cpd.exclusions 선반영**: PR-3a 머지 시 `src/i18n/translations/{en,ja}/**`·`src/i18n/manifest/**`·`**/_generated.ts`·`scripts/i18n/**` 등록 필수 (V3 검증)
3. **PR 처리 방식**: PR-3을 5개 (3a~3e)로 분할, 각 PR LOC 200~600 범위 — SonarCloud Quality Gate 안정화
4. **카드 데이터 처리**: V1·V3 합의로 helper 패턴 (옵션 B) 채택 — `card.name: string` 그대로 + 별도 사전 lookup. 변경 면적 5배 감소
5. **페르소나 SSOT 분리**: `src/data/characters/persona/{ko,en,ja}.ts` 분리 (V1 옵션 B)
6. **메모리 cross-locale 정책**: 옵션 1 (같은 locale만) — 영어 첫 사용자 메모리 0건은 의도된 동작
7. **017 마이그레이션 (translation_feedback)**: V3 권고로 보류 → GitHub Issue 템플릿 1개로 대체. 신고 빈도 모니터링 후 도입 결정
8. **일본어 출시 게이트 보강**: 영어 출시 후 30일 안정화 → 일본어 베타 1주 → canary 24h. hoshi 일본어 ギャル는 LLM cross-validation 강화

---

## Z2 시나리오 AI 직접 다국어 응답 워크플로

```
사용자 입력 + locale → API route handler
  ↓
getRequestLocale() (이미 PR-A에서 추출 중) → DB 저장 + prompt-builder 전파
  ↓
prompt-builder.ts:
  - buildCharacterHeader(character, locale) → persona/{ko,en,ja}.ts 합성
  - LANGUAGE_INSTRUCTIONS[locale] 시스템 인스트럭션 추가
  - "Respond strictly in English" / "日本語で回答してください" 강제
  - Topic·spread 라벨 locale-instructions.ts에서 다국어 lookup
  ↓
FallbackProvider (Grok 1차 + Claude fallback) — 변경 0
  ↓
SSE 스트리밍 (charset=utf-8 명시) → parseJsonSafe (영어/일본어 안전 검증됨)
  ↓
사용자에게 해당 locale 응답
```

## Z2 시나리오 정적 영역 NMT 파이프라인

```
ko 사전 변경 → pnpm i18n:translate
  ↓
FallbackTranslator 4단 chain
  - 1차: Cerebras Free (1M tok/일, 30 RPM, 카드 불필요)
  - 2차: Groq Free (14,400 RPD, 카드 불필요)
  - 3차: SambaNova Free (영구 무료, 카드 불필요)
  - 4차: HuggingFace Inference Free (100K credits/월, 카드 불필요)
  ↓
glossary-validator.ts 정규식 강제 (Joey Yap 십성·Smith-Waite 카드)
  ↓
LLM-judge cross-validation (다른 모델로 평가) → 평균 점수 manifest 기록
  ↓
점수 < 7.5 → 자동 재시도 3회 → 실패 시 human-queue.jsonl
  ↓
_generated.ts 산출 (sonar.exclusions 적용, git-tracked)
  ↓
overrides/{en,ja}.json 사람 수정 우선 (자동 재실행 시 덮어쓰지 않음)
```

---

**예상 완료 일정**: 단일 개발자 작업 강도별 시뮬레이션
- **보수 (4h/일)**: 89h ÷ 4 = 약 22 영업일 + 베타 14일 + 출시 게이트 7일 = **약 7~8주**
- **표준 (6h/일)**: 80h ÷ 6 = 약 14 영업일 + 베타 14일 + 출시 게이트 7일 = **약 5.5~6주**
- **적극 (8h/일)**: 80h ÷ 8 = 약 10 영업일 + 베타 14일 + 출시 게이트 7일 = **약 4.5~5주**

영어 출시(PR-3a~3e + PR-4)는 약 33h → 표준 페이스 6일 + 베타 7일 = **약 2~3주**, 일본어는 영어 안정화(30일) 후 PR-5·PR-6·PR-7 추가.

**Z2 시나리오 핵심 가치**:
- 부수 비용 **0원** (외부 번역가 발주 0건·self-host 0건·카드 등록 강제 0건)
- 캐릭터 보이스 보존 **8.5~9.5/10** (paid Grok/Claude 직접 응답, V2)
- 무료 NMT 부담 **81% 감소** (호출 7,492 → 약 900)
- 외부 발주 대기 시간 **0주**
- 작업 시간 **89h(보수) / 80h(표준)** — 원안 93~96h 대비 14~16% 단축
