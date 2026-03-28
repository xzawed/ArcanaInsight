# ArcanaInsight — 운세 종합 콘텐츠 플랫폼 기획서

## 1. 프로젝트 개요

ArcanaInsight는 일본 애니메이션 스타일의 점술 전문가 캐릭터와 대화하며 타로 리딩, 신점, 사주풀이 등 다양한 운세 서비스를 이용하는 웹 애플리케이션이다. MVP는 타로 서비스에 집중하고, 동일한 서비스 모듈 패턴으로 확장하여 최종적으로 운세 종합 콘텐츠 플랫폼을 목표로 한다.

### 핵심 가치

- **몰입감**: 애니메이션 캐릭터와 상담하는 듯한 경험
- **확장성**: 서비스 모듈 패턴으로 운세 서비스를 무한 확장
- **비용 효율**: Grok API 활용으로 AI 해석 비용 최적화

### 타겟 사용자

- PC/모바일 동등하게 사용하는 운세에 관심 있는 전 연령대
- 애니메이션 스타일의 캐릭터에 친숙한 사용자

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 언어 | TypeScript (strict) |
| 프레임워크 | Next.js 14+ (App Router) |
| 스타일링 | Tailwind CSS |
| 애니메이션 | Framer Motion + CSS + Lottie |
| AI | Grok API (xAI) — 추상화 레이어를 통해 호출 |
| 인증 | Supabase Auth Helpers (카카오/구글/네이버) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 상태관리 | Zustand (필요 시) |
| 패키지 매니저 | pnpm |
| CI/CD | GitHub Actions → Railway 자동 배포 |
| 호스팅 | Railway |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  Pages/UI │  │ API Routes│  │  Services   │  │
│  │  (App     │──│  /api/*   │──│  ┌─────────┐│  │
│  │   Router) │  │           │  │  │ Tarot    ││  │
│  └───────────┘  └─────┬─────┘  │  │ (MVP)    ││  │
│                       │        │  ├─────────┤│  │
│                       │        │  │ Saju     ││  │
│                       │        │  │ (확장)    ││  │
│                       │        │  ├─────────┤│  │
│                       │        │  │ Shinjeom ││  │
│                       │        │  │ (확장)    ││  │
│                       │        │  └─────────┘│  │
│                       │        └─────────────┘  │
│              ┌────────┴────────┐                 │
│              │  AI Provider    │                 │
│              │  (추상화 레이어)  │                 │
│              │  └── Grok API   │                 │
│              └────────┬────────┘                 │
└───────────────────────┼─────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐
   │Supabase │   │  Supabase   │  │  Railway   │
   │  Auth   │   │  Database   │  │  Hosting   │
   └─────────┘   └─────────────┘  └───────────┘
```

### AI Provider 추상화

Grok API를 직접 호출하지 않고 인터페이스를 통해 호출한다. 향후 비용 비교 후 모델 교체가 용이하도록 설계한다.

### 서비스 모듈 패턴

모든 운세 서비스는 `DivinationService` 인터페이스를 구현한다.

```typescript
interface DivinationService {
  id: string;
  name: string;
  getCharacter(): CharacterConfig;
  startSession(topic: Topic): Session;
  getPrompt(context: SessionContext): string;
  parseResult(aiResponse: string): Result;
}
```

새 서비스 추가 = `DivinationService` 구현체 + 프롬프트 폴더. 코어 모듈(AI Provider, 세션 관리)은 모든 서비스가 공유한다.

---

## 4. 캐릭터 시스템

### 스타일 가이드

- **화풍**: 일본 애니메이션 셀 쉐이딩, 큰 눈, 섬세한 표정
- **표정 세트**: 캐릭터당 6종 (기본 / 미소 / 진지 / 놀람 / 윙크 / 신비)
- **아이들 모션**: 머리카락 흔들림, 눈 깜빡임 (CSS/Lottie)
- **대사 연출**: 한 글자씩 타이핑 효과 + 표정 변화 동기화

### 캐릭터 라인업

| 캐릭터 | 서비스 | 컨셉 | 비주얼 키워드 |
|--------|--------|------|--------------|
| 아르카나 (アルカナ) | 타로 | 신비로운 마녀 | 보라색 로브, 긴 은발, 수정구슬, 고양이 귀 |
| 미코 (巫女) | 신점 | 무녀/영매 | 흰색 하카마, 검은 장발, 붉은 리본, 부적 |
| 선화 (仙花) | 사주 | 선녀/도사 | 한복+판타지, 꽃장식, 부채, 동양 신비 |
| 호시 (星) | 오늘의 운세 | 별의 정령 | 파스텔톤, 별 모티프, 짧은 머리, 발랄함 |
| ??? | 확장용 슬롯 | 잠금 상태 | 실루엣 + "Coming Soon" |

### 캐릭터 데이터 구조

```typescript
interface CharacterConfig {
  id: string;
  name: string;
  nameJp: string;
  serviceType: ServiceType;
  greeting: string;
  expressions: Record<Mood, string>;
  idleAnimation: string;
  personality: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
}
```

캐릭터 전환 시 서비스 선택 화면에서 각자 포즈로 대기하고, 선택 시 앞으로 나오는 트랜지션 애니메이션을 재생한다. 미해금 캐릭터는 실루엣으로 표시한다.

---

## 5. 페이지 구조 & 사용자 플로우

### 페이지 목록 (MVP)

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 — 서비스 소개, CTA |
| `/tarot` | 타로 서비스 진입 — 주제 선택 |
| `/tarot/session` | 상담 세션 — 캐릭터 + 카드 선택 + 채팅 |
| `/tarot/result/[id]` | 결과 페이지 — 공유 가능한 URL |
| `/auth/login` | 소셜 로그인 |
| `/mypage` | 리딩 히스토리, 프로필 |

### 상담 플로우

1. 사용자가 상담 주제 선택 (연애/재정/직장/건강/일반)
2. 캐릭터가 인사 + 주제에 맞는 스프레드 추천
3. 카드가 펼쳐지는 애니메이션 → 사용자가 카드 선택
4. 선택된 카드가 뒤집히며 공개
5. 캐릭터가 카드별 해석을 대화체로 전달 (Grok API)
6. 종합 해석 + 조언 제공
7. 결과 저장/공유 옵션

### 상담 UI 레이아웃 (하이브리드)

```
┌─────────────────────────┐
│     캐릭터 영역          │  ← 2D 캐릭터 + 표정 변화
│     (상단 40%)           │
├─────────────────────────┤
│     카드 선택 영역       │  ← 셔플/펼침/선택 애니메이션
│     (중단, 상황에 따라)   │
├─────────────────────────┤
│     채팅 영역            │  ← 대화 진행 + 선택지
│     (하단)               │
└─────────────────────────┘
```

---

## 6. 카드 애니메이션 & 인터랙션

### 애니메이션 단계

| 단계 | 애니메이션 | 기술 |
|------|-----------|------|
| 셔플 | 카드 뭉치가 섞이는 모션 | Framer Motion `layout` + `spring` |
| 펼침 | 부채꼴/원형으로 카드 나열 | Framer Motion `staggerChildren` |
| 호버 | 카드가 살짝 위로 뜨며 빛남 | CSS `transform` + `box-shadow` |
| 선택 | 3D 뒤집기 + 카드 이미지 공개 | Framer Motion `rotateY` 180° |
| 배치 | 선택된 카드가 스프레드 위치로 이동 | Framer Motion `AnimatePresence` |
| 해석 | 캐릭터 표정 변화 + 대사 타이핑 | 표정 전환 + typewriter 효과 |

### 스프레드 레이아웃 (주제별 자동 추천)

- **1카드 (원카드)**: 간단한 질문, 예/아니오
- **3카드 (과거/현재/미래)**: 연애, 일반 상담
- **5카드 (켈틱 간소화)**: 직장, 재정 등 복잡한 주제

### 반응형 처리

- **PC**: 카드를 넓게 부채꼴 배치, 호버 효과 강조
- **모바일**: 카드를 좌우 스와이프로 탐색, 탭으로 선택
- 스프레드 레이아웃은 화면 크기에 따라 자동 리스케일

---

## 7. 데이터 모델

### Supabase 스키마

```sql
-- 사용자 (Supabase Auth 연동)
users
├── id (uuid, PK)
├── email
├── nickname
├── avatar_url
├── provider (kakao/google/naver)
├── created_at
└── last_login_at

-- 상담 세션
sessions
├── id (uuid, PK)
├── user_id (FK → users, nullable)
├── service_type (tarot/saju/shinjeom/fortune)
├── topic (love/finance/career/health/general)
├── status (in_progress/completed/abandoned)
├── created_at
└── completed_at

-- 선택된 카드 (타로 전용)
session_cards
├── id (uuid, PK)
├── session_id (FK → sessions)
├── card_id (string)
├── position (int)
├── is_reversed (boolean)
└── selected_at

-- AI 해석 결과
readings
├── id (uuid, PK)
├── session_id (FK → sessions)
├── card_interpretation (jsonb)
├── overall_reading (text)
├── advice (text)
├── share_token (string)
└── created_at

-- 서비스 레지스트리 (확장용)
services
├── id (string, PK)
├── name (string)
├── is_active (boolean)
├── character_config (jsonb)
└── created_at
```

### 설계 포인트

- `sessions` 테이블이 모든 서비스의 공통 허브 — `service_type`으로 구분
- `readings`에 AI 응답을 `jsonb`로 저장 → 서비스별 다른 형식 수용
- `share_token`으로 비로그인 사용자도 결과 URL 공유 가능
- `user_id` nullable → 비회원도 세션 생성 가능, 로그인 시 연결

---

## 8. AI 프롬프트 전략

### Grok API 프롬프트 구조

```
[시스템 프롬프트]
- 캐릭터 성격/말투 지시
- 서비스 도메인 지식 (타로 카드 의미 DB)
- 응답 형식 지정 (JSON structured output)

[사용자 컨텍스트]
- 상담 주제
- 선택된 카드 + 위치 + 정/역방향
- 대화 히스토리 (세션 내)

[응답 요청]
- 카드별 개별 해석
- 카드 간 관계 해석
- 종합 해석 + 실용적 조언
```

### 비용 최적화

- 카드별 기본 의미는 정적 데이터로 보유 → 프롬프트에 포함시켜 Grok이 참고
- 세션 내 대화 히스토리는 최근 N턴만 유지 (토큰 절약)
- 종합 해석은 한 번의 API 호출로 일괄 생성

---

## 9. 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── auth/login/page.tsx
│   ├── mypage/page.tsx
│   └── tarot/
│       ├── page.tsx
│       ├── session/page.tsx
│       └── result/[id]/page.tsx
│
├── components/
│   ├── character/
│   │   ├── CharacterDisplay.tsx
│   │   ├── CharacterSelector.tsx
│   │   └── TypingDialogue.tsx
│   ├── card/
│   │   ├── CardDeck.tsx
│   │   ├── CardItem.tsx
│   │   ├── CardSpread.tsx
│   │   └── CardSwiper.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   └── ChatBubble.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   └── ui/
│
├── services/
│   ├── core/
│   │   ├── ai-provider.ts
│   │   ├── grok-provider.ts
│   │   ├── session-manager.ts
│   │   └── prompt-builder.ts
│   └── tarot/
│       ├── tarot-service.ts
│       ├── deck-manager.ts
│       ├── spread-resolver.ts
│       └── prompts/
│
├── data/
│   ├── cards/
│   │   ├── major-arcana.ts
│   │   └── minor-arcana.ts
│   ├── characters/
│   │   └── index.ts
│   └── spreads/
│       └── index.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils/
│
├── hooks/
│   ├── useSession.ts
│   ├── useCardAnimation.ts
│   └── useCharacter.ts
│
└── types/
    ├── card.ts
    ├── character.ts
    ├── session.ts
    └── service.ts
```

---

## 10. 환경 변수

```
GROK_API_KEY=
GROK_MODEL=grok-3
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Railway 환경변수로 관리하며 `.env` 파일은 커밋하지 않는다.

---

## 11. 운영 & 모니터링

- **Grok API 비용 추적**: `readings` 테이블 기반 호출 횟수 집계
- **에러 로깅**: Railway 내장 로그 + 향후 Sentry 연동
- **세션 완료율**: `sessions.status` 기반 추적
- **성능 최적화**:
  - 카드 이미지 → Next.js `Image` + WebP, 프리로드
  - 캐릭터 이미지 → 표정별 스프라이트 시트
  - Grok API 응답 → SSE 스트리밍으로 타이핑 효과 연동

---

## 12. 확장 로드맵

| 단계 | 내용 |
|------|------|
| MVP | 타로 서비스 완성 (아르카나 캐릭터, 78장+커스텀 덱, AI 해석) |
| v1.1 | 오늘의 운세 추가 (호시 캐릭터) |
| v1.2 | 사주풀이 추가 (선화 캐릭터, 양력→음력 변환) |
| v1.3 | 신점 추가 (미코 캐릭터) |
| v2.0 | 수익화 모델 도입, 캐릭터 커스터마이징, TTS 음성 |
