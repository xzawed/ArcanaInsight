# Visual FX Revitalization — Design Spec

**작성일**: 2026-05-01  
**상태**: 승인 완료

---

## 배경 및 목표

현재 ArcanaInsight의 캐릭터·애니메이션·비주얼 효과가 밋밋하다는 피드백. 더 신비롭고 몰입감 있는 시각 경험, 캐릭터 이미지에 생기, 프레임 간 자연스러운 전환을 원함. 성능과 서비스 품질은 유지해야 함.

### 확정된 방향 (브레인스토밍 결과)

| 항목 | 선택 |
|---|---|
| 배경 분위기 | B+C — 영혼의 안개(Ethereal Mist) + 성좌·룬(Arcane Sigil) |
| 캐릭터 애니메이션 | B+C — 호흡 글로우 + 무드 반응형 파티클 |
| 프레임 전환 | B — 글로우 버스트 |

---

## 접근법: 점진적 레이어 (Approach 1)

기존 컴포넌트 구조를 유지하면서 효과 레이어만 추가한다. 기존 672개 테스트에 영향 없음. 컴포넌트별 독립 롤백 가능.

---

## 아키텍처

### 컴포넌트 구조

```
페이지 (HeroSection / TarotSession / SajuSession / ShinjeomSession)
  └── MysticBackground [신규]          ← 안개 + 별자리·룬 배경
  └── CharacterDisplay [수정]
        └── CharacterAuraLayer [신규]  ← 오라 글로우 + 파티클
        └── SpriteAnimator [수정]
              └── GlowBurstRing [신규 인라인] ← mood 전환 시 1회 버스트
```

### 파일 목록

| 파일 | 유형 | 역할 |
|---|---|---|
| `src/components/effects/MysticBackground.tsx` | 신규 | 안개 + 별자리·룬 배경 레이어 |
| `src/components/character/CharacterAuraLayer.tsx` | 신규 | 오라 글로우 + mood 반응 파티클 |
| `src/components/character/SpriteAnimator.tsx` | 수정 | idle 루프 업그레이드 + GlowBurstRing 인라인 정의 |
| `src/components/character/CharacterDisplay.tsx` | 수정 | CharacterAuraLayer 래핑 |
| `src/components/home/HeroSection.tsx` | 수정 | `<MysticBackground service="home" />` 삽입 |
| `src/app/tarot/session/page.tsx` | 수정 | `<MysticBackground service="tarot" />` 삽입 |
| `src/app/saju/session/page.tsx` | 수정 | `<MysticBackground service="saju" />` 삽입 |
| `src/app/shinjeom/session/page.tsx` | 수정 | `<MysticBackground service="shinjeom" />` 삽입 |

---

## 컴포넌트 상세 설계

### 1. MysticBackground

**경로**: `src/components/effects/MysticBackground.tsx`

**Props**:
```ts
interface MysticBackgroundProps {
  service: "home" | "tarot" | "saju" | "shinjeom";
}
```

**레이어 구조** (z-index 낮은 순):
1. SVG `feTurbulence + feDisplacementMap` 안개 필터 — 유기적 흔들림
2. CSS 안개 div (gradient + blur) — 바닥에서 위로 피어오름
3. SVG 별자리 선 — `strokeDashoffset` 애니메이션으로 그려지는 연출
4. 서비스별 룬 심볼

**z-index**: `z-[5]` — ParticleOverlay(z-10)보다 아래, 배경 이미지보다 위

**서비스별 스타일**:

| service | 안개 색상 | 룬 심볼 | 안개 강도 |
|---|---|---|---|
| home | `rgba(88,28,135,0.12)` | 별자리 선만 | 낮음 |
| tarot | `rgba(88,28,135,0.18)` | ✦ ✧ (별, 점성술) | 중간 |
| saju | `rgba(146,64,14,0.15)` | ☰☱☲☳ (팔괘 4개) | 중간 |
| shinjeom | `rgba(30,58,138,0.15)` | 오방색 원형 구조 | 높음 |

**접근성**: `prefers-reduced-motion: reduce` 시 모든 애니메이션 정지 → 정적 글로우만 렌더링

**Fallback**: SVG feTurbulence 미지원 시 필터 없는 정적 안개 div로 자동 대체

---

### 2. CharacterAuraLayer

**경로**: `src/components/character/CharacterAuraLayer.tsx`

**Props**:
```ts
interface CharacterAuraLayerProps {
  mood: Mood;
  isTransitioning: boolean;
}
```

**내부 요소**:
- 오라 글로우 링: 캐릭터 실루엣을 감싸는 타원형. `scale + opacity` 3.5s 루프 (SpriteAnimator 호흡과 동기화)
- 상시 파티클 3개: 작은 별. 위로 떠오르며 페이드아웃
- burst 파티클 5개: `isTransitioning=true` 시 추가. 1.2초 후 소멸

**파티클 위치**: 캐릭터 어깨·가슴 높이에서 위로 떠오름. 좌우 분산은 `Math.random()` 렌더 중 직접 호출 금지(SSR hydration 에러 #418). 파티클별 고정 offset 배열(`[-24, 0, 24]` px 등)로 사전 정의.

**mood별 색상**:

| mood | 오라 색상 | 파티클 색상 | 강도 |
|---|---|---|---|
| default | `rgba(139,92,246,0.5)` (보라) | 연보라 | 낮음 (호흡만) |
| smile | `rgba(212,175,55,0.6)` (황금) | 황금·흰 | 중간 |
| mystical | `rgba(139,92,246,0.8)` (강한 보라) | 보라·파랑 | 높음 |
| serious | `rgba(99,102,241,0.5)` (인디고) | 인디고 | 낮음 |
| surprised | `rgba(251,146,60,0.5)` (주황) | 주황·흰 | 높음 |
| wink | `rgba(244,114,182,0.5)` (핑크) | 핑크 | 중간 |

**burst 가드**: `isTransitioning` ref로 burst 중 추가 mood 전환 시 새 burst 스킵

---

### 3. SpriteAnimator 변경사항

**경로**: `src/components/character/SpriteAnimator.tsx`

#### idle 루프 업그레이드

기존: `y: [0,-6,0]` + `scale: [1,1.01,1]`

변경: `y` + `scale` + `filter: drop-shadow` 3중 복합 애니메이션

```ts
// LOOP_MOTION.float 변경 예시
float: {
  y: [0, -6, 0],
  scale: [1, 1.01, 1],
  filter: [
    "drop-shadow(0 0 6px rgba(139,92,246,0.3))",
    "drop-shadow(0 0 18px rgba(139,92,246,0.7))",
    "drop-shadow(0 0 6px rgba(139,92,246,0.3))",
  ],
},
```

캐릭터별 idle animation type(float·breathe·mystical 등)에 따라 각각 다른 drop-shadow 값 적용.

**Fallback**: `filter` 미지원 브라우저에서 기존 Y축 float만 동작 (progressive enhancement)

#### GlowBurstRing (인라인 정의)

`SpriteAnimator.tsx` 내에 50줄 이하로 정의하는 내부 컴포넌트.

**트리거**: `AnimatePresence key={mood}` — mood 변경 시 exit 직전 자동 발생

**애니메이션**:
```ts
// exit 애니메이션
scale: [1, 2.5],
opacity: [0.8, 0],
// duration: 0.45s, ease: "easeOut"
```

**크기**: 캐릭터 이미지 컨테이너의 110%×110%  
**색상**: CharacterAuraLayer mood 색상 테이블과 동일  
**overflow**: 허용 (`overflow: visible` 부모 필요)

---

### 4. CharacterDisplay 변경사항

**경로**: `src/components/character/CharacterDisplay.tsx`

기존 mask·layout 구조 유지. CharacterAuraLayer를 SpriteAnimator와 같은 레벨에 추가.

```tsx
// 변경 후 구조 (개념)
<div className={wrapperClass}>
  <CharacterAuraLayer mood={mood} isTransitioning={isTransitioning} />
  <SpriteAnimator ... />
</div>
```

`isTransitioning` 상태: mood prop이 변경되는 순간 `true` → 0.5초 후 `false` (useEffect + setTimeout)

---

## 데이터 흐름

```
Session / HeroSection
  └─ mood prop ──→ CharacterDisplay
                       ├─ mood ──→ CharacterAuraLayer (오라 색상 + 파티클)
                       └─ mood ──→ SpriteAnimator
                                       └─ mood 변경 감지 ──→ GlowBurstRing (1회)

페이지 레이아웃
  └─ service prop ──→ MysticBackground (mood 무관, 독립)
```

기존 `mood` prop 흐름 그대로 유지. 새 컴포넌트들은 같은 prop을 구독만 함.

---

## 성능 보장

- 모든 애니메이션: `transform` + `opacity` + `filter` 만 사용 → GPU 합성 레이어
- `will-change: transform` — SpriteAnimator + CharacterAuraLayer에 적용
- 파티클: DOM 요소 최대 8개 (상시 3 + burst 5). 소멸 후 DOM에서 제거
- MysticBackground feTurbulence: `prefers-reduced-motion` 감지 시 정적 렌더링 fallback

---

## 에러 처리

| 상황 | 처리 |
|---|---|
| SVG feTurbulence 미지원 | CSS 정적 안개 div fallback |
| `prefers-reduced-motion: reduce` | 모든 애니메이션 정지, 정적 글로우 유지 |
| burst 중 추가 mood 전환 | `isTransitioning` ref 가드로 새 burst 스킵 |
| `filter` CSS 미지원 | 기존 Y축 float만 동작 (progressive enhancement) |
| 이미지 로드 실패 | 기존 SpriteAnimator 핸들링 그대로 유지 |

---

## 테스트 전략

### 기존 테스트 (672개) — 영향 없음

- SpriteAnimator 수정: `animate` 값 변경만, 스냅샷 테스트 없음
- CharacterDisplay 수정: props 인터페이스 변경 없음

### 신규 단위 테스트 (Vitest, 예상 +8개)

| 대상 | 케이스 |
|---|---|
| `CharacterAuraLayer` | mood별 올바른 색상 스타일 렌더링 (6 mood) |
| `CharacterAuraLayer` | `isTransitioning=true` 시 burst 파티클 렌더링 |
| `MysticBackground` | service prop별 올바른 룬 심볼 렌더링 (4 service) |
| `GlowBurstRing` | mood 변경 시 마운트·언마운트 확인 |

### E2E

- 버튼 텍스트·셀렉터 변경 없음 → 기존 E2E 스펙 영향 없음
- 시각 회귀: 스크린샷 수동 검토 (Playwright 스냅샷 미도입 상태 유지)

---

## 범위 외 (Out of Scope)

- 마우스 시차(parallax) 인터랙션
- WebGL / Canvas 기반 효과
- 캐릭터 이미지 AI 재생성
- 홈 이외 페이지의 배경 이미지 교체
- 결과 공유 페이지(result) OG 이미지 추가 변경
