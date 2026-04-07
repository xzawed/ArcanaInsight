# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로·사주 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 프로젝트 개요

ArcanaInsight는 애니메이션 캐릭터와 상담하듯 대화하며 타로 카드를 선택하거나 사주 정보를 입력하면, Grok AI가 해석을 제공하는 웹 애플리케이션입니다. 타로·사주·신점 3개 서비스를 운영 중이며, 오늘의 운세 등 추가 확장 가능한 모듈 구조입니다.

> **선호 상담사 자동 선택**: 마이페이지에서 선호 상담사를 설정하면, 이후 타로·사주·신점 진입 시 character-select 단계를 자동으로 스킵합니다. 캐릭터 상세 페이지는 `?character=xxx` URL 파라미터로 이동하며, 홈 등 직접 접속 시에는 `useFavoriteCharacter` 훅이 Supabase에서 조회 후 fallback 처리합니다.

### 서비스 흐름

#### 타로 (4단계)
1. **캐릭터 선택** → 12명의 캐릭터 중 상담사 선택 (성별 필터 지원)
2. **개인정보 입력** → 생년월일, 출생시간(12시진), 성별, 혈액형 + 제3자 제공 동의
3. **주제 선택 + 카드 뽑기** → 주제 선택 후 카드 선택
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 제공 → 결과 공유

#### 사주 (4단계)
1. **캐릭터 선택** → 12명의 캐릭터 중 상담사 선택 (성별 필터 지원)
2. **개인정보 입력** → 생년월일, 출생시간(12시진), 성별, 혈액형 + 제3자 제공 동의
3. **시간단위 × 분석영역 선택** → 시간단위(7) + 분석영역(8) 동시 선택, 년단위 시 "월별 상세" 토글 옵션
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 제공 → 결과 공유

#### 신점 (3단계)
1. **캐릭터 선택** → 12명의 캐릭터 중 상담사 선택 (성별 필터 지원)
2. **주제 선택** → 신수(종합운), 연애/궁합, 재물/사업운, 직장/이직, 건강/액막이, 택일
3. **대화형 상담** → 무제한 문답 (고민 입력 → AI 질문/공감 반복) → "신점 결과 받기" 버튼으로 종료 → 최종 신점 결과 (1턴 이상 후 버튼 활성화)

#### 주제(Topic) 목록 — 총 21개

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

#### 사주 시간단위(`SajuTimeRange`) — 7개 (`src/types/session.ts`)

| 값 | 한국어 | 월별 상세 토글 |
|----|--------|--------------|
| `this-week` | 이번 주 | ✗ |
| `this-month` | 이번 달 | ✗ |
| `this-year` | 올해 | ✓ |
| `next-year` | 내년 | ✓ |
| `three-year` | 3년 | ✓ |
| `five-year` | 5년 | ✓ |
| `full-fortune` | 전체 대운 | ✗ |

## 기술 스택

- **언어**: TypeScript (strict)
- **프레임워크**: Next.js 16.2.1 (App Router) / React 19.2.4
- **스타일링**: Tailwind CSS v4 (CSS-based `@theme` config)
- **애니메이션**: Framer Motion v12.38
- **AI**: Grok API (xAI) 우선 + Claude API (Anthropic) 자동 fallback — `src/services/core/fallback-provider.ts`에서 관리
- **인증**: Supabase Auth Helpers (구글)
- **데이터베이스**: Supabase (PostgreSQL)
- **상태관리**: Zustand v5.0
- **패키지 매니저**: pnpm 10.33.0
- **E2E 테스트**: Playwright (Chromium + WebKit, 3개 디바이스 프로필)
- **런타임**: Node.js >= 20
- **CI/CD**: GitHub Actions → Railway 자동 배포
- **호스팅**: Railway

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지 & API
│   ├── api/
│   │   ├── daily-card/         # 캐릭터별 일일 카드 API (Grok AI + Supabase 캐시)
│   │   ├── profile/
│   │   │   └── favorite-character/ # 선호 상담사 설정 API (POST)
│   │   ├── saju/               # 사주 API 라우트 (session, reading SSE, result/[id])
│   │   ├── shinjeom/           # 신점 API 라우트 (session, message SSE)
│   │   └── tarot/              # 타로 API 라우트 (session, reading SSE, result/[id])
│   ├── auth/                   # 로그인, OAuth 콜백
│   ├── character/[id]/         # 캐릭터 상세 페이지
│   ├── mypage/                 # 리딩 히스토리, 대시보드, 선호 상담사 설정 (FavoriteCharacterSelector.tsx)
│   ├── privacy/                # 개인정보처리방침
│   ├── saju/                   # 사주 메인 페이지, 세션, 결과(/result/[id])
│   │   ├── session/
│   │   └── result/[id]/
│   ├── shinjeom/               # 신점 메인 페이지 (캐릭터+주제 선택), 세션 (대화형)
│   │   └── session/            # ⚠️ 신점 결과 공유 페이지(/result/[id]) 미구현 — mypage에서 링크 비활성화
│   ├── settings/               # 통합 설정 페이지
│   ├── tarot/                  # 타로 주제 선택, 상담 세션, 결과(/result/[id])
│   │   ├── session/
│   │   └── result/[id]/
│   ├── terms/                  # 이용약관
│   ├── page.tsx                # 홈 페이지 (7개 섹션)
│   ├── layout.tsx              # 루트 레이아웃
│   └── globals.css             # Tailwind v4 @theme 정의
├── components/
│   ├── card/                   # CardBack, CardDeck, CardFace, CardItem, CardSpread
│   ├── character/              # CharacterCard, CharacterDisplay, SpriteAnimator, TypingDialogue
│   ├── chat/                   # ChatBubble, DialogueBox
│   ├── effects/                # ParticleOverlay (배경 파티클), ScrollReveal (스크롤 페이드인)
│   ├── home/                   # HeroSection, CharacterGallery, ServiceFlow, DailyCard,
│   │                           # GenderFilter, SkinGallery, ReviewCarousel, StatsCounter, FAQ, BottomCTA
│   ├── layout/                 # Header (스크롤/드롭다운), Footer, MobileNav (5탭), ThemeProvider, FocusReset
│   ├── common/                 # UserInfoForm (개인정보 입력), PrivacyConsentModal (동의), ReadingText (단락 분리 렌더링)
│   ├── saju/                   # SajuChart, OhaengGraph, DaeunTimeline
│   ├── skin/                   # SkinSelector
│   └── tarot/                  # (현재 비어있음 — 타로 전용 컴포넌트는 card/, components/home/ 등에 분산)
├── data/
│   ├── cards/                  # 메이저 22장 (major-arcana.ts) + 마이너 56장 (minor-arcana.ts) + symbols.ts
│   ├── characters/             # 12캐릭터 설정 (index.ts), 대기 대사 (waiting-lines.ts)
│   ├── home/                   # faq.ts, reviews.ts, stats.ts (홈 페이지 정적 데이터)
│   ├── saju/                   # constants.ts (천간·지지·오행 상수), categories.ts (시간단위 7개+분석영역 8개)
│   ├── skins/                  # index.ts (6종 스킨 정의)
│   ├── spreads/                # 스프레드 10종 정의 (원카드~생명의 나무)
│   └── birth-hours.ts          # 12시진 데이터
├── hooks/                      # Zustand 스토어 + 공통 훅
│   ├── useCardAnimation.ts     # 카드 애니메이션 상태
│   ├── useCharacter.ts         # 캐릭터 선택 상태
│   ├── useFavoriteCharacter.ts # 선호 상담사 조회 훅 (Supabase, skip 파라미터로 fetch 생략 가능)
│   ├── useGenderStore.ts       # 성별 필터 상태
│   ├── useSajuSession.ts       # 사주 세션 상태
│   ├── useSession.ts           # 타로 세션 상태
│   ├── useShinjeomSession.ts   # 신점 세션 상태 (대화형)
│   ├── useSkinStore.ts         # 카드 스킨 선택 상태 (persist)
│   ├── useSSEStream.ts         # SSE 스트림 공통 유틸
│   └── useTheme.ts             # 동적 테마 (7종, 시간/계절 자동 감지)
├── lib/supabase/               # Supabase 클라이언트 (client.ts, server.ts, middleware.ts, storage.ts)
├── services/
│   ├── core/                   # ai-provider.ts (re-export), grok-provider.ts (Grok API),
│   │                           # claude-provider.ts (Claude API fallback),
│   │                           # fallback-provider.ts (Grok→Claude 자동 전환),
│   │                           # prompt-builder.ts, text-cleaner.ts
│   ├── saju/                   # saju-service.ts, saju-calculator.ts, saju-types.ts
│   ├── shinjeom/               # shinjeom-service.ts (무제한 대화형, isFinalTurn 플래그로 결과 요청)
│   └── tarot/                  # tarot-service.ts, deck-manager.ts, spread-resolver.ts
└── types/                      # card.ts, character.ts, session.ts, service.ts, user-info.ts

public/images/
├── backgrounds/                # 페이지별 배경 이미지 (hero-bg, session-bg, result-bg 등)
├── cards/
│   ├── major/                  # 메이저 아르카나 22장 SVG (00-fool ~ 21-world)
│   ├── cups/wands/swords/pentacles/  # 마이너 아르카나 슈트별 SVG
│   └── card-back.svg           # 카드 뒷면
└── characters/
    ├── arcana/                 # nukki/ PNG 사용 + sprites/
    ├── miko/                   # JPG 루트 경로 사용 (레거시)
    ├── seonhwa/                # JPG 루트 경로 사용 (레거시)
    ├── hoshi/                  # nukki/ PNG 사용
    ├── luna/                   # nukki/ PNG 사용
    ├── rei/                    # 위와 동일
    ├── cairn/
    ├── zero/
    ├── haru/
    ├── ren/
    ├── lix/
    └── ethan/

scripts/                        # 유틸리티 스크립트
├── pre-push-checks.sh          # git push 전 자동 검증 (tsc + lint + build)
├── generate-characters.ts      # 캐릭터 메타데이터 생성
├── generate-backgrounds.ts     # 배경 이미지 생성
├── generate-card-images.ts     # 카드 이미지 생성
├── generate-character-images.mjs        # 캐릭터 이미지 생성 (구버전)
├── generate-character-images-v2.mjs     # 캐릭터 이미지 생성 (신버전, 신규 캐릭터용)
├── generate-nukki-images.mjs   # 누끼(배경제거) 이미지 생성
├── generate-placeholders.sh    # 플레이스홀더 이미지 생성
├── generate-skin-images.ts     # 카드 스킨 이미지 생성 (Grok 이미지 API)
├── regenerate-all-nukki.mjs    # 전체 캐릭터 누끼 재생성
└── upload-skin-images.ts       # 생성된 스킨 이미지를 Supabase Storage에 업로드

e2e/                            # Playwright E2E 테스트 (19개 파일, 3개 디바이스)
├── home.spec.ts                # 홈 페이지 섹션 검증
├── tarot-flow.spec.ts          # 타로 풀 플로우
├── saju-flow.spec.ts           # 사주 풀 플로우
├── shinjeom-flow.spec.ts       # 신점 풀 플로우 (무제한 대화형, 결과 받기 버튼 검증)
├── ai-response-rendering.spec.ts # AI 응답 렌더링 — 신점/타로/사주 결과 JSON 미노출 검증
├── character.spec.ts           # 캐릭터 상세 (12캐릭터)
├── auth.spec.ts                # 로그인 페이지
├── auth-session.spec.ts        # 인증 상태 테스트 (Supabase 로그인)
├── settings.spec.ts            # 설정 페이지 5개 섹션
├── navigation.spec.ts          # Header/Footer/MobileNav 링크 + 테마
├── daily-card.spec.ts          # 오늘의 카드 탭 전환
├── form-validation.spec.ts     # 폼 유효성 + 설정 교차 반영
├── ui-quality.spec.ts          # JSON 잔여물, 콘솔 에러, 레이아웃 깨짐
├── api-error-handling.spec.ts  # API 에러 mock (500/400/429/504)
├── result-pages.spec.ts        # 결과 공유 페이지 404
├── mypage.spec.ts              # 마이페이지 리디렉트
├── static-pages.spec.ts        # 약관/개인정보
├── responsive.spec.ts          # 반응형 레이아웃 (3 뷰포트)
└── cross-platform.spec.ts      # 크로스 플랫폼 (콘솔 에러, 이미지, 링크)

supabase/migrations/            # DB 마이그레이션 파일 (번호 순서 유지, 002는 미사용)
├── 001_initial_schema.sql      # 초기 스키마 (sessions, readings 등)
├── 003_daily_cards.sql         # daily_cards 테이블 + profiles.favorite_character_id
├── 004_user_info.sql           # 사용자 정보 (생년월일, 성별, 혈액형 등)
├── 005_session_character_and_topics.sql # sessions 테이블 캐릭터/토픽 확장
├── 006_saju_readings.sql       # saju_readings 테이블 (사주 서비스)
├── 007_skin_selection.sql      # 스킨 선택 관련 컬럼
├── 008_shinjeom.sql            # 신점 테이블 (shinjeom_messages, shinjeom_readings)
└── 009_shinjeom_topics_expand.sql # 신점 직장/이직 + 택일 토픽 확장
```

## 캐릭터 시스템

12명의 캐릭터, 각자 다른 성격과 말투로 모든 운세 서비스 제공 가능:

| ID | 이름 | 성별 | 말투 | 특기 |
|---|---|---|---|---|
| `arcana` | 아르카나 | 여 | ~네요/~해요, 신비로운 톤 | 직관적·감성 리딩 |
| `miko` | 미코 | 여 | ~입니다/~합니다, 엄숙한 톤 | 영적·깊이 있는 해석 |
| `seonhwa` | 선화 | 여 | ~세요/~랍니다, 우아한 톤 | 지혜로운 동양적 해석 |
| `hoshi` | 호시 | 여 | ~야/~지, 반말+이모지 | 밝고 캐주얼 리딩 |
| `luna` | 루나 | 여 | ~요/~네요, 다정·신비로운 톤 | 포근한 힐링 리딩 |
| `rei` | 레이 | 여 | ~야/~지, 건조하고 핵심적인 톤 | 냉철한 분석 리딩 |
| `cairn` | 카이른 | 남 | ~습니다/~ㅂ니다, 격식 있는 톤 | 우아한 젠틀 리딩 |
| `zero` | 제로 | 남 | ~다/~지, 시적인 저음 톤 | 어둡고 로맨틱 리딩 |
| `haru` | 하루 | 남 | ~요/~세요, 친근하고 따뜻한 톤 | 응원하는 힐링 리딩 |
| `ren` | 렌 | 남 | ~오/~하오, 고풍스러운 문어체 | 고요한 선인 리딩 |
| `lix` | 릭스 | 남 | ~는데/~ㄹ까, 장난스러운 톤 | 위트 있는 트릭스터 리딩 |
| `ethan` | 에단 | 남 | ~요/~거든요, 상세하고 친절한 톤 | 학구적 분석 리딩 |

각 캐릭터는 6가지 표정(Mood): `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`

### 세션 중 캐릭터 표정 규칙

캐릭터는 부수적 요소이므로 표정 변경을 최소화하여 타로·사주 콘텐츠에 집중시킨다. 타로/사주 세션 모두 동일하게 **3단계만** 사용:

| 장면 | 표정 | 설명 |
|------|------|------|
| 세션 진입 + 카드 선택 대기 | `default` | 차분한 기본 표정 |
| 카드 선택 순간 + 리딩/분석 대기 | `mystical` | 신비로운 톤, 카드를 읽는 느낌 |
| 결과 도착 | `smile` | 따뜻한 미소로 결과 전달 |

- 에러 발생 시에는 `default`로 복귀
- 대기 대사 중에도 표정을 변경하지 않음 (`mystical` 유지)

### 캐릭터 이미지 경로 규칙

- **10캐릭터** (arcana, hoshi, luna, rei, cairn, zero, haru, ren, lix, ethan): PNG 누끼, `nukki/` 폴더 경로 (1408×768 통일)
  - 예: `/images/characters/arcana/nukki/default.png`
  - 예: `/images/characters/luna/nukki/default.png`
- **2캐릭터** (miko, seonhwa): JPG 루트 경로 (레거시, 코드에서 직접 참조)
  - 예: `/images/characters/miko/default.jpg`

### 주제별 스프레드 노출 규칙

카테고리 성격에 맞는 스프레드만 UI에 노출 (`src/app/tarot/page.tsx`의 `topicSpreads`):

| 주제 | 노출 스프레드 |
|------|-------------|
| 연애 (솔로) | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱 |
| 연애 (커플) | 원카드, 쓰리카드, 관계 스프레드, 10장 켈틱 |
| 직장/진로 | 원카드, 쓰리카드, 5장 켈틱, 말굽, 10장 켈틱 |
| 재정/금전 | 원카드, 쓰리카드, 말굽, 의사결정, 10장 켈틱 |
| 건강 | 원카드, 쓰리카드, 5장 켈틱 |
| 일반 상담 | 원카드, 쓰리카드, 5장 켈틱, 10장 켈틱, 한 주 전망, 조디악 휠, 생명의 나무 (7종) |

## 핵심 아키텍처 패턴

- **선호 상담사 자동 선택 패턴**: `useFavoriteCharacter(skip)` 훅이 Supabase에서 `profiles.favorite_character_id` 조회. 캐릭터 상세 페이지 진입 시 `?character=xxx` URL 파라미터로 character-select 스킵(타로·사주·신점 모두 지원). 홈 직접 접속 시에는 `useEffect` fallback으로 자동 선택. `skip=true`이면 fetch 생략.
- **DivinationService 인터페이스**: 모든 운세 서비스는 이 인터페이스를 구현. 새 서비스 추가 = 구현체 + 프롬프트 + API 라우트 + 페이지
- **AIProvider 추상화 + Fallback**: `FallbackProvider`가 Grok API 우선 호출 → 실패 시 Claude API로 자동 전환. `ANTHROPIC_API_KEY` 미설정 시 Grok 단독 사용
  - 429 Rate Limit: Retry-After 기반 쿨다운 (기본 30초)
  - 500 서버 에러 / 네트워크: 5분 쿨다운
  - 401/403 인증 실패: 30분 쿨다운 (재시도 불가)
  - Grok + Claude 둘 다 실패: "AI 서비스가 일시적으로 사용할 수 없습니다" 메시지
- **SSE 스트리밍**: `/api/tarot/reading`, `/api/saju/reading`, `/api/daily-card`에서 AI 응답을 SSE로 클라이언트에 스트리밍
- **Tailwind v4**: CSS `@theme` 블록(`globals.css`)에서 커스텀 컬러 정의 (`arcana-*` 계열)
- **Path alias**: `@/*` → `./src/*` (tsconfig.json)
- **동적 테마**: `useTheme.ts`에서 사용자 로컬 시간/계절 기반으로 7종 테마 자동 감지

## 코딩 컨벤션

### 일반 규칙

- 한국어 주석 및 커밋 메시지 사용
- 함수/변수명은 영어 camelCase
- 컴포넌트명은 PascalCase
- 파일명은 kebab-case (컴포넌트 파일은 PascalCase)

### TypeScript

- `any` 타입 사용 금지, 명시적 타입 정의
- interface 우선 사용 (type alias는 유니온/인터섹션에만)
- strict 모드 활성화

### React/Next.js

- 서버 컴포넌트를 기본으로 사용, 클라이언트 컴포넌트는 필요한 경우에만 `'use client'` 명시
- 컴포넌트는 named export 사용
- Props는 interface로 정의

### 스타일링

- Tailwind CSS 유틸리티 클래스 우선
- 복잡한 애니메이션은 Framer Motion 사용
- 다크 모드가 기본 테마 (점술/타로의 신비로운 분위기)
- 커스텀 컬러: `arcana-bg`, `arcana-surface`, `arcana-card`, `arcana-border`, `arcana-purple`, `arcana-indigo`, `arcana-gold`, `arcana-text`, `arcana-muted`

### 이미지 리소스

- 캐릭터 이미지: 10캐릭터 PNG 누끼(nukki/ 폴더), 2캐릭터(miko/seonhwa) JPG 루트 경로, 1408×768
- 카드 이미지: SVG
- 배경 이미지: JPG
- **아이콘 이미지**: `public/images/icons/` — PNG RGBA (투명 배경). BFS 플러드 필로 어두운 배경 제거 + 콘텐츠 영역 크롭 처리됨. 새 아이콘 추가 시 동일하게 처리 필요
- 새 이미지 생성 시 `scripts/` 디렉토리의 생성 스크립트 활용
  - 신규 캐릭터: `scripts/generate-character-images-v2.mjs`
  - 스킨 이미지: `scripts/generate-skin-images.ts` → `scripts/upload-skin-images.ts`

## 명령어

```bash
pnpm dev              # 개발 서버 실행
pnpm build            # 프로덕션 빌드
pnpm start            # 프로덕션 서버 실행
pnpm lint             # ESLint 실행
pnpm type-check       # TypeScript 타입 체크 (tsc --noEmit)
pnpm test:e2e         # Playwright E2E 테스트 (3개 디바이스) — Windows는 아래 Docker 방식 사용
pnpm test:e2e:ui      # Playwright UI 모드 (시각적 디버깅)
```

### E2E 로컬 실행 — Windows (Docker 필수)

Windows 환경에서는 Claude Code Bash 세션이 Playwright 브라우저 프로세스 stdout을 캡처하지 못하므로, Docker(Linux 컨테이너)로 실행해야 한다.

```bash
docker run --rm \
  -v "D:/Source/ArcanaInsight/src:/work/src:ro" \
  -v "D:/Source/ArcanaInsight/public:/work/public:ro" \
  -v "D:/Source/ArcanaInsight/e2e:/work/e2e:ro" \
  -v "D:/Source/ArcanaInsight/package.json:/work/package.json:ro" \
  -v "D:/Source/ArcanaInsight/pnpm-lock.yaml:/work/pnpm-lock.yaml:ro" \
  -v "D:/Source/ArcanaInsight/tsconfig.json:/work/tsconfig.json:ro" \
  -v "D:/Source/ArcanaInsight/next.config.ts:/work/next.config.ts:ro" \
  -v "D:/Source/ArcanaInsight/postcss.config.mjs:/work/postcss.config.mjs:ro" \
  -v "D:/Source/ArcanaInsight/playwright.config.ts:/work/playwright.config.ts:ro" \
  -v "D:/Source/ArcanaInsight/.env.local:/work/.env.local:ro" \
  -w //work \
  -e NEXT_TELEMETRY_DISABLED=1 \
  mcr.microsoft.com/playwright:v1.59.1-noble \
  bash -c '
    corepack enable && corepack prepare pnpm@10.33.0 --activate 2>/dev/null &&
    pnpm install --frozen-lockfile &&
    pnpm build &&
    npx next start -p 3000 &
    for i in $(seq 1 20); do curl -s http://localhost:3000 >/dev/null 2>&1 && break; sleep 1; done &&
    npx playwright test --project="Desktop Chrome" --reporter=list 2>&1
  '
```

> **주의**: Docker 실행 후 `node_modules`가 Linux 바이너리로 교체되므로, 이후 `rm -rf node_modules && pnpm install` 필수

## 환경 변수

```
GROK_API_KEY=               # xAI Grok API 키 (1순위 AI)
GROK_MODEL=grok-3           # 텍스트 생성 모델
ANTHROPIC_API_KEY=          # Anthropic Claude API 키 (Grok 장애 시 자동 fallback)
NEXT_PUBLIC_SUPABASE_URL=   # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY=  # Supabase 서비스 키 (서버 전용)
NEXT_PUBLIC_SITE_URL=       # 사이트 URL
```

## Git 브랜치 전략

- `main`: 프로덕션 브랜치 (Railway 자동 배포 트리거, `master` 미사용)
- `feat/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치
- `docs/*`: 문서 변경 브랜치
- `chore/*`: 설정/정리 브랜치

### 브랜치 일괄 정리 명령어

```bash
# 원격 브랜치 전체 삭제 (main 제외) — sed 앞 공백 2개 주의
git branch -r | grep -v 'origin/main' | grep -v 'origin/HEAD' | sed 's|  origin/||' | xargs -I{} git push origin --delete {}

# 로컬 브랜치 전체 삭제 (main 제외)
git branch | grep -v '^\* main' | xargs git branch -D
```

## CI/CD 파이프라인

### GitHub Actions 무료 플랜 운영 정책

- GitHub Free 플랜: **월 2,000분** 한도
- 무료 시간 소진 시: CI 자동 차단 → **로컬 검증(type-check + lint + build)으로 대체** → 다음 달 1일에 자동 복구
- 예상 월간 사용: ~100분 (한도의 5%)

### PR CI (`.github/workflows/deploy.yml`)

- **PR → main 시에만** 실행, 문서 변경(*.md, docs/, n8n/) 시 스킵
- **1개 job으로 통합** (runner 1회, pnpm install 1회 — 시간 절약):
  1. Lint + Type Check
  2. Build
  3. E2E (Chromium만 — Desktop Chrome + Mobile Android)
- iOS E2E(WebKit)는 **주간 QA(토요일)에서만** 수행 — Chromium만 설치하여 시간 절약
- Railway 배포는 별도 GitHub 연동이 담당

### 주간 QA (`.github/workflows/weekly-qa.yml`)

- **매주 토요일 오전 9시 (KST)** 자동 실행 + `workflow_dispatch`로 수동 실행 가능
- 4개 job 병렬: quality-check → e2e-desktop / e2e-mobile-android / e2e-mobile-ios
- 디바이스별 Playwright 리포트 30일 보존
- **실패 시**: 자동 GitHub Issue 생성 (실패 job 목록 + 로그 링크 + 수정 프로세스 안내)
- **통과 시**: 열린 QA Issue 자동 닫기 + 검증 결과 코멘트

### QA 자동 재검증 (`.github/workflows/qa-recheck.yml`)

- QA 실패 Issue(`🚨 주간 QA 실패`)가 열려있는 상태에서 main에 코드 push 시 자동으로 주간 QA 재실행
- 문서만 변경된 push(*.md, docs/, n8n/)는 스킵 (Actions 시간 절약)
- 재실행 → 전체 통과 시 → QA Issue 자동 닫힘 (완전 자동 루프)

### QA 프로세스 전체 흐름

```
주간 QA 실행 (토요일 09:00)
  ├─ 통과 → 열린 QA Issue 자동 닫기 → 끝
  └─ 실패 → Issue 자동 생성 (실패 상세 + 수정 안내)
       └─ fix/* 브랜치 수정 → PR CI 통과 → main 머지
            └─ QA Issue 열림 감지 → 주간 QA 자동 재실행
                 ├─ 통과 → Issue 자동 닫기 → 끝
                 └─ 실패 → Issue 업데이트 → 수정 반복
```

### 브랜치 보호 규칙 (GitHub Settings에서 수동 설정 필요)

- `main` 브랜치에 **branch protection rule** 적용
- **Required status checks**: `Lint & Type Check`, `Build`, `E2E Tests` 통과 필수
- CI 실패 시 main 머지 자체가 차단되어 Railway 배포도 자동으로 방어됨

### Railway 설정

- `railway.toml`에 빌드/배포 설정 정의 (nixpacks 빌더)
- GitHub Secrets 필요:
  - `RAILWAY_TOKEN`: Railway API 토큰
  - `RAILWAY_SERVICE_ID`: Railway 서비스 ID

## 코드 변경 프로세스 (필수 준수)

모든 코드 변경은 **7단계 프로세스**를 따른다. 진입점은 항상 **Claude CLI에 대한 사용자의 직접 지시**이며, Claude CLI가 기획/구현/검토를 모두 수행한다.

### 1단계: 코드 변경
- 사용자가 Claude CLI에 직접 지시 → Claude CLI가 기획 + 구현
- `fix/*`, `feat/*`, `docs/*` 기능 브랜치에서 수정 (main 직접 push 금지)

### 2단계: 로컬 검증
```bash
pnpm type-check        # TypeScript 타입 체크
pnpm lint              # ESLint 코드 품질 검사
pnpm build             # 프로덕션 빌드 확인
```
- 3가지 모두 통과해야 다음 단계로 진행

### 3단계: 변경 사항 리뷰
- Claude CLI가 자체 검토: 스펙 준수, 코드 품질, 레이아웃 규칙 점검

### 4단계: 커밋 + PR 생성
- 의미 있는 커밋 메시지 작성
- `git push` → **PR 생성** (main 브랜치 대상)
- Claude Code 전용: PreToolUse 훅이 `scripts/pre-push-checks.sh` 자동 실행

### 5단계: CI 자동 검증 (PR → main)
- GitHub Actions 자동 실행: `lint → build → e2e` (Chromium)
- CI 실패 → 1단계로 복귀
- CI 통과 → 6단계로 진행

### 6단계: 머지 + 자동 배포 + QA 재검증
- PR 머지 → main push → Railway 자동 배포
- QA 실패 Issue가 열려있으면 자동 재검증 트리거 (`qa-recheck.yml`)
- 재검증 통과 시 QA Issue 자동 닫힘

### 7단계: CLAUDE.md 최신화 + 최적화 ✅ (필수)

> **모든 작업 완료 후 반드시 수행한다. 예외 없음.**

머지 완료 후 CLAUDE.md를 업데이트하고 main에 직접 커밋한다:

**최신화 항목 (구현 내용 반영)**
- 신규 파일/컴포넌트/훅/API 라우트 → 프로젝트 구조 트리에 추가
- 신규 아키텍처 패턴 → 핵심 아키텍처 패턴 섹션에 추가
- 미구현/제거된 기능 → 관련 설명 수정 또는 주의사항(`⚠️`) 표기
- DB 마이그레이션 추가 시 → migrations 목록 업데이트

**최적화 항목 (문서 품질 개선)**
- 오래된 설명, 중복 정보, 부정확한 현황 정리
- 구조 가독성 개선 (섹션 순서, 표현 명확화)
- 단, 기존 섹션 구조·규칙은 최대한 보존

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 최신화 — [작업 내용 한 줄 요약]"
git push origin main
```

### 전체 흐름도

```
사용자 → Claude CLI (직접 지시)
  └─ 1단계: 코드 변경 (기획 + 구현)
       └─ 2단계: 로컬 검증 (type-check + lint + build)
            ├─ 실패 → 수정 → 재검증 반복
            └─ 통과 → 3단계: 리뷰
                 └─ 4단계: 커밋 + PR 생성
                      └─ 5단계: CI 자동 검증
                           ├─ 실패 → 1단계로 복귀
                           └─ 통과 → 6단계: 머지 + 배포 + QA 재검증
                                └─ 7단계: CLAUDE.md 최신화 + 최적화 (필수)
```

### 자동화 (Claude Code 전용)
- `.claude/settings.json`의 PreToolUse 훅으로 `git push` 시 자동 검증
- `scripts/pre-push-checks.sh` 실행: type-check → lint → build 순서
- 하나라도 실패하면 push 차단

## 레이아웃 규칙 (필수 준수)

캐릭터가 등장하는 모든 페이지에서 반드시 지켜야 하는 공통 레이아웃 규칙:

- **데스크탑(md 이상)**: 좌측 캐릭터 `md:w-1/2` + 우측 콘텐츠 `md:w-1/2` — 가로 5:5 비율 flex 레이아웃
- **모바일(md 미만)**: `flex-col` 세로 배치 — 캐릭터 → 콘텐츠 순서
- **캐릭터 이미지 블렌딩**: CSS mask로 투명도 그라디언트를 적용하여 배경과 자연스럽게 블렌딩
  - 아래 표준값을 **반드시 그대로** 사용할 것 (수치 임의 변경 금지):
    ```
    top:         transparent 0% → black 14%
    bottom:      transparent 0% → black 18%
    left / right: transparent 0% → black 10%
    ```
  - 구현 패턴 (`CharacterDisplay.tsx` 기준):
    ```tsx
    style={{
      WebkitMaskImage: [
        "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
        "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
        "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
        "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
      ].join(", "),
      WebkitMaskComposite: "destination-in, destination-in, destination-in",
      maskImage: "...(동일)",
      maskComposite: "intersect, intersect, intersect",
    }}
    ```
  - `CharacterDisplay`를 사용하면 자동 적용됨. 직접 `<Image>`를 쓸 때는 이 스타일을 래퍼 div에 직접 적용
- **컴포넌트**: `CharacterDisplay` + `TypingDialogue` 조합 사용
- 이 규칙은 타로/사주 주제 선택 페이지, 세션 페이지, 결과 페이지, 캐릭터 상세 페이지, 향후 추가되는 모든 캐릭터 등장 페이지에 동일 적용

## 크로스 플랫폼 품질 규칙 (필수 준수)

모든 UI 변경 시 데스크탑(Chrome), 모바일(iOS Safari, Android Chrome) 동일 품질을 보장해야 합니다.

### 뷰포트 높이

- **`100vh` 사용 금지** — iOS Safari에서 주소창/하단바 포함 높이로 계산되어 콘텐츠가 가려짐
- **`100dvh`(Dynamic Viewport Height) 사용** — 실제 보이는 영역에 정확히 맞춤
- 패턴: `h-[calc(100dvh-7rem)]` (모바일) / `md:h-[calc(100dvh-3.5rem)]` (데스크탑)
- `min-h-screen`은 페이지 전체 최소 높이 용도로만 허용

### Safe Area (노치/홈바 대응)

- `layout.tsx`에 `viewport: { viewportFit: "cover" }` 설정 유지
- `globals.css`에 `body { padding-top: env(safe-area-inset-top) }` 유지
- **하단 고정 요소**(MobileNav 등)는 반드시 `pb-[env(safe-area-inset-bottom)]` 적용
- 새로운 `position: fixed` bottom 요소 추가 시 safe area 패딩 필수

### 터치 인터랙션

- `-webkit-tap-highlight-color: transparent` 전역 적용 유지 (globals.css)
- 버튼/링크/입력에 `touch-action: manipulation` 전역 적용 유지 (더블탭 줌 방지)
- `overflow-x: clip` 사용 (`hidden` 대신 — iOS 스크롤 바운스 호환)

### 포커스 관리

- `:focus { outline: none }` + `:focus-visible { outline: ... }` 유지 — 마우스/터치는 포커스 숨김, 키보드만 표시
- 페이지 전환 시 `FocusReset` 컴포넌트가 자동으로 포커스 해제 + 스크롤 초기화
- `<Link>`, `<button>` 클릭 후 포커스가 남는 문제 → CSS 전역 처리로 해결됨

### 스크롤 컨테이너

- `overflow-y-auto` 사용 시 `-webkit-overflow-scrolling: touch` 자동 적용 (globals.css)
- 내부 스크롤 컨테이너는 `FocusReset`이 페이지 전환 시 `scrollTop = 0` 자동 초기화

### 폼 입력 (iOS 대응)

- `input[type="date"]` — iOS Safari 네이티브 피커 호환, 텍스트 좌측 정렬 유지
- `<select>` — `appearance-none` 사용 시 반드시 커스텀 화살표 아이콘(▼) 추가
- 키보드가 올라올 때 `position: fixed` 요소 주의 — 입력 폼이 가려지지 않도록 확인

### 프레임 크기 통일

- 캐릭터 등장 페이지의 모바일 캐릭터 영역: **`h-[25%]`** 통일
- 콘텐츠 영역: **`overflow-y-auto`** 필수 (뷰포트 내 스크롤 보장)
- 모든 스텝/페이지에서 동일한 높이 계산식 사용

## 홈 페이지 구성

`src/app/page.tsx`에서 7개 섹션을 순서대로 조합:

1. **HeroSection** — 풀스크린 히어로 (캐릭터 + 카피 + CTA)
2. **CharacterGallery** — 12캐릭터 갤러리 (카드형, 성별 필터 내장)
3. **DailyCard** — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기 + 공유)
4. **SkinGallery** — 카드 스킨 갤러리 (6종)
5. **ServiceFlow** — 서비스 이용 흐름 소개
6. **FAQ** — 아코디언 FAQ
7. **BottomCTA** — 하단 행동 유도

> 참고: GenderFilter, StatsCounter, ReviewCarousel 컴포넌트는 `components/home/`에 존재하지만 현재 `page.tsx`에서 미사용

## 작업 시 주의사항

- 타로 카드 데이터는 `src/data/` 디렉토리에 정적으로 관리
- 홈 페이지 데이터(후기, FAQ, 통계)는 `src/data/home/`에 정적으로 관리
- 이미지 리소스는 `public/images/`에 저장
- DB 스키마는 `supabase/migrations/`에서 관리 (번호 순서 유지, 002는 결번)
- `main` 브랜치에 직접 push 금지, PR을 통해 머지
- `.env` 파일은 절대 커밋하지 않음 (Railway 환경변수로 관리)
- 캐릭터 이미지 규격: 1408×768 (10캐릭터 PNG 누끼, 2캐릭터 JPG 레거시, grok-imagine-image-pro API 기본 출력 사이즈)

## 운영 체계 — SuperGrok + Claude CLI 역할 분담

### 역할 분담 원칙

| 영역 | SuperGrok (xAI) | Claude CLI (Anthropic) |
|------|-----------------|----------------------|
| **기획/설계/검토** | — | Claude CLI가 자체 수행 (6단계 프로세스) |
| **코드 구현** | — | Claude CLI가 수행 |
| **프로덕션 AI** | Grok API (타로/사주 리딩, SSE 스트리밍) | — |
| **이미지 생성** | Grok 이미지 API (캐릭터, 카드 스킨, 배경) | 생성된 이미지를 코드에 통합 |
| **품질 관리** | — | tsc + lint + build, Playwright E2E, 주간 QA |
| **CI/CD + 배포** | — | GitHub Actions, Railway, 브랜치 보호 |
| **운영 분석** | 사용자 데이터 분석, 리딩 품질 모니터링 | — |
| **문서 관리** | 스펙 확정 시 내용 전달 | CLAUDE.md/README.md 반영 + 코드 동기화 |

### 핵심 연결 지점: CLAUDE.md

두 AI가 협업하는 **단일 진실 소스(Single Source of Truth)**는 이 CLAUDE.md 파일이다.

- **진입점은 항상 Claude CLI**: 사용자가 Claude CLI에 직접 지시
- **Claude CLI**: 기획 + 구현 + 검토 + 배포를 모두 수행
- **Grok API**: 프로덕션 리딩 + 이미지 생성에만 사용 (비용 최적화)

### 워크플로우

```
사용자 → Claude CLI (직접 지시)
  └→ Claude CLI가 기획 → 구현 → 검증 → 리뷰 → PR → 배포 → CLAUDE.md 최신화 (7단계)

자동 운영:
  ├─ 주간 QA (토요일) → 실패 시 자동 수정 루프
  ├─ n8n: spec Issue 감지 → 구현 안내
  └─ n8n: 리딩 통계 모니터링 + 주간 리포트 (Supabase 직접 조회, Grok 미사용)
```

### GitHub Issue 기반 추적 (Phase 2)

- `.github/ISSUE_TEMPLATE/spec.yml` — SuperGrok 스펙 전달 전용 Issue 템플릿
- `.github/ISSUE_TEMPLATE/bug.yml` — 버그 리포트 템플릿
- `spec` 라벨이 붙은 Issue = SuperGrok에서 확정된 기능 스펙

### n8n 자동화 파이프라인 (Phase 3)

워크플로우 JSON 파일 및 상세 가이드: `n8n/README.md`

| 워크플로우 | 파일 | 방식 | 상태 |
|-----------|------|------|------|
| Spec Tracker | `workflow-spec-tracker.json` | GitHub Webhook (실시간) | **n8n Cloud 운영 중** ✅ |
| Quality Monitor | `workflow-quality-monitor.json` | Cron 매일 09:00 | **n8n Cloud 운영 중** ✅ |
| Weekly Report | `workflow-weekly-report.json` | Cron 금요일 18:00 | **n8n Cloud 운영 중** ✅ |

> n8n Cloud: https://xzawed.app.n8n.cloud
> Webhook: `https://xzawed.app.n8n.cloud/webhook/arcana-spec`
> 상세 가이드: `n8n/README.md`
