# ArcanaInsight

애니메이션 캐릭터와 대화하며 타로 리딩 & 사주 분석을 받는 운세 종합 콘텐츠 플랫폼

**운영 URL**: https://arcanainsight-production.up.railway.app

## 소개

ArcanaInsight는 일본 애니메이션 스타일의 캐릭터와 상담하듯 대화하며 운세 서비스를 이용하는 웹 애플리케이션입니다. AI 타로 리딩과 사주명리학 분석을 제공하며, 캐릭터가 결과를 해석해드립니다.

## 주요 기능

### 타로 상담
- **78장 타로 카드** — 메이저 아르카나 22장 + 마이너 아르카나 56장 완전 수록
- **3가지 스프레드** — 원카드(1장) / 쓰리카드(3장·과거·현재·미래) / 변형 켈틱 크로스(5장, 전통 10장의 단축 버전)
- **카드 확인 시스템** — 매 카드 선택마다 확인/다시 고르기 선택 가능
- **대기 연출** — 리딩 중 카드 순차 뒤집기 + 캐릭터 대사 + 카드 키워드 미리보기
- **AI 실시간 해석** — Grok AI SSE 스트리밍으로 카드 해석 실시간 제공

### 사주 상담
- **사주팔자 분석** — tyme4ts 기반 정확한 팔자 계산 (연/월/일/시주)
- **오행 분포** — 木火土金水 5행 시각화 그래프
- **십성 / 12운성** — 일간 기준 관계 분석
- **합/충/형** — 지지 간 관계 분석
- **대운 타임라인** — 10년 단위 운세 흐름 + 현재 대운 강조
- **용신 판별** — 신강/신약 판별 + 균형에 필요한 오행 제시
- **8가지 주제** — 연애(`love`), 직장(`career`), 재정(`finance`), 건강(`health`), 종합(`general`), 3년 운세(`fortune-3y`), 5년 운세(`fortune-5y`), 전체 인생 운세(`fortune-full`)

### 캐릭터 시스템
12명의 캐릭터가 각각 다른 말투와 전문 분야로 상담합니다. 성별 필터로 원하는 캐릭터를 쉽게 찾을 수 있습니다.

**여성 캐릭터 (6명)**

| 캐릭터 | 스타일 | 말투 |
|--------|--------|------|
| 🌙 아르카나 | 신비로운 마녀 | 부드럽고 신비로운 톤 (~네요/~해요) |
| ⛩️ 미코 | 엄숙한 무녀 | 차분하고 엄숙한 톤 (~입니다/~합니다) |
| 🌸 선화 | 우아한 선녀 | 우아하고 따뜻한 톤 (~세요/~랍니다) |
| ⭐ 호시 | 발랄한 별의 정령 | 반말 + 이모지 (~야/~지) |
| 🌙 루나 | 포근한 달의 수호자 | 다정하고 부드러운 위로 (~요/~네요) |
| ❄️ 레이 | 냉철한 분석가 | 짧고 건조한 핵심 (~야/~지) |

**남성 캐릭터 (6명)**

| 캐릭터 | 스타일 | 말투 |
|--------|--------|------|
| 🎩 카이른 | 귀족적 젠틀맨 | 격식 있고 다정한 톤 (~습니다) |
| 🖤 제로 | 미스터리 로맨티스트 | 시적이고 낮은 톤 (~다/~지) |
| ☀️ 하루 | 따뜻한 햇살 | 친근하고 따뜻한 존댓말 (~요/~세요) |
| 🪷 렌 | 고요한 도사 | 고풍스러운 문어체 (~오/~하오) |
| 💚 릭스 | 장난꾸러기 트릭스터 | 장난스러운 톤 (~는데/~ㄹ까) |
| 📚 에단 | 학구적 분석가 | 상세하고 친절한 설명 (~요/~거든요) |

### 기타 기능
- **성별 필터** — 전부/여자/남자 필터로 캐릭터 선택
- **카드 스킨** — 카드 디자인 변경 (스킨 시스템)
- **캐릭터 상세 페이지** — `/character/[id]`에서 캐릭터 프로필 확인
- **오늘의 카드** — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기)
- **동적 테마** — 시간/계절 자동 감지 (7종 테마) + 수동 고정 선택
- **소셜 로그인** — 카카오 / 구글 계정으로 간편 로그인
- **마이페이지** — 리딩/사주 히스토리 통합 조회, 로그아웃
- **결과 공유** — URL 링크 공유 또는 텍스트 복사
- **이용약관 / 개인정보처리방침** — 법적 고지 페이지 완비

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2 (App Router) |
| 언어 | TypeScript (strict) |
| UI | React 19.2, Tailwind CSS v4, Framer Motion v12 |
| AI | Grok API (xAI) — SSE 스트리밍 |
| 사주 계산 | tyme4ts (음양력 변환 + 간지 + 절기) |
| 인증/DB | Supabase (PostgreSQL + Auth + RLS) |
| 상태관리 | Zustand v5 |
| 패키지 매니저 | pnpm 10.33 |
| CI/CD | GitHub Actions → Railway 자동 배포 |
| 호스팅 | Railway |

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지 & API
│   ├── api/
│   │   ├── daily-card/         # 캐릭터별 일일 카드 API
│   │   ├── tarot/              # 타로 API (session, reading, result)
│   │   └── saju/               # 사주 API (reading, result)
│   ├── auth/                   # 로그인, OAuth 콜백
│   ├── mypage/                 # 마이페이지 (히스토리, 로그아웃)
│   ├── tarot/                  # 타로 (캐릭터→주제→스프레드→세션→결과)
│   ├── saju/                   # 사주 (캐릭터→정보입력→주제→세션→결과)
│   ├── terms/                  # 이용약관
│   └── privacy/                # 개인정보처리방침
├── components/
│   ├── card/                   # CardDeck, CardSpread, CardItem, CardFace, CardBack
│   ├── character/              # CharacterDisplay, CharacterCard, TypingDialogue
│   ├── chat/                   # DialogueBox
│   ├── effects/                # ParticleOverlay, ScrollReveal
│   ├── home/                   # HeroSection, CharacterGallery, DailyCard 등 8개
│   ├── layout/                 # Header, Footer, MobileNav, ThemeProvider
│   ├── saju/                   # SajuChart, OhaengGraph, DaeunTimeline
│   └── tarot/                  # UserInfoForm, PrivacyConsentModal
├── data/
│   ├── cards/                  # 메이저 22장 + 마이너 56장
│   ├── characters/             # 12캐릭터 설정 (index.ts) + 대기 대사 (waiting-lines.ts)
│   ├── home/                   # FAQ, 후기, 통계 데이터
│   ├── saju/                   # 천간/지지/오행/십성/12운성 상수
│   └── spreads/                # 스프레드 정의 (1/3/5장)
├── hooks/                      # useSession, useSajuSession, useCharacter, useTheme 등
├── lib/supabase/               # Supabase 클라이언트 (client, server, middleware)
├── services/
│   ├── core/                   # GrokProvider, prompt-builder, text-cleaner
│   ├── tarot/                  # TarotService, DeckManager, SpreadResolver
│   └── saju/                   # SajuService, saju-calculator, saju-types
└── types/                      # card, character, session, service 인터페이스
```

## 아키텍처

- **DivinationService 인터페이스** — 모든 운세 서비스(타로, 사주)가 이 인터페이스를 구현. 새 서비스 추가 = 구현체 + 프롬프트
- **AIProvider 추상화** — Grok API를 인터페이스 통해 호출. 모델 교체 용이
- **SSE 스트리밍** — 리딩 API에서 AI 응답을 실시간으로 클라이언트에 전달
- **계산은 서버, 해석은 AI** — 사주팔자/오행/대운은 코드로 정확히 계산, AI는 해석만 담당
- **동적 테마** — CSS 변수 오버라이드로 7종 테마 전환 (시간/계절 자동 + 수동)

## 시작하기

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local에 실제 값 입력

# 개발 서버 실행
pnpm dev
```

### 환경변수

```
GROK_API_KEY=               # xAI Grok API 키
GROK_MODEL=grok-3           # 사용 모델
NEXT_PUBLIC_SUPABASE_URL=   # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY=  # Supabase 서비스 키 (서버 전용)
NEXT_PUBLIC_SITE_URL=       # 사이트 URL
```

### 명령어

```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint
pnpm type-check   # TypeScript 타입 체크 (= pnpm tsc --noEmit)
```

## 라이선스

이 프로젝트는 비공개 소프트웨어입니다. 무단 복제, 배포, 수정을 금지합니다.

&copy; 2026 xzawed. All rights reserved.
