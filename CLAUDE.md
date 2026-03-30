# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 프로젝트 개요

ArcanaInsight는 애니메이션 캐릭터와 상담하듯 대화하며 타로 카드를 선택하고, Grok AI가 해석을 제공하는 웹 애플리케이션입니다. MVP는 타로 서비스에 집중하며, 사주/신점/오늘의 운세로 확장 가능한 모듈 구조입니다.

### 서비스 흐름 (4단계)

1. **캐릭터 선택** → 4캐릭터 중 상담사 선택 (아르카나/미코/선화/호시)
2. **개인정보 입력** → 생년월일, 출생시간(12시진), 성별, 혈액형 + 3자 제공 동의
3. **주제 선택 + 카드 선택** → 5가지 주제(연애/재물/직업/건강/종합) → 카드 뽑기 (1/3/5장)
4. **AI 리딩 결과** → Grok AI가 SSE 스트리밍으로 해석 제공 → 결과 공유

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
│   │   └── tarot/              # API 라우트 (session, reading SSE, result/[id])
│   ├── auth/                   # 로그인, OAuth 콜백
│   ├── mypage/                 # 리딩 히스토리, 대시보드
│   ├── tarot/                  # 주제 선택, 상담 세션, 결과(/result/[id])
│   ├── page.tsx                # 홈 페이지 (8개 섹션)
│   ├── layout.tsx              # 루트 레이아웃
│   └── globals.css             # Tailwind v4 @theme 정의
├── components/
│   ├── card/                   # CardBack, CardDeck, CardFace, CardItem, CardSpread
│   ├── character/              # CharacterCard, CharacterDisplay, SpriteAnimator, TypingDialogue
│   ├── chat/                   # ChatBubble, DialogueBox
│   ├── effects/                # ParticleOverlay (배경 파티클), ScrollReveal (스크롤 페이드인)
│   ├── home/                   # HeroSection, CharacterGallery, ServiceFlow, DailyCard,
│   │                           # ReviewCarousel, StatsCounter, FAQ, BottomCTA
│   ├── layout/                 # Header (스크롤/드롭다운), Footer, MobileNav (4탭)
│   └── tarot/                  # UserInfoForm (개인정보 입력), PrivacyConsentModal (동의)
├── data/
│   ├── cards/                  # 메이저 22장 (major-arcana.ts) + 마이너 56장 (minor-arcana.ts) + symbols.ts
│   ├── characters/             # 4캐릭터 설정 (index.ts)
│   ├── home/                   # faq.ts, reviews.ts, stats.ts (홈 페이지 정적 데이터)
│   ├── spreads/                # 스프레드 정의 (1/3/5카드)
│   └── birth-hours.ts          # 12시진 데이터
├── hooks/                      # Zustand 스토어 (useSession, useCharacter, useCardAnimation)
├── lib/supabase/               # Supabase 클라이언트 (client.ts, server.ts, middleware.ts)
├── services/
│   ├── core/                   # ai-provider.ts (인터페이스), grok-provider.ts (구현체), prompt-builder.ts
│   └── tarot/                  # tarot-service.ts, deck-manager.ts, spread-resolver.ts
└── types/                      # card.ts, character.ts, session.ts, service.ts

public/images/
├── backgrounds/                # 페이지별 배경 이미지 (hero-bg, session-bg, result-bg 등)
├── cards/
│   ├── major/                  # 메이저 아르카나 22장 SVG (00-fool ~ 21-world)
│   ├── cups/wands/swords/pentacles/  # 마이너 아르카나 슈트별 SVG
│   └── card-back.svg           # 카드 뒷면
└── characters/
    ├── arcana/                 # 6표정 JPG + nukki/ (누끼 PNG) + sprites/ (스프라이트)
    ├── miko/                   # 위와 동일 구조
    ├── seonhwa/                # 위와 동일 구조
    └── hoshi/                  # 위와 동일 구조

scripts/                        # 유틸리티 스크립트
├── pre-push-checks.sh          # git push 전 자동 검증 (tsc + lint + build)
├── generate-characters.ts      # 캐릭터 이미지 생성
├── generate-backgrounds.ts     # 배경 이미지 생성
├── generate-nukki-images.mjs   # 누끼(배경제거) 이미지 생성
├── generate-character-images.mjs
├── generate-placeholders.sh    # 플레이스홀더 이미지 생성
└── regenerate-all-nukki.mjs

supabase/migrations/            # DB 마이그레이션 파일
├── 001_initial_schema.sql      # 초기 스키마 (sessions, readings 등)
├── 003_daily_cards.sql         # daily_cards 테이블 + profiles.favorite_character_id
└── 004_user_info.sql           # 사용자 정보 (생년월일, 성별, 혈액형 등)
```

## 캐릭터 시스템

4명의 캐릭터, 각각 다른 서비스 타입 전문:

| ID | 이름 | 전문 | 말투 |
|---|---|---|---|
| `arcana` | 아르카나 | 타로 (tarot) | ~네요/~해요, 부드럽고 신비로운 톤 |
| `miko` | 미코 | 신점 (shinjeom) | ~입니다/~합니다, 차분하고 엄숙한 톤 |
| `seonhwa` | 선화 | 사주 (saju) | ~세요/~랍니다, 우아하고 따뜻한 톤 |
| `hoshi` | 호시 | 오늘의 운세 (fortune) | ~야/~지, 반말 + 이모지 |

각 캐릭터는 6가지 표정(Mood): `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`

## 핵심 아키텍처 패턴

- **DivinationService 인터페이스**: 모든 운세 서비스는 이 인터페이스를 구현. 새 서비스 추가 = 구현체 + 프롬프트
- **AIProvider 추상화**: Grok API를 직접 호출하지 않고 인터페이스 통해 호출. 모델 교체 용이
- **SSE 스트리밍**: `/api/tarot/reading`에서 Grok 응답을 SSE로 클라이언트에 스트리밍
- **Tailwind v4**: CSS `@theme` 블록(`globals.css`)에서 커스텀 컬러 정의 (`arcana-*` 계열)
- **Path alias**: `@/*` → `./src/*` (tsconfig.json)

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

- 캐릭터 이미지: JPG (표정별) + PNG 누끼 (투명 배경)
- 카드 이미지: SVG
- 배경 이미지: JPG
- 새 이미지 생성 시 `scripts/` 디렉토리의 생성 스크립트 활용

## 명령어

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint 실행
pnpm tsc --noEmit # TypeScript 타입 체크
```

## 환경 변수

```
GROK_API_KEY=               # xAI Grok API 키
GROK_MODEL=grok-3           # 사용 모델
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

### 2단계: 3단계 검증 (tsc + lint + build) — 최소 5회 반복
```bash
pnpm tsc --noEmit      # TypeScript 타입 체크
pnpm lint              # ESLint 코드 품질 검사
pnpm build             # 프로덕션 빌드 확인
```
- 3가지 모두 통과해야 다음 단계로 진행
- 에러 발생 시 수정 후 재검증
- **검증은 최소 5회 반복 수행**: 1회 통과로 완료하지 않고, 수정→검증 사이클을 최소 5회 반복하여 안정성 확보. 중간에 에러가 발생하면 카운트를 리셋하고 다시 5회 반복

### 3단계: 변경 사항 리뷰
- **스펙 준수 확인**: 요청된 사항이 모두 반영되었는지 확인
- **코드 품질 확인**: 미사용 변수, 불필요한 코드, 기존 패턴과의 일관성 확인
- **레이아웃 규칙 확인**: 5:5 비율, 모바일 세로 배치 등 공통 규칙 준수 여부

### 4단계: 커밋 + push
- 의미 있는 커밋 메시지 작성
- `git push` 실행 (PreToolUse 훅이 자동으로 `scripts/pre-push-checks.sh` 재실행)

### 자동화
- `.claude/settings.json`의 PreToolUse 훅으로 `git push` 시 자동 검증
- `scripts/pre-push-checks.sh` 실행: tsc → lint → build 순서
- 하나라도 실패하면 push 차단

## 레이아웃 규칙 (필수 준수)

캐릭터가 등장하는 모든 페이지에서 반드시 지켜야 하는 공통 레이아웃 규칙:

- **데스크탑(md 이상)**: 좌측 캐릭터 50% + 우측 콘텐츠(카드/카테고리 등) 50% — 가로 5:5 비율 flex 레이아웃
- **모바일(md 미만)**: 위에서 아래로 세로 배치 — 캐릭터 → 콘텐츠 순서
- 캐릭터 이미지 테두리는 CSS mask로 투명도 그라디언트를 적용하여 배경과 자연스럽게 블렌딩
- 이 규칙은 타로 주제 선택 페이지, 세션 페이지, 결과 페이지, 향후 추가되는 모든 캐릭터 등장 페이지에 동일 적용

## 홈 페이지 구성

`src/app/page.tsx`에서 8개 섹션을 순서대로 조합:

1. **HeroSection** — 풀스크린 히어로 (캐릭터 + 카피 + CTA)
2. **CharacterGallery** — 4캐릭터 갤러리 (카드형)
3. **ServiceFlow** — 서비스 이용 흐름 소개
4. **DailyCard** — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기 + 공유)
5. **StatsCounter** — 서비스 통계 카운터
6. **ReviewCarousel** — 사용자 후기 캐러셀
7. **FAQ** — 아코디언 FAQ
8. **BottomCTA** — 하단 행동 유도

## 작업 시 주의사항

- 타로 카드 데이터는 `src/data/` 디렉토리에 정적으로 관리
- 홈 페이지 데이터(후기, FAQ, 통계)는 `src/data/home/`에 정적으로 관리
- 이미지 리소스는 `public/images/`에 저장
- DB 스키마는 `supabase/migrations/`에서 관리 (번호 순서 유지)
- `main` 브랜치에 직접 push 금지, PR을 통해 머지
- `.env` 파일은 절대 커밋하지 않음 (Railway 환경변수로 관리)
- 캐릭터 이미지 표정은 864x1296 세로 규격 통일 (JPG), 누끼는 PNG
