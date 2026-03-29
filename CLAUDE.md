# ArcanaInsight

일본 애니메이션 스타일 캐릭터와 대화하며 타로 리딩을 받는 운세 종합 콘텐츠 플랫폼

## 프로젝트 개요

ArcanaInsight는 애니메이션 캐릭터와 상담하듯 대화하며 타로 카드를 선택하고, Grok AI가 해석을 제공하는 웹 애플리케이션입니다. MVP는 타로 서비스에 집중하며, 사주/신점/오늘의 운세로 확장 가능한 모듈 구조입니다.

## 기술 스택

- **언어**: TypeScript (strict)
- **프레임워크**: Next.js 16+ (App Router)
- **스타일링**: Tailwind CSS v4 (CSS-based `@theme` config)
- **애니메이션**: Framer Motion
- **AI**: Grok API (xAI) — `src/services/core/grok-provider.ts`에서 추상화
- **인증**: Supabase Auth Helpers (카카오/구글)
- **데이터베이스**: Supabase (PostgreSQL)
- **상태관리**: Zustand
- **패키지 매니저**: pnpm
- **CI/CD**: GitHub Actions → Railway 자동 배포
- **호스팅**: Railway

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지 & API
│   ├── api/tarot/          # API 라우트 (session, reading SSE, result)
│   ├── auth/               # 로그인, OAuth 콜백
│   ├── mypage/             # 리딩 히스토리
│   └── tarot/              # 주제 선택, 상담 세션, 결과
├── components/
│   ├── card/               # CardItem, CardDeck, CardSpread, CardSwiper
│   ├── character/          # CharacterDisplay, CharacterSelector, TypingDialogue
│   ├── chat/               # ChatBubble, ChatWindow
│   └── layout/             # Header, Footer, MobileNav
├── data/
│   ├── cards/              # 메이저 22장 + 마이너 56장 정적 데이터
│   ├── characters/         # 4캐릭터 설정 (아르카나/미코/선화/호시)
│   └── spreads/            # 스프레드 정의 (1/3/5카드)
├── hooks/                  # Zustand 스토어 (useSession, useCharacter, useCardAnimation)
├── lib/supabase/           # Supabase 클라이언트 (browser/server/middleware)
├── services/
│   ├── core/               # AI Provider 추상화, Grok 구현체, 프롬프트 빌더
│   └── tarot/              # TarotService, DeckManager, SpreadResolver
└── types/                  # card, character, session, service 인터페이스
```

## 핵심 아키텍처 패턴

- **DivinationService 인터페이스**: 모든 운세 서비스는 이 인터페이스를 구현. 새 서비스 추가 = 구현체 + 프롬프트
- **AIProvider 추상화**: Grok API를 직접 호출하지 않고 인터페이스 통해 호출. 모델 교체 용이
- **SSE 스트리밍**: `/api/tarot/reading`에서 Grok 응답을 SSE로 클라이언트에 스트리밍
- **Tailwind v4**: CSS `@theme` 블록에서 커스텀 컬러 정의 (`arcana-*` 계열)

## 코딩 컨벤션

### 일반 규칙

- 한국어 주석 및 커밋 메시지 사용
- 함수/변수명은 영어 camelCase
- 컴포넌트명은 PascalCase
- 파일명은 kebab-case (컴포넌트 파일 제외)

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

- `railway.toml`에 빌드/배포 설정 정의
- GitHub Secrets 필요:
  - `RAILWAY_TOKEN`: Railway API 토큰
  - `RAILWAY_SERVICE_ID`: Railway 서비스 ID

## 코드 품질 게이트

모든 코드 변경 후 GitHub push 전에 반드시 다음 검증을 통과해야 합니다:

```bash
bash scripts/pre-push-checks.sh  # tsc + lint + build 자동 검증
```

이 검증은 `.claude/settings.json`의 PreToolUse 훅으로 자동화되어 있습니다.
`git push` 실행 시 자동으로 타입 체크 → ESLint → 프로덕션 빌드를 순서대로 수행하며,
하나라도 실패하면 push가 차단됩니다.

## 작업 시 주의사항

- 타로 카드 데이터는 `src/data/` 디렉토리에 정적으로 관리
- 이미지 리소스는 `public/images/`에 저장
- DB 스키마는 `supabase/migrations/`에서 관리
- `main` 브랜치에 직접 push 금지, PR을 통해 머지
- `.env` 파일은 절대 커밋하지 않음 (Railway 환경변수로 관리)
