# 서비스 아키텍처 — 전체 흐름 개요

ArcanaInsight의 3개 운세 서비스(타로·사주·신점) 사용자 흐름 및 데이터 모델을 정의합니다.

---

## 개요 — 레이어 다이어그램

```
사용자 브라우저
  └─ Next.js App Router (src/app/)
       │  RootLayout(src/app/layout.tsx) = html/body·Provider·Header·전역 오버레이만
       │  ├─ (immersive)/  — 타로·사주·신점 진입/세션, character/[id]. Footer 미렌더(이중 스크롤 방지)
       │  └─ (site)/       — 홈, */result/[id], 마이페이지, 설정, 약관/개인정보, auth, dev. Footer 렌더
       │  (괄호 그룹은 URL 불변. api/·error·not-found·globals.css·layout.tsx는 app 루트 유지)
       ├─ UI 레이어 (src/components/)
       │    ├─ card/         — CardFace, CardBack, CardItem, CardDeck, CardSpread, CardStyleSelector
       │    ├─ character/    — 캐릭터 등장 컴포넌트
       │    ├─ common/       — UserInfoForm, PageSpinner, BirthTimeInput, ResultPageShell,
       │    │                  ResultShareButton, ReadingText, Toast, Icon, 모달 컴포넌트
       │    ├─ effects/      — ThemeEffectEngine, ParticleOverlay, MysticBackground 등 5-레이어 이펙트
       │    │                  ServiceIllustrations — TarotScene·SajuScene·ShinjeomScene CSS 애니메이션 장면 (useMouseParallax FAR/MID/NEAR 3레이어, 데스크탑 전용)
       │    │                  mysticUtils.ts — particleStyle·particleMotion 순수 함수
       │    │                  (홈 히어로 카드 덱 스타일: src/styles/home-effects.css — hero-tarot-card, hero-card-idle keyframe)
       │    ├─ layout/       — 데스크탑/모바일 레이아웃 분리 컴포넌트
       │    ├─ session/      — ResultTextCard, SessionActionButtons, ReadingErrorState, ReadingSectionBlock (3서비스 공통 — 섹션별 UI 블록)
       │    ├─ skin/         — 카드 스킨 관련 컴포넌트
       │    ├─ tarot/        — CardInterpretationList, TarotResultPanel,
       │    │                  CardFlipEffect, ReadingProgressIndicator, CardSpreadEffects
       │    └─ chat/home/saju/shinjeom/...
       ├─ 상태 (src/hooks/)
       │    ├─ useCardStyleStore  — 카드 스타일 persist (arcana-card-style)
       │    ├─ useSession / useSajuSession / useShinjeomSession  — 서비스별 세션 상태
       │    ├─ useLocaleStore / useGenderStore / useSkinStore  — 전역 설정
       │    ├─ useUserInfoForm  — UserInfoForm 상태·핸들러 추출 훅 (mode: tarot|saju|shinjeom)
       │    ├─ usePreselectCharacter  — URL ?character= 파라미터 + 선호 상담사 자동 선택
       │    ├─ useResetScrollOnStep  — step 변경 시 스크롤 최상단 초기화 (3페이지 공통)
       │    ├─ useTarotReading  — 타로 SSE 스트리밍·대기 연출·elapsed 카운터
       │    └─ useReadingReveal, useFavoriteCharacter, ...
       ├─ API 라우트 (src/app/api/)  — SSE 스트리밍 + Zod 검증 + Auth
       └─ 서비스 레이어 (src/services/)
            ├─ core/FallbackProvider  — Grok 우선 → Claude API fallback
            ├─ tarot/, saju/, shinjeom/
            └─ core/prompt-builder, text-cleaner, circuit-breaker

데이터 레이어
  ├─ Supabase (기본)     — Auth + PostgreSQL + Storage(card-styles 버킷)
  └─ PostgreSQL 모드     — NextAuth.js v5 + Drizzle (DB_PROVIDER=postgres 시)
```

**API 보안 순서** (변경 금지): Rate Limit → Zod `safeParse` → Auth → 소유권 검증

---


## 1. 서비스별 사용자 흐름

### 타로 (4단계)

1. **캐릭터 선택** → 12명 중 선택 (성별 필터 지원). 선호 상담사 설정 시 자동 스킵
2. **개인정보 입력** → 이름(선택), 생년월일, 출생시간, 성별, MBTI(선택)
3. **주제 선택 + 카드 뽑기** → 주제 선택 → 스프레드 선택 → 카드 선택
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 → 결과 공유(share_token URL)

### 사주 (4단계)

1. **캐릭터 선택** → 12명 중 선택 (성별 필터 지원). 선호 상담사 설정 시 자동 스킵
2. **개인정보 입력** → 이름(선택), 생년월일, 출생시간, 성별, MBTI(선택)
3. **시간단위 × 분석영역 선택** → 시간단위(7) + 분석영역(8) 동시 선택, 년단위 시 "월별 상세" 토글
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 → 결과 공유

### 신점 (4단계)

1. **캐릭터 선택** → 12명 중 선택. 선호 상담사 설정 시 자동 스킵
2. **주제 선택** → 신수(종합운), 연애/궁합, 재물/사업운, 직장/이직, 건강/액막이, 택일
3. **개인정보 입력 (선택)** → `UserInfoForm mode="shinjeom"` — 이름·생년월일·성별·MBTI 모두 선택 입력. "건너뛰기" 버튼으로 생략 가능. 입력 시 AI 프롬프트에 반영
4. **대화형 상담** (`/shinjeom/session`) → 무제한 문답 → "신점 결과 받기" 버튼으로 종료 (1턴 이상 후 활성화) → "결과 공유" 버튼으로 공유 URL 생성

> 신점 결과 공유: 최종 리딩 완료 시 `saveShinjeomFinalReading`이 `share_token`을 반환하고, SSE done 이벤트에 포함하여 클라이언트에 전달. `/shinjeom/result/[id]` 공유 페이지 및 세션 화면 내 공유 버튼 모두 구현 완료 (PR #377)

---

## 2. 주제(Topic) 목록 — 총 21개

| 구분 | Topic 값 | 한국어 |
|------|---------|--------|
| 타로 | `love` | 연애 (전체) |
| 타로 | `love-single` | 연애 (솔로) |
| 타로 | `love-couple` | 연애 (커플) |
| 타로 | `finance` | 재물 |
| 타로 | `career` | 직업/직장 |
| 타로 | `health` | 건강 |
| 타로 | `general` | 종합 |
| 사주 분석영역 | `saju-general` | 종합운 |
| 사주 분석영역 | `saju-love-single` | 연애운 (솔로) |
| 사주 분석영역 | `saju-love-couple` | 연애운 (커플) |
| 사주 분석영역 | `saju-career` | 직장·재물운 |
| 사주 분석영역 | `saju-health` | 건강운 |
| 사주 분석영역 | `saju-personality` | 성격·적성 |
| 사주 분석영역 | `saju-compatibility` | 궁합 |
| 사주 분석영역 | `saju-auspicious-date` | 택일 |
| 신점 | `shinjeom-general` | 신수 (종합운) |
| 신점 | `shinjeom-love` | 연애/궁합 |
| 신점 | `shinjeom-wealth` | 재물/사업운 |
| 신점 | `shinjeom-career` | 직장/이직 |
| 신점 | `shinjeom-health` | 건강/액막이 |
| 신점 | `shinjeom-auspicious` | 택일 (날짜 선택) |

정본 코드: `src/data/topics.ts` — `TAROT_TOPICS`, `SAJU_TOPICS`, `SHINJEOM_TOPICS`, `ALL_TOPICS`

---

## 3. 사주 시간단위(`SajuTimeRange`) — 7개

`src/types/session.ts` 정의:

| 값 | 한국어 | 월별 상세 토글 |
|----|--------|--------------|
| `this-week` | 이번 주 | ✗ |
| `this-month` | 이번 달 | ✗ |
| `this-year` | 올해 | ✓ |
| `next-year` | 내년 | ✓ |
| `three-year` | 3년 | ✓ |
| `five-year` | 5년 | ✓ |
| `full-fortune` | 전체 대운 | ✗ |

---

## 4. 타로 스프레드 × 주제 노출 규칙

`src/app/(immersive)/tarot/page.tsx`의 `topicSpreads`에서 주제별로 노출할 스프레드를 제한합니다:

| 주제 | 노출 스프레드 |
|------|-------------|
| 연애 (전체) | 원카드, 쓰리카드, 5장 켈틱, 관계 스프레드, 10장 켈틱 |
| 연애 (솔로) | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱 |
| 연애 (커플) | 원카드, 쓰리카드, 관계 스프레드, 10장 켈틱 |
| 직장/진로 | 원카드, 쓰리카드, 5장 켈틱, 말굽, 10장 켈틱 |
| 재정/금전 | 원카드, 쓰리카드, 말굽, 의사결정, 10장 켈틱 |
| 건강 | 원카드, 쓰리카드, 5장 켈틱 |
| 일반 상담 | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱, 한 주 전망, 조디악 휠, 생명의 나무 (7종) |

전체 스프레드 정의: `src/data/spreads/` — 10종

---

## 5. 선호 상담사 자동 선택

- 마이페이지에서 선호 상담사를 설정하면 이후 서비스 진입 시 캐릭터 선택 단계 자동 스킵
- `useFavoriteCharacter(skip)` 훅이 `/api/profile/favorite-character`를 통해 `profiles.favorite_character_id` 조회
- API 라우트가 `getDb()`를 사용하므로 `DB_PROVIDER` 추상화 완전 적용
- 캐릭터 상세 페이지 진입: `?character=xxx` URL 파라미터로 스킵 (타로·사주·신점 모두 지원)
- 홈 직접 접속: `useEffect` fallback으로 자동 선택. `skip=true`이면 fetch 생략

---

## 6. 홈 페이지 구성 (`src/app/(site)/page.tsx`)

7개 섹션을 순서대로 조합:

1. **HeroSection** — 풀스크린 히어로 (캐릭터 + 카피 + CTA + `HeroCardDeck` 11장 팬 카드 덱, 데스크탑 전용)
2. **CharacterGallery** — 12캐릭터 갤러리 (카드형, 성별 필터 내장)
3. **DailyFortune** — 캐릭터별 일일 운세 (5개 영역 1+4 레이아웃, 카드 플립 시 10방향 스파크 버스트)
4. **SkinGallery** — 카드 스킨 갤러리 (아트 스타일 4종 + 팔레트 스킨 6종 = 10종)
5. **ServiceFlow** — 서비스 이용 흐름 소개
6. **FAQ** — 아코디언 FAQ
7. **BottomCTA** — 하단 행동 유도

> `GenderFilterToggle` 컴포넌트는 `components/home/GenderFilter.tsx`에 정의되며 `CharacterGallery.tsx`에서 import해 사용

## 다국어(i18n) 인프라

3개 locale (`ko`/`en`/`ja`) 지원. middleware → cookie → SSR layout → LocaleProvider → useT 흐름. 상세는 [`i18n.md`](i18n.md).

```
Request → middleware (locale 결정 + x-locale 헤더 부착)
            ↓
       SSR layout: cookies() → <html lang>
            ↓
       LocaleProvider (setTimeout 패턴)
            ↓
       useT() / t(key, locale) → translations/{ko,en,ja}
```

ko가 SSOT, en/ja는 부분 번역 허용 (Partial<SharedKeys> + ko fallback).
