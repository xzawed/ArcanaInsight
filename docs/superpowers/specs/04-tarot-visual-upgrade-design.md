> **Status**: 구현 완료 (방식 변경)
> **Note**: 설계 시점(2026-03-29) 기준 문서. 구현 과정에서 아래 항목이 변경됨:
> - **SpriteAnimator**: 이 스펙의 스프라이트 시트(CSS background-position 오프셋) 방식은 미채택
>   → 실제로는 **단일 누끼 이미지 + Framer Motion float 애니메이션** 방식으로 구현 (02번 스펙 방식 채택)
> - "잠긴 캐릭터" 개념 폐기 → 전체 12명 `unlocked: true`
> - `VignetteOverlay.tsx` 미생성

# 타로 상담 페이지 비주얼 대개선 — 디자인 스펙

## 개요

타로 상담 세션 페이지를 비주얼 노벨 스타일로 전면 개편하고, 캐릭터 스프라이트 애니메이션과 미니멀 라인아트 카드 디자인을 적용하여 전반적인 디자인 퀄리티를 대폭 향상시킨다.

## 1. 세션 페이지 레이아웃 — 비주얼 노벨 스타일

### 구조

- **상단 무대 (70~75%)**: 배경 이미지 위에 캐릭터(좌측)와 카드(중앙~우측) 배치. 캐릭터는 반신 크기로 무대 하단에 앵커링. 카드 선택/스프레드 애니메이션이 무대 위에서 진행.
- **하단 대화창 (25~30%)**: 반투명 배경 + 블러. 캐릭터 이름 태그 + 타이핑 효과 대화. 사용자 선택지도 이 영역에 버튼으로 표시.
- **모바일**: 동일 구조, 무대/대화창 비율 60/40으로 조정.

### 기존 3분할 레이아웃 제거

현재 `session/page.tsx`의 좌(캐릭터 35%) / 중(카드 30%) / 우(채팅 35%) 구조를 비주얼 노벨 2영역 구조로 교체.

## 2. 캐릭터 스프라이트 애니메이션 시스템

### 동작 세트 (아르카나 캐릭터)

| 동작 | 프레임 수 | 루프 방식 | 트리거 |
|------|----------|----------|--------|
| idle (대기) | 6프레임 | 무한 루프 | 기본 상태, 사용자 입력 대기 |
| talking (말하기) | 6프레임 | 대사 중 루프 | AI 응답 스트리밍 중 |
| happy (기쁨) | 4프레임 | 1회 재생 → idle 복귀 | 긍정적 카드 해석, 인사 |
| serious (심각) | 4프레임 | 1회 재생 → idle 복귀 | 어려운 카드, 경고성 해석 |
| mystical (신비) | 8프레임 | 카드 리딩 중 루프 | 카드 뒤집기, 스프레드 배치 |
| surprised (놀람) | 4프레임 | 1회 재생 → idle 복귀 | 특별한 카드 조합 발견 |

### 구현 방식

- **스프라이트 시트(PNG)**: 동작별로 가로 배열된 1장의 이미지 파일
- **프레임 전환**: CSS `steps()` 기반 애니메이션 또는 Framer Motion `animate`로 `background-position` 이동
- **상태 연동**: `useCharacterStore`의 `currentMood` 변경 시 해당 동작 스프라이트 시트로 전환
- **전환 효과**: Framer Motion `AnimatePresence`로 동작 간 크로스페이드
- **이미지 생성**: Grok AI로 일관된 캐릭터 포즈 변형 생성 → 스프라이트 시트로 합성
- **총 리소스**: 6개 스프라이트 시트 (약 32프레임)

### 파일 구조

```
public/images/characters/arcana/sprites/
├── idle.png        (6프레임 가로 배열)
├── talking.png     (6프레임)
├── happy.png       (4프레임)
├── serious.png     (4프레임)
├── mystical.png    (8프레임)
└── surprised.png   (4프레임)
```

## 3. 카드 디자인 시스템

### 앞면 — 미니멀 라인아트 + 그라디언트

- **배경**: 세로 그라디언트 `#0a0a1a → #1a0a3e → #0a0a1a`, conic gradient 오버레이로 미묘한 빛 효과
- **테두리**: 보라/금 그라디언트 보더 (`#d4af37 → #8b5cf6 → #d4af37`)
- **심볼**: 카드별 SVG 라인아트 아이콘 (금색 스트로크, 투명 fill)
  - 메이저 아르카나 22장: 고유 심볼 (Fool=별, Magician=무한대, High Priestess=달 등)
  - 마이너 아르카나: 수트별 통일 심볼(완드/컵/소드/펜타클) + 숫자 변형
- **텍스트**: 로마 숫자(상단), 카드명 영문(하단), 한글명(최하단)
- **원형 프레임**: 심볼을 감싸는 원형 라인 + 방사형 미세 라인

### 뒷면 — 기하학 만다라

- 동심원 3겹 (금색 외곽, 보라 중간, 금색 내부)
- 십자 + 대각선 라인아트 (금색/보라 그라디언트)
- 중앙 `✦` 심볼, 4모서리 `✧` 장식
- 이중 보더 프레임 (외곽 금색 실선, 내부 금색 점선)

### 카드 인터랙션

- **호버**: `y: -8px, scale: 1.02` + 금색 글로우 `box-shadow: 0 0 20px rgba(212,175,55,0.3)`
- **선택 뒤집기**: 3D `rotateY: 180deg` (0.6s ease) + 금색 빛 플래시
- **스프레드 배치**: spring 물리 (`stiffness: 100, damping: 15`) + 0.2s 스태거

### 제작 범위

- 메이저 아르카나 22장: 고유 SVG 라인아트 심볼
- 마이너 아르카나 4수트: 수트별 기본 템플릿 SVG (4종)
- 카드 뒷면: 공통 1종
- **총 SVG 약 27종** (22 + 4 + 1)

### 카드 컴포넌트 구조

```
src/components/card/
├── CardItem.tsx       — 개별 카드 (앞면/뒷면, 뒤집기 애니메이션)
├── CardDeck.tsx       — 선택용 카드 덱 (팬 레이아웃)
├── CardSpread.tsx     — 스프레드 위치 배치
├── CardFace.tsx       — (신규) SVG 라인아트 앞면 렌더링
└── CardBack.tsx       — (신규) 기하학 만다라 뒷면 렌더링
```

## 4. 전체 비주얼 품질 개선

### 배경 & 분위기

- 세션 무대 배경: 신비로운 점술실 배경 (기존 `session-bg.jpg` 활용 또는 개선)
- **파티클 오버레이**: 떠다니는 빛 입자 CSS 애니메이션. 카드 리딩 중 밀도/속도 증가
- **비네팅**: 화면 가장자리 `radial-gradient` 어둡게 처리

### 대화창 개선

- **글래스모피즘**: `backdrop-blur-md` + `bg-arcana-card/80` + 보라 상단 보더
- **캐릭터 이름 태그**: 보라→인디고 그라디언트 바 + 이름 텍스트
- **타이핑 인디케이터**: 물결치는 점 3개 (`···`) 바운스 애니메이션
- **대사 진행 표시**: 하단 ▼ 깜빡임 (비주얼 노벨 관례)

### 카드 선택 UX

- 덱 호버 시 금색 글로우 + 카드 부상 효과
- 선택 카드 → 스프레드 위치로 spring 물리 이동
- 뒤집기 시 금색 빛 플래시 이펙트 오버레이

### 페이지 전환

- 주제 선택 → 세션 진입: 페이드 인/아웃 트랜지션
- Framer Motion `AnimatePresence` + `layout` 속성 활용

### 타이포그래피

- 카드명, 캐릭터명: 세리프 폰트 추가 (Noto Serif KR 또는 Playfair Display)
- 금색(`arcana-gold`) 하이라이트를 주요 UI 요소에 적용

## 5. 영향 범위

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/tarot/session/page.tsx` | 비주얼 노벨 레이아웃으로 전면 개편 |
| `src/components/character/CharacterDisplay.tsx` | 스프라이트 애니메이션 시스템으로 교체 |
| `src/components/character/TypingDialogue.tsx` | 비주얼 노벨 대화창 스타일로 개편 |
| `src/components/card/CardItem.tsx` | 라인아트 카드 디자인 적용 |
| `src/components/card/CardDeck.tsx` | 호버/선택 인터랙션 개선 |
| `src/components/card/CardSpread.tsx` | spring 물리 배치 애니메이션 개선 |
| `src/hooks/useCharacter.ts` | 스프라이트 애니메이션 상태 추가 |
| `src/hooks/useCardAnimation.ts` | 카드 이펙트 상태 추가 |
| `src/app/globals.css` | 파티클, 스프라이트 keyframes 추가 |
| `src/app/layout.tsx` | 세리프 폰트 추가 |

### 신규 파일

| 파일 | 내용 |
|------|------|
| `src/components/card/CardFace.tsx` | SVG 라인아트 앞면 컴포넌트 |
| `src/components/card/CardBack.tsx` | 기하학 만다라 뒷면 컴포넌트 |
| `src/components/character/SpriteAnimator.tsx` | 스프라이트 시트 프레임 재생기 |
| `src/components/effects/ParticleOverlay.tsx` | 파티클 효과 컴포넌트 |
| `src/components/effects/VignetteOverlay.tsx` | 비네팅 효과 컴포넌트 |
| `src/components/chat/DialogueBox.tsx` | 비주얼 노벨 스타일 대화창 |
| `src/data/cards/symbols.ts` | 메이저 아르카나 SVG 심볼 데이터 |

### 이미지 리소스 생성

| 리소스 | 수량 | 생성 방법 |
|--------|------|----------|
| 스프라이트 시트 (아르카나) | 6장 | Grok AI 포즈 생성 → 합성 |
| 메이저 아르카나 SVG 심볼 | 22종 | 코드로 직접 제작 |
| 마이너 수트 SVG 템플릿 | 4종 | 코드로 직접 제작 |
| 카드 뒷면 SVG | 1종 | 코드로 직접 제작 |

## 6. 제외 사항

- 잠긴 캐릭터(미코, 선화, 호시)의 스프라이트는 이번 스코프에서 제외 (아르카나만)
- 사운드/오디오 효과 없음
- 결과 공유 페이지(`/tarot/result/[id]`)는 기존 유지 (세션 페이지만 개편)
- 주제 선택 페이지(`/tarot/page.tsx`)는 기존 유지
