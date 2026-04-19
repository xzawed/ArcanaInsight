# 🔮 ArcanaInsight

<p align="right"><a href="README.en.md">🇺🇸 English</a></p>

> **애니메이션 캐릭터와 대화하며 타로 리딩 · 사주 분석 · 신점 상담을 받는 운세 종합 플랫폼**

<p align="center">
  <img src="public/images/backgrounds/hero-bg.jpg" alt="ArcanaInsight Hero" width="100%" style="border-radius:12px" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/status-v1.0.0%20Live-brightgreen?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/%E2%9A%9B%EF%B8%8F%20Frontend-Next.js%2016%20%2B%20React%2019-61DAFB?style=for-the-badge&labelColor=20232a" alt="Frontend" />
  <img src="https://img.shields.io/badge/%F0%9F%97%84%EF%B8%8F%20Backend-Node.js%20%2B%20Supabase-3ECF8E?style=for-the-badge&labelColor=1a1a2e" alt="Backend" />
  <img src="https://img.shields.io/badge/%F0%9F%A4%96%20AI-xAI%20Grok%20%2B%20Claude-FF6B35?style=for-the-badge&labelColor=1a1a2e" alt="AI" />
  <img src="https://img.shields.io/badge/%F0%9F%A7%AA%20Tests-141%20passed-4CAF50?style=for-the-badge&labelColor=1a1a2e" alt="Tests" />
</p>

<p align="center">
  <a href="https://arcanainsight-production.up.railway.app"><strong>🌐 라이브 데모</strong></a> &nbsp;·&nbsp;
  <a href="CLAUDE.md"><strong>🤖 개발 가이드</strong></a> &nbsp;·&nbsp;
  <a href="e2e/README.md"><strong>🧪 E2E 가이드</strong></a>
</p>

---

## ✨ 소개

ArcanaInsight는 일본 애니메이션 스타일의 **12명 개성 캐릭터**와 상담하듯 대화하며 운세 서비스를 이용하는 웹 애플리케이션입니다. Grok AI(xAI)가 타로 카드 해석과 사주명리학 분석을 **SSE 실시간 스트리밍**으로 제공하며, 각 캐릭터가 자신만의 말투로 결과를 전달합니다.

### 왜 ArcanaInsight인가

| | 특징 |
|---|---|
| 🎭 **12캐릭터 개성** | 신비로운 마녀·엄숙한 무녀·장난꾸러기 트릭스터 등 각자 다른 말투로 같은 결과도 다르게 느껴집니다 |
| ⚡ **실시간 SSE 스트리밍** | AI 응답이 타이핑 애니메이션으로 한 글자씩 나타나며 마치 실제 상담사가 말하는 듯한 경험을 제공합니다 |
| 🔄 **이중 AI Fallback** | Grok API 장애 시 Claude API로 자동 전환 — 사용자는 중단 없이 서비스를 이용합니다 |

---

## 🎯 주요 기능

### 🎴 타로 상담 (4단계)

1. **캐릭터 선택** — 12명의 상담사 중 선택 (성별 필터 지원)
2. **개인정보 입력** — 생년월일 · 출생시간 · 성별 · 혈액형
3. **주제 선택 + 카드 뽑기** — 7개 주제에서 선택 후 스프레드 구성
4. **AI 리딩 결과** — Grok AI가 실시간으로 해석 제공 + 결과 공유

**🃏 주제 7개**: 연애(전체) · 연애(솔로) · 연애(커플) · 재물 · 직업/직장 · 건강 · 종합

**🔢 스프레드 10종**

| 스프레드 | 카드 수 | 스프레드 | 카드 수 |
|----------|---------|----------|---------|
| 원카드 | 1장 | 관계 스프레드 | 7장 |
| 과거·현재·미래 | 3장 | 말굽 스프레드 | 7장 |
| 간소화된 켈틱 크로스 | 5장 | 의사결정 스프레드 | 5장 |
| 켈틱 크로스 | 10장 | 한 주 전망 | 7장 |
| — | — | 조디악 휠 | 12장 |
| — | — | 생명의 나무 | 10장 |

---

### 🔮 사주 상담 (4단계)

1. **캐릭터 선택** — 12명의 상담사 중 선택 (성별 필터 지원)
2. **개인정보 입력** — 생년월일 · 출생시간 · 성별 · 혈액형
3. **시간단위 × 분석영역 선택** — 동시 선택, 년단위는 월별 상세 토글 포함
4. **AI 리딩 결과** — Grok AI가 실시간으로 분석 제공 + 결과 공유

**⏱️ 시간단위 7개**

| 단위 | 월별 상세 | 단위 | 월별 상세 |
|------|-----------|------|-----------|
| 이번 주 | — | 내년 | ✓ |
| 이번 달 | — | 3년 | ✓ |
| 올해 | ✓ | 5년 | ✓ |
| — | — | 전체 대운 | — |

**🎯 분석영역 8개**: 종합운 · 연애(솔로) · 연애(커플) · 직장·재물 · 건강 · 성격·적성 · 궁합 · 택일

---

### 🌙 신점 상담 (3단계)

1. **캐릭터 선택** — 12명의 상담사 중 선택 (성별 필터 지원)
2. **주제 선택** — 신수 · 연애/궁합 · 재물/사업 · 직장/이직 · 건강/액막이 · 택일
3. **대화형 상담** — 무제한 문답 후 "신점 결과 받기" 버튼으로 종료 (1턴 이상 후 활성화)

---

### 👥 캐릭터 시스템

12명의 캐릭터가 각자 다른 말투와 전문 분야로 상담을 진행합니다. 성별 필터로 원하는 캐릭터를 쉽게 찾을 수 있으며, 각 캐릭터는 6가지 표정(default · smile · serious · surprised · wink · mystical)을 가집니다.

**✨ 여성 캐릭터 (6명)**

| 캐릭터 | 스타일 | 말투 |
|--------|--------|------|
| 🌙 아르카나 | 신비로운 마녀 | 부드럽고 신비로운 톤 (~네요/~해요) |
| ⛩️ 미코 | 엄숙한 무녀 | 차분하고 엄숙한 톤 (~입니다/~합니다) |
| 🌸 선화 | 우아한 선녀 | 우아하고 따뜻한 톤 (~세요/~랍니다) |
| ⭐ 호시 | 발랄한 별의 정령 | 반말 + 이모지 (~야/~지) |
| 🌕 루나 | 포근한 달의 수호자 | 다정하고 부드러운 위로 (~요/~네요) |
| ❄️ 레이 | 냉철한 분석가 | 짧고 건조한 핵심 (~야/~지) |

**🌟 남성 캐릭터 (6명)**

| 캐릭터 | 스타일 | 말투 |
|--------|--------|------|
| 🎩 카이른 | 귀족적 젠틀맨 | 격식 있고 다정한 톤 (~습니다) |
| 🖤 제로 | 미스터리 로맨티스트 | 시적이고 낮은 톤 (~다/~지) |
| ☀️ 하루 | 따뜻한 햇살 | 친근하고 따뜻한 존댓말 (~요/~세요) |
| 🪷 렌 | 고요한 도사 | 고풍스러운 문어체 (~오/~하오) |
| 💚 릭스 | 장난꾸러기 트릭스터 | 장난스러운 톤 (~는데/~ㄹ까) |
| 📚 에단 | 학구적 분석가 | 상세하고 친절한 설명 (~요/~거든요) |

---

### 🎁 기타 기능

- 🎨 **카드 스킨 6종** — 골드 럭셔리 · 다크 고딕 · 천상 미스틱 · 파스텔 드림 · 네온 사이버 · 에메랄드 인챈트
- 📅 **오늘의 카드** — 캐릭터별 일일 운세 (탭 전환 + 카드 뒤집기 애니메이션)
- 🌈 **동적 테마 7종** — 시간·계절 자동 감지 + 수동 고정 선택
- 🔐 **소셜 로그인** — Google 계정 로그인 (Supabase Auth / NextAuth.js)
- 📚 **마이페이지** — 타로·사주 리딩 히스토리 통합 조회 + 선호 상담사 설정
- 🔗 **결과 공유** — URL 링크 공유 또는 텍스트 복사

---

## 🚀 빠른 시작

```bash
# 1. 클론
git clone https://github.com/xzawed31/ArcanaInsight.git
cd ArcanaInsight

# 2. 의존성 설치 (pnpm 필수)
pnpm install

# 3. 환경변수 설정
cp .env.example .env.local
# .env.local 편집:
#   GROK_API_KEY=          # xAI API 키 (필수)
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 4. 개발 서버 실행
pnpm dev
# → http://localhost:3000 접속
```

> 🔑 [xAI Console](https://console.x.ai)에서 Grok API 키를 발급받을 수 있습니다.
> 📖 상세 환경변수 목록은 [CLAUDE.md](CLAUDE.md#환경-변수)를 참조하세요.

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| 🗣️ 언어 | TypeScript (strict) |
| ⚛️ 프레임워크 | Next.js 16.2.1 (App Router) · React 19.2.4 |
| 🎨 스타일링 | Tailwind CSS v4 (`@theme` CSS-based config) |
| 🎬 애니메이션 | Framer Motion v12.38 |
| 🤖 AI | Grok API (xAI) — SSE 스트리밍 · Claude API (Anthropic) 자동 fallback |
| 🔐 인증 | Supabase Auth Helpers (구글) |
| 🗄️ 데이터베이스 | Supabase (PostgreSQL) · Drizzle ORM (온프레미스 전환 지원) |
| 📦 상태관리 | Zustand v5 |
| 📦 패키지 매니저 | pnpm 10.33 |
| 🚀 호스팅 | Railway (GitHub Actions 자동 배포) |
| 🧪 E2E 테스트 | Playwright — 19개 파일, 141개 테스트 (Desktop · Android · iOS) · [가이드](./e2e/README.md) |

### 🤖 AI Native 개발 방식

이 프로젝트는 **AI가 실제 개발 파트너로 참여**하는 AI Native 개발 방식으로 구축되었습니다.

| 역할 | AI | 담당 |
|------|-----|------|
| 🧠 코드 구현 · QA · 배포 | **Claude CLI** (Anthropic) | 기획·구현·검토·CI·CLAUDE.md 관리 전 자동화 |
| ⚡ 프로덕션 AI | **Grok API** (xAI) | 타로·사주 리딩 + 캐릭터 이미지 생성 |
| 🔄 운영 자동화 | **n8n Cloud** | Spec 추적·품질 모니터링·주간 리포트 |
| 🚀 CI/CD | **GitHub Actions + Railway** | PR CI → 주간 QA → 자동 재검증 루프 |

> 📘 상세 AI 협업 구조는 [CLAUDE.md — 운영 체계](CLAUDE.md#운영-체계--supergrok--claude-cli-역할-분담)에서 확인할 수 있습니다.

---

## 🏗️ 아키텍처 하이라이트

### 🔌 DB Provider 추상화
`DB_PROVIDER` 환경변수 하나로 **Supabase ↔ 온프레미스 PostgreSQL 즉시 전환**. `getDb()` 팩토리가 어댑터를 선택하며 API 라우트 로직은 변경 없음. Railway 환경변수 변경만으로 롤백 가능.

### 🎯 AI Fallback 패턴
`FallbackProvider`가 **Grok 우선 호출 → 실패 시 Claude API 자동 전환**. 429 Rate Limit · 500 서버 에러 · 401 인증 실패 각각 다른 쿨다운으로 최적화. 양쪽 모두 실패 시에만 사용자에게 에러 표시.

### 📡 SSE 스트리밍
`/api/tarot/reading` · `/api/saju/reading` · `/api/daily-card` 엔드포인트가 AI 응답을 **Server-Sent Events로 실시간 전송**. 클라이언트는 `useSSEStream` 훅으로 한 글자씩 타이핑 애니메이션 구현.

> 📖 전체 아키텍처 상세는 [CLAUDE.md](CLAUDE.md#핵심-아키텍처-패턴)를 참조하세요.

---

## 🖼️ 이미지 에셋 규격

### 캐릭터 이미지

10캐릭터는 PNG 누끼, 2캐릭터(miko · seonhwa)는 JPG 레거시 경로를 사용합니다.

| 항목 | 규격 |
|------|------|
| 사이즈 | **1408×768** (grok-imagine-image-pro API 기본 출력) |
| 포맷 (10캐릭터) | PNG (투명 배경) — `/images/characters/{id}/nukki/{mood}.png` |
| 포맷 (miko · seonhwa) | JPG (레거시) — `/images/characters/{id}/{mood}.jpg` |
| 표정 종류 | default · smile · serious · surprised · wink · mystical |

### 테두리 투명도 (CSS mask)

`CharacterDisplay` 컴포넌트 사용 시 자동 적용됩니다.

| 방향 | 불투명 전환 시작점 |
|------|------------------|
| 상단 | 14% |
| 하단 | 18% |
| 좌/우 | 10% |

---

## 🧪 개발 명령어

```bash
pnpm dev           # 🚀 개발 서버
pnpm build         # 📦 프로덕션 빌드
pnpm start         # ▶️  프로덕션 서버
pnpm lint          # 🔍 ESLint 검사
pnpm type-check    # ✅ TypeScript 타입 체크
pnpm test:e2e      # 🎭 E2E 테스트 (Desktop/Android/iOS)
pnpm test:e2e:ui   # 🖥️  Playwright UI 모드 (시각적 디버깅)
```

> ⚠️ **Windows 환경**: E2E 테스트는 Docker(Linux 컨테이너)로 실행해야 합니다. 상세 가이드는 [e2e/README.md](e2e/README.md)를 참조하세요.

---

## 👥 개발 및 운영 체계

| 역할 | 담당 | 설명 |
|------|------|------|
| 🎨 서비스 기획/설계 | SuperGrok (xAI) | 기능 기획, UX/UI 설계 논의, 스펙 확정 |
| ⚡ 프로덕션 AI | SuperGrok (xAI) | Grok API 타로·사주 리딩 + 이미지 생성 |
| ⚙️ 코드 구현/QA | Claude CLI (Anthropic) | 7단계 프로세스, Playwright E2E, 주간 QA |
| 🚀 CI/CD + 배포 | Claude CLI (Anthropic) | GitHub Actions → Railway 자동 배포 |
| 📊 운영 분석 | SuperGrok (xAI) | 사용자 행동 분석, 리딩 품질 모니터링 |

상세 운영 체계 및 7단계 개발 프로세스는 [CLAUDE.md](./CLAUDE.md) 참조.

---

## 📄 문서 & 링크

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 전체 개발 가이드 (아키텍처·규칙·운영 체계) |
| [e2e/README.md](e2e/README.md) | E2E 테스트 실행·컨벤션·실패 대응 |

| 서비스 | URL |
|--------|-----|
| 🌐 라이브 데모 | [arcanainsight-production.up.railway.app](https://arcanainsight-production.up.railway.app) |
| 🔄 n8n 자동화 | [xzawed.app.n8n.cloud](https://xzawed.app.n8n.cloud) |

---

## 📜 소유권

이 프로젝트의 저작권 및 소유권은 **xzawed**에게 있습니다.

무단 복제, 배포, 수정을 금지합니다.

© 2026 xzawed. All rights reserved.
