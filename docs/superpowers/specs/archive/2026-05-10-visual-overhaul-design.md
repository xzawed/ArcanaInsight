# Visual Overhaul — 초고퀄리티 일러스트 재생성 + 테마 통합 이펙트 시스템 설계

> **담당**: Claude (설계·결정) | Codex (구현·검증)
> 협업 프로토콜 정본: [`../../workflow/claude-codex-collaboration.md`](../../workflow/claude-codex-collaboration.md)

**Goal:** 서비스 전체 비주얼을 초고퀄리티 AI 생성 일러스트로 교체하고, 7개 테마가 전체 UI에 화려하게 침투하는 이펙트 시스템을 구축한다.

**Architecture:** 3단계 순차 구현. 1단계(이미지 재생성 시스템)→2단계(테마 통합 이펙트 강화)→3단계(서비스 페이지 이펙트+카드 텍스트 비노출). 각 단계는 독립 배포 가능.

**Tech Stack:** Replicate API (Flux 1.1 Pro Ultra), WebP, Framer Motion, CSS custom properties, Zustand

---

## 전체 구조

### 3단계 구성

| 단계 | 내용 | 브랜치 |
|------|------|--------|
| 1단계 | 이미지 재생성 시스템 + 카드 스타일 시스템 | `feat/visual-overhaul-phase1` |
| 2단계 | 테마 통합 이펙트 강화 | `feat/visual-overhaul-phase2` |
| 3단계 | 서비스 페이지 이펙트 + 카드 텍스트 비노출 | `feat/visual-overhaul-phase3` |

---

## 1단계: 이미지 재생성 시스템

### 4가지 카드 아트 스타일

| ID | 스타일명 | 분위기 | 핵심 프롬프트 키워드 |
|----|----------|--------|----------------------|
| `dark-fantasy` | 다크 판타지 고딕 | 심야색·금박·오컬트 문양 | dark gothic luxury, gold foil border, arcane runes, deep indigo background |
| `art-nouveau` | 아르누보 신비주의 | 식물 곡선·앤틱 테두리·빈티지 | art nouveau, ornate floral borders, vintage mystical, flowing organic lines |
| `anime-mystical` | 아니메 신비 융합 | 발광 마법진·사쿠라·일본 오컬트 | anime art style, glowing magic circle, Japanese mystical, vivid saturated colors |
| `modern-digital` | 모던 디지털 럭셔리 | 홀로그램·우주·네온 그리드 | holographic luxury, cosmic nebula, neon grid, digital mystical, iridescent |

### 테마 → 기본 카드 스타일 매핑

| 테마 | 기본 카드 스타일 | 근거 |
|------|-----------------|------|
| midnight 🌙 | `dark-fantasy` | 심야 고딕 분위기 일치 |
| dawn 🌅 | `art-nouveau` | 새벽 우아함·클래식 미 |
| sunset 🌇 | `modern-digital` | 황혼 강렬함 → 네온 홀로그램 |
| spring 🌸 | `anime-mystical` | 벚꽃·일본 애니메이션 세계관 |
| summer ✨ | `anime-mystical` | 반딧불·일본 여름밤 |
| autumn 🍂 | `dark-fantasy` | 낙엽·단풍 → 고딕 어둠 |
| winter ❄️ | `art-nouveau` | 눈꽃 결정·섬세한 패턴 |

사용자는 설정 페이지에서 이 기본값을 오버라이드할 수 있으며, 선택은 `localStorage`에 저장된다.

### 이미지 생성 대상 및 경로

| 카테고리 | 수량 | 현재 경로 | 새 경로 |
|----------|------|-----------|---------|
| 타로 카드 앞면 | 78장 × 4스타일 = 312장 | `cards/major/*.svg`, `cards/[suit]/*.svg` | `cards/[style]/major/*.webp`, `cards/[style]/[suit]/*.webp` |
| 카드 뒷면 | 4스타일 = 4장 | `cards/card-back.svg` | `cards/[style]/card-back.webp` |
| 서비스 배경 | 21장 (서비스 3 × 테마 7) | `backgrounds/*.jpg` | `backgrounds/[service]/[theme].webp` |
| 서비스 데코 | 12장 (서비스별 장식 요소) | `backgrounds/deco-*.jpg` | `backgrounds/deco/[style].webp` |
| 아이콘 | 52개 (변경 없음) | `icons/*.png` | 유지 |

→ **총 약 349장 생성**, 전부 WebP 포맷

### 해상도 및 비용

- 타로 카드: **2048×2048** WebP
- 서비스 배경: **1920×1080** WebP
- 데코 요소: **1024×1024** WebP
- 모델: `black-forest-labs/flux-1.1-pro-ultra`
- 동시 실행: 5개 병렬
- 예상 생성 시간: 약 30분
- 예상 비용: 349장 × $0.06 ≈ **약 $21**

### 스크립트 구조

```
scripts/
└── generate-assets/
    ├── index.ts          # 메인 오케스트레이터 (병렬 생성 제어)
    ├── prompts.ts        # 카드별·배경별 프롬프트 정의
    ├── replicate.ts      # Replicate API 클라이언트 래퍼
    ├── config.ts         # 모델·해상도·동시 실행 수 설정
    └── progress.ts       # 진행률 표시 + 실패 재시도 로직
```

### 프롬프트 아키텍처 (3레이어)

```
[스타일 기반] + [카드 고유 의미] + [품질 강화]

예시 (dark-fantasy + The Fool):
"dark gothic luxury tarot card, gold foil ornate border, deep indigo background,
 arcane symbols — The Fool: new beginnings, cliff edge, white rose, small dog,
 bindle stick — ultra high quality illustration, 8k resolution, intricate details,
 professional tarot art, no text, no letters, no watermarks"
```

### 실행 명령어

```bash
REPLICATE_API_TOKEN=r8_xxxx   # .env.local 추가 필수

pnpm generate:assets                        # 전체 생성 (~30분)
pnpm generate:assets --style dark-fantasy   # 특정 스타일만
pnpm generate:assets --card major/00-fool   # 특정 카드만 (실패 복구)
pnpm generate:assets --type backgrounds     # 배경 이미지만
```

기존 SVG/JPG는 `public/images/backup/`으로 자동 이동 후 새 파일 저장.

### 카드 스타일 시스템 재구축

**기존 6종 color-only 스킨 → 4종 full-art 스타일로 통합 교체**

```typescript
// src/data/cardStyles.ts (신규)
export type CardStyleId = 'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital';

export interface CardStyle {
  id: CardStyleId;
  nameKo: string;
  nameEn: string;
  nameJa: string;
  description: string;
  previewCard: string;       // 미리보기용 경로 (The Fool)
  defaultThemes: ThemeId[];  // 이 스타일이 기본값인 테마 목록
}
```

**카드 이미지 선택 로직:**
1. 활성 테마 → 테마-스타일 매핑표 조회 → 기본 스타일 ID
2. `useCardStyleStore.userOverride`가 있으면 오버라이드 스타일 사용
3. `public/images/cards/[style]/[suit]/[id].webp` 반환

**설정 페이지 UI:**
- 기존 `SkinSelector` → `CardStyleSelector`로 교체
- 각 스타일 미리보기: The Fool 카드 썸네일 + 스타일명
- "테마 자동 연동 (현재: dark-fantasy)" 기본 옵션 포함

### 환경변수

```bash
REPLICATE_API_TOKEN=r8_xxxx  # .env.local에 추가, .env.example에 주석 추가
```

---

## 2단계: 테마 통합 이펙트 강화

### 핵심 원칙

현재 테마는 배경 파티클에만 영향을 준다. 2단계 이후 **UI의 모든 요소가 테마에 반응**한다.

### 이펙트 레이어 구조 (5층)

```
Layer 5 (최상단): 인터랙션 이펙트  — 마우스 hover·클릭 시 파티클 폭발
Layer 4:          UI 컴포넌트 효과  — 버튼·카드·테두리 발광, 텍스트 그림자
Layer 3:          전경 파티클       — 테마별 특화 파티클 (대폭 강화)
Layer 2:          미드그라운드      — 테마별 상징 오브젝트 부유
Layer 1 (최하단): 배경 레이어      — AI 배경 이미지 + 동적 그라데이션
```

### 테마별 이펙트 상세 정의

#### 🌙 midnight — 다크 판타지 고딕
- **배경**: 심우주 성운 + 천천히 회전하는 은하 소용돌이
- **파티클**: 별똥별 (긴 꼬리 광선), 황금 룬 문자 부유, 보라빛 마법 구체
- **UI 효과**: 금박 테두리 글로우 `box-shadow: 0 0 20px gold`, 텍스트 자주빛 발광
- **특수**: 주기적 번개 섬광 (화면 가장자리), 오로라 보레알리스 흐름

#### 🌅 dawn — 아르누보 신비주의
- **배경**: 분홍·자주·황금 그라데이션 하늘, 안개 레이어
- **파티클**: 장미꽃잎 (바람에 회전하며 낙하), 황금 나비, 빛나는 이슬방울
- **UI 효과**: 아르누보 덩굴 테두리 SVG 오버레이, 따뜻한 황금빛 글로우
- **특수**: 화면 하단에서 피어오르는 안개, 간헐적 빛 기둥

#### 🌇 sunset — 모던 디지털 럭셔리
- **배경**: 홀로그램 격자 + 우주 네뷸라, 네온 오렌지·보라 그라데이션
- **파티클**: 홀로그램 육각형 조각, 네온 광선 스트릭, 디지털 데이터 스트림
- **UI 효과**: 사이버펑크 HUD 테두리 (모서리 꺾임), hover 시 디지털 글리치
- **특수**: 화면 스캔라인 미세 오버레이, 주기적 홀로그램 왜곡

#### 🌸 spring — 아니메 신비 융합
- **배경**: 벚꽃 나무 아래, 마법진이 빛나는 몽환적 분홍빛 밤
- **파티클**: 벚꽃잎 (다양한 크기·회전속도), 반짝이는 별 스파클, 마법 오브
- **UI 효과**: 파스텔 핑크·청록 글로우, 애니메이션 스타일 강조선, 빛나는 오라
- **특수**: 화면 전체 미세 보케 효과, 꽃잎이 UI 요소에 쌓였다 날아가는 연출

#### ✨ summer — 아니메 신비 융합 (여름)
- **배경**: 짙은 남색 여름밤, 반딧불 수백 개, 축제 종이등롱
- **파티클**: 반딧불 (노란 빛 명멸하며 유영), 종이등롱 부유, 금빛 물결
- **UI 효과**: 따뜻한 앰버·골드 글로우, 물결 ripple 효과
- **특수**: 화면 하단 아지랑이 heat-haze 왜곡, 은하수 별빛 흐름

#### 🍂 autumn — 다크 판타지 (가을)
- **배경**: 주황·빨강 단풍숲, 달빛, 연기
- **파티클**: 낙엽 5가지 형태·색상, 불씨 ember (아래→위), 연기 스멀
- **UI 효과**: 앰버·다크레드 글로우, 고딕 느낌 테두리 패턴
- **특수**: 화면 가장자리 연기 번짐, 바람 방향에 따른 파티클 유동

#### ❄️ winter — 아르누보 (겨울)
- **배경**: 설경 + 오로라 (초록·파랑·보라), 얼음 결정 레이어
- **파티클**: 눈송이 (6각형 결정 상세 SVG, 다양한 크기), 얼음 파편 반짝임
- **UI 효과**: 아이스 블루 글로우, glassmorphism 강화, 크리스탈 테두리
- **특수**: 숨결 김 효과, 오로라 파동이 UI 위로 흐르는 연출

### UI 컴포넌트 테마 반응 범위

| 컴포넌트 | 효과 |
|----------|------|
| 버튼 | hover 시 테마 색상 파티클 폭발 + 글로우 펄스 |
| 카드 테두리 | animated gradient border (테마 색상 rotation) |
| 헤더 | 테마 색상 subtle glow underline |
| 다이얼로그박스 | 테마별 배경 패턴 + 테두리 애니메이션 |
| 캐릭터 오라 | `CharacterAuraLayer` 테마 색상 완전 연동 |
| 네비게이션 | 활성 탭 테마 색상 glow indicator |

### 신규 컴포넌트 구조

```
src/components/effects/
├── ThemeEffectEngine.tsx     # 테마별 이펙트 설정을 CSS 변수+props로 전달 (신규)
├── ThemeParticleSystem.tsx   # 테마별 파티클 시스템 (MysticBackground 대체)
├── ThemeAtmosphereLayer.tsx  # 미드그라운드 오브젝트 레이어 (신규)
├── InteractionEffects.tsx    # hover·클릭 파티클 인터랙션 (신규)
└── ThemeUIOverlay.tsx        # UI 컴포넌트 테마 효과 오버레이 (신규)
```

### 기술 구현 방향

- `ThemeEffectEngine`: 테마별 이펙트 설정을 CSS 변수 + 컴포넌트 props로 전달
- GPU 가속: `will-change: transform, opacity` 이펙트 레이어 전체 적용
- Framer Motion `useMotionValue` + `useSpring`으로 마우스 추적 파티클
- `prefers-reduced-motion` 감지 시 모든 특수 효과 자동 비활성화 유지
- 강도 조절: `intensity: 'low'|'medium'|'high'` — 모바일 자동 `low`

---

## 3단계: 서비스 페이지 이펙트 강화 + 카드 텍스트 비노출

### 카드 하단 텍스트 비노출 규칙

| 단계 | 카드 이미지 | 하단 텍스트 |
|------|------------|------------|
| 카드 섞기 (Shuffle) | 뒷면 | 없음 |
| 카드 펼치기 (Spread) | 앞면 표시 ✓ | 숨김 |
| 카드 선택 + 뒤집기 | 앞면 표시 ✓ | 숨김 |
| AI 리딩 완료 | 앞면 표시 ✓ | reveal 애니메이션으로 등장 |
| 전체 리딩 완료 | 앞면 표시 ✓ | 완전 공개 |

**구현:**
- `CardFace` 컴포넌트에 `showLabel: boolean` prop 추가
- `false`일 때 카드 하단 이름·문구 영역 `display: none`
- reveal 시 `AnimatePresence` + fade-in + 위로 슬라이드 애니메이션
- `useReadingReveal` hook (신규): 카드별 reveal 상태 관리

### 타로 서비스 이펙트

| 단계 | 현재 | 개선 |
|------|------|------|
| 카드 덱 등장 | 기본 더미 표시 | 마법 소환 연출, 3D 원근감 더미, 마법진 회전, 파티클 폭발 |
| 카드 섞기 | 기본 shuffle | 공중 흩날림 + 재집결, 카드 궤적 잔상(trail), 완료 시 빛 폭발 |
| 카드 스프레드 | 단순 배치 | 마법으로 끌려오는 순차 등장, 착지 시 충격파 ripple, 완료 시 마법진 오버레이 |
| 카드 선택 | 기본 클릭 | hover 부유 + 테마 오라, 클릭 시 3D Y축 360° 뒤집기, 빛 폭발 + 파티클 방사 |
| AI 리딩 완료 | 텍스트 표시 | 카드 하단 텍스트 reveal, 테두리 glow 점등 |

### 사주 서비스 이펙트

| 단계 | 개선 내용 |
|------|-----------|
| 서비스 입장 | 천문도(오행 기호)가 화면 중앙에 그려지며 등장하는 인트로 애니메이션 |
| 사주 차트 등장 | 8개 기둥 하나씩 빛과 함께 순차 등장, 오행 색상(청·적·황·흑·백) 발광 |
| 대운 타임라인 | 좌→우 빛의 선이 그어지며 등장, 현재 대운 위치 펄스 애니메이션 |
| AI 리딩 진행 | 배경에 오행 기호가 서서히 나타났다 사라지는 ambient 연출 |

### 신점 서비스 이펙트

| 단계 | 개선 내용 |
|------|-----------|
| 오방색 배경 | 청·적·황·흑·백 빛이 화면 가장자리에서 중앙으로 흘러들어 합쳐지는 인트로 |
| 질문 입력 | 타이핑 중 주변 신령스러운 파티클 모여드는 연출, 전송 시 에너지 폭발 |
| AI 응답 스트리밍 | 텍스트가 신탁처럼 번쩍이며 등장, 중요 키워드에 테마 색상 glow 강조 |

### 공통: 페이지 전환 이펙트

| 전환 | 효과 |
|------|------|
| 서비스 시작 → 세션 | 테마 색상 wipe (화면 전체를 빛이 쓸고 지나감) |
| 세션 → 결과 | 파티클 폭발 후 결과 페이지 fade-in |
| 결과 → 홈 | 부드러운 bokeh dissolve |

### 신규 컴포넌트 구조

```
src/hooks/
└── useReadingReveal.ts        # 카드별 reveal 상태 관리 (신규)

src/components/card/
└── CardFace.tsx               # showLabel prop 추가

src/components/tarot/
├── ShuffleCeremonyV2.tsx      # 마법 소환 연출로 전면 재작성
├── CardSpreadEffects.tsx      # 스프레드 이펙트 강화 (신규)
└── CardFlipEffect.tsx         # 3D 뒤집기 + 빛 폭발 (신규)

src/components/saju/
└── SajuChartReveal.tsx        # 차트 순차 등장 애니메이션 (신규)

src/components/shinjeom/
└── ShinjeomEnergyEffect.tsx   # 오방색 에너지 인트로 (신규)
```

---

## 이미지 생성 정책

- 기존 이미지: `public/images/backup/` 자동 이동 (복구 가능)
- 생성 실패 시: 해당 슬롯만 재시도, 나머지 유지
- i18n: 카드명·텍스트는 프롬프트에 포함하지 않음 (no text 강제)
- 저작권: Flux 1.1 Pro Ultra 생성 이미지는 상업적 사용 가능 (Replicate 이용 약관 기준)

## 의존성 관리

- 신규 패키지: `replicate` (scripts 전용, devDependency)
- 런타임 의존성 추가 없음 (이미지는 정적 에셋)
- 환경변수: `REPLICATE_API_TOKEN` (.env.local, .env.example에 주석 추가)
