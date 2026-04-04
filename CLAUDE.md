# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로·사주 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 프로젝트 개요

ArcanaInsight는 애니메이션 캐릭터와 상담하듯 대화하며 타로 카드를 선택하거나 사주 정보를 입력하면, Grok AI가 해석을 제공하는 웹 애플리케이션입니다. 타로와 사주 서비스를 운영 중이며, 신점/오늘의 운세로 확장 가능한 모듈 구조입니다.

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

#### 주제(Topic) 목록 — 총 15개

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
- **프레임워크**: Next.js 16.2 (App Router) / React 19.2
- **스타일링**: Tailwind CSS v4 (CSS-based `@theme` config)
- **애니메이션**: Framer Motion v12
- **AI**: Grok API (xAI) — `src/services/core/grok-provider.ts`에서 추상화
- **인증**: Supabase Auth Helpers (카카오/구글)
- **데이터베이스**: Supabase (PostgreSQL)
- **상태관리**: Zustand v5
- **패키지 매니저**: pnpm 10.33
- **런타임**: Node.js >= 20
- **CI/CD**: GitHub Actions → Railway 자동 배포
- **호스팅**: Railway

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지 & API
│   ├── api/
│   │   ├── daily-card/         # 캐릭터별 일일 카드 API (Grok AI + Supabase 캐시)
│   │   ├── saju/               # 사주 API 라우트 (session, reading SSE, result/[id])
│   │   └── tarot/              # 타로 API 라우트 (session, reading SSE, result/[id])
│   ├── auth/                   # 로그인, OAuth 콜백
│   ├── character/[id]/         # 캐릭터 상세 페이지
│   ├── mypage/                 # 리딩 히스토리, 대시보드
│   ├── privacy/                # 개인정보처리방침
│   ├── saju/                   # 사주 메인 페이지, 세션, 결과(/result/[id])
│   │   ├── session/
│   │   └── result/[id]/
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
│   ├── layout/                 # Header (스크롤/드롭다운), Footer, MobileNav (4탭), ThemeProvider, FocusReset
│   ├── common/                 # UserInfoForm (개인정보 입력), PrivacyConsentModal (동의)
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
├── hooks/                      # Zustand 스토어
│   ├── useCardAnimation.ts     # 카드 애니메이션 상태
│   ├── useCharacter.ts         # 캐릭터 선택 상태
│   ├── useGenderStore.ts       # 성별 필터 상태
│   ├── useSajuSession.ts       # 사주 세션 상태
│   ├── useSession.ts           # 타로 세션 상태
│   ├── useSkinStore.ts         # 카드 스킨 선택 상태 (persist)
│   └── useTheme.ts             # 동적 테마 (7종, 시간/계절 자동 감지)
├── lib/supabase/               # Supabase 클라이언트 (client.ts, server.ts, middleware.ts, storage.ts)
├── services/
│   ├── core/                   # ai-provider.ts (re-export), grok-provider.ts (구현체),
│   │                           # prompt-builder.ts, text-cleaner.ts (cleanReadingText, parseJsonSafe)
│   ├── saju/                   # saju-service.ts, saju-calculator.ts, saju-types.ts
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

supabase/migrations/            # DB 마이그레이션 파일 (번호 순서 유지, 002는 미사용)
├── 001_initial_schema.sql      # 초기 스키마 (sessions, readings 등)
├── 003_daily_cards.sql         # daily_cards 테이블 + profiles.favorite_character_id
├── 004_user_info.sql           # 사용자 정보 (생년월일, 성별, 혈액형 등)
├── 005_session_character_and_topics.sql # sessions 테이블 캐릭터/토픽 확장
├── 006_saju_readings.sql       # saju_readings 테이블 (사주 서비스)
└── 007_skin_selection.sql      # 스킨 선택 관련 컬럼
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

### 캐릭터 이미지 경로 규칙

- **10캐릭터** (arcana, hoshi, luna, rei, cairn, zero, haru, ren, lix, ethan): PNG 누끼, `nukki/` 폴더 경로 (1408×768 통일)
  - 예: `/images/characters/arcana/nukki/default.png`
  - 예: `/images/characters/luna/nukki/default.png`
- **2캐릭터** (miko, seonhwa): JPG 루트 경로 (레거시, 코드에서 직접 참조)
  - 예: `/images/characters/miko/default.jpg`

## 핵심 아키텍처 패턴

- **DivinationService 인터페이스**: 모든 운세 서비스는 이 인터페이스를 구현. 새 서비스 추가 = 구현체 + 프롬프트 + API 라우트 + 페이지
- **AIProvider 추상화**: Grok API를 직접 호출하지 않고 인터페이스 통해 호출. 모델 교체 용이
- **SSE 스트리밍**: `/api/tarot/reading`, `/api/saju/reading`에서 Grok 응답을 SSE로 클라이언트에 스트리밍
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
- 새 이미지 생성 시 `scripts/` 디렉토리의 생성 스크립트 활용
  - 신규 캐릭터: `scripts/generate-character-images-v2.mjs`
  - 스킨 이미지: `scripts/generate-skin-images.ts` → `scripts/upload-skin-images.ts`

## 명령어

```bash
pnpm dev              # 개발 서버 실행
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint 실행
pnpm tsc --noEmit     # TypeScript 타입 체크
```

## 환경 변수

```
GROK_API_KEY=               # xAI Grok API 키
GROK_MODEL=grok-3           # 텍스트 생성 모델
NEXT_PUBLIC_SUPABASE_URL=   # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY=  # Supabase 서비스 키 (서버 전용)
NEXT_PUBLIC_SITE_URL=       # 사이트 URL
```

## Git 브랜치 전략

- `main`/`master`: 프로덕션 브랜치 (Railway 자동 배포 트리거)
- `dev`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

## CI/CD 파이프라인

### GitHub Actions (`.github/workflows/deploy.yml`)

- **PR → main**: lint + type-check + build 검증
- **push → main**: lint + type-check + build + Railway 배포

### Railway 설정

- `railway.toml`에 빌드/배포 설정 정의 (nixpacks 빌더)
- GitHub Secrets 필요:
  - `RAILWAY_TOKEN`: Railway API 토큰
  - `RAILWAY_SERVICE_ID`: Railway 서비스 ID

## 코드 변경 프로세스 (필수 준수)

모든 코드 변경은 반드시 다음 4단계를 일관되게 수행해야 합니다. 단순 수정이라도 예외 없음:

### 1단계: 코드 변경
- 요청된 수정 사항 구현

### 2단계: 3단계 검증 (tsc + lint + build)
```bash
pnpm tsc --noEmit      # TypeScript 타입 체크
pnpm lint              # ESLint 코드 품질 검사
pnpm build             # 프로덕션 빌드 확인
```
- 3가지 모두 통과해야 다음 단계로 진행
- **에러 발생 시**: 원인 파악 → 수정 → 재검증 사이클을 반복하여 3가지 모두 연속 통과 확인

### 3단계: 변경 사항 리뷰
- **스펙 준수 확인**: 요청된 사항이 모두 반영되었는지 확인
- **코드 품질 확인**: 미사용 변수, 불필요한 코드, 기존 패턴과의 일관성 확인
- **레이아웃 규칙 확인**: 아래 레이아웃 규칙 전체 항목 준수 여부 점검

### 4단계: 커밋 + push
- 의미 있는 커밋 메시지 작성
- `git push` 실행 (Claude Code 전용: PreToolUse 훅이 자동으로 `scripts/pre-push-checks.sh` 재실행)

### 자동화 (Claude Code 전용)
- `.claude/settings.json`의 PreToolUse 훅으로 `git push` 시 자동 검증
- `scripts/pre-push-checks.sh` 실행: tsc → lint → build 순서
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
