# ArcanaInsight UI 고도화 — 구현 기반 계획
> **목적:** Claude Design 결과물 수령 후 즉시 구현 착수 가능하도록 사전 기반 작업 + 영역별 구현 청사진 정리  
> **연계 문서:** `docs/design/design-brief.md` (의뢰서)

---

## Phase 0 — 선행 기반 작업 (디자인 결과 수령 전 즉시 시작 가능)

디자인 결과를 기다리는 동안 공통 인프라를 미리 구축합니다.

### 0-1. 애니메이션 유틸리티 라이브러리 신설

**파일:** `src/lib/animation-variants.ts`

```typescript
// Framer Motion variant 모음 — 캐릭터 idle, 파티클, 전환 등 공통 사용
export const idleVariants = {
  "float": { y: [0, -8, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  "float-strong": { y: [0, -12, 0], transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } },
  "bounce": { y: [0, -6, 0, -3, 0], transition: { duration: 2, repeat: Infinity } },
  "breathe": { scale: [1, 1.015, 1], transition: { duration: 5, repeat: Infinity } },
  "drift": { x: [0, 4, 0, -4, 0], y: [0, -3, 0], transition: { duration: 6, repeat: Infinity } },
};

export const glowVariants = { /* 오라 파동 */ };
export const revealVariants = { /* 카드 공개 */ };
export const celebrationVariants = { /* 리딩 완료 축하 */ };
```

### 0-2. 파티클 엔진 추상화

**파일:** `src/lib/particle-engine.ts`

- 현재 각 이펙트 컴포넌트마다 파티클 로직이 중복됨
- 단일 `createParticles(config: ParticleConfig)` 함수로 추상화
- 형태(shape), 수량, 속도, opacity, 색상을 config로 주입 가능하게
- `prefers-reduced-motion` 체크 내장

### 0-3. 테마 이펙트 확장 CSS 변수 추가

**파일:** `src/styles/theme-effects.css`

새 테마 이펙트에 필요한 CSS 변수 슬롯 미리 확보:
```css
:root {
  --theme-particle-shape: "circle";     /* 파티클 SVG 형태 */
  --theme-particle-count: 30;           /* 기본 파티클 수량 */
  --theme-particle-speed: 1;            /* 속도 배율 */
  --theme-bg-intensity: 1;              /* 배경 강도 배율 (phase별 변경) */
  --theme-character-glow-radius: 80px;  /* 캐릭터 오라 반경 */
}
```

### 0-4. Parallax 훅 신설

**파일:** `src/hooks/useParallax.ts`

```typescript
// 마우스 위치 → 레이어별 transform 반환
export function useParallax(intensity: "far" | "mid" | "near") {
  // "far": ±5px, "mid": ±15px, "near": ±30px
  // 모바일에서는 비활성화 (gyroscope 대체 or 고정)
}
```

### 0-5. 단계별 배경 강도 Zustand 슬롯 추가

**파일:** `src/hooks/useSession.ts` (타로), `src/hooks/useSajuSession.ts`, `src/hooks/useShinjeomSession.ts`

현재 `phase` 값에 따라 배경 강도를 파생하는 selector 추가:
```typescript
// phase → bgIntensity 매핑
const bgIntensityMap = {
  "card-shuffle": 1.0,
  "card-select": 1.0,
  "reading": 0.6,   // 집중
  "result": 1.3,    // 축하
};
```

---

## Phase 1 — 영역 A: 캐릭터 생동감 구현

**디자인 결과물 수령 후 시작 | 예상 작업량: 3~4일**

### 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/components/character/CharacterDisplay.tsx` | 수정 | idle 애니메이션 적용, 오라 컴포넌트 연결 |
| `src/components/character/CharacterAuraLayer.tsx` | 수정 | 캐릭터별 effectTheme 기반 파티클 형태·색상 차별화 |
| `src/data/characters/index.ts` | 수정 | `idleAnimation` 필드 타입 확장 (현재 string → union type) |
| `src/lib/animation-variants.ts` | 신규 | Phase 0-1에서 작성 |
| `src/app/tarot/session/page.tsx` | 수정 | 캐릭터 영역 높이 `h-[85vh]` 또는 설계값 반영 |
| `src/app/saju/session/page.tsx` | 수정 | 동일 패턴 |
| `src/app/shinjeom/session/page.tsx` | 수정 | 동일 패턴 |

### 핵심 구현 패턴

```tsx
// CharacterDisplay.tsx — 변경 방향
<motion.div
  animate={idleVariants[character.idleAnimation]}  // 캐릭터별 idle
  className="character-container"
>
  {/* 현재 mood 이미지 (크로스페이드) */}
  <AnimatePresence mode="crossFade">
    <motion.img
      key={currentMood}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      src={character.expressions[currentMood]}
    />
  </AnimatePresence>
  {/* 캐릭터별 오라 레이어 */}
  <CharacterAuraLayer
    primaryColor={character.effectTheme.primary}
    particleStyle={character.effectTheme.particleStyle}
    intensity={phase === "result" ? "high" : "normal"}
  />
</motion.div>
```

### 구현 주의사항
- `AnimatePresence mode="crossFade"` — key 변경 시 이전 이미지 fade-out + 신규 fade-in 동시
- 모바일: idle 애니메이션 amplitude 50% 축소 (배터리/성능)
- `prefers-reduced-motion`: idle 완전 비활성화, 오라만 static으로 표시

---

## Phase 2 — 영역 B: 배경 Parallax & 서비스별 오브젝트

**디자인 결과물 수령 후 시작 | 예상 작업량: 4~5일**

### 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/components/effects/MysticBackground.tsx` | 수정 | 단일 레이어 → 3레이어 Parallax 분리 |
| `src/hooks/useParallax.ts` | 신규 | Phase 0-4에서 작성 |
| `src/components/effects/ServiceBackground.tsx` | 수정 | 서비스별 오브젝트 주입 인터페이스 추가 |
| `src/components/effects/TarotBackgroundObjects.tsx` | 신규 | 타로 전용 배경 오브젝트 (유성, 카드 실루엣, 별자리선) |
| `src/components/effects/SajuBackgroundObjects.tsx` | 신규 | 사주 전용 (오행 심볼, 팔괘) |
| `src/components/effects/ShinjeomBackgroundObjects.tsx` | 신규 | 신점 전용 (수정구, 안개, 불꽃) |

### 핵심 구현 패턴

```tsx
// MysticBackground.tsx — 3레이어 구조
const { transformFar, transformMid, transformNear } = useParallax();

return (
  <div className="mystic-background-container">
    {/* Far layer — 별자리, 큰 오브젝트 */}
    <motion.div style={transformFar} className="layer-far opacity-30">
      <ServiceObjects service={serviceType} layer="far" />
    </motion.div>
    {/* Mid layer — 중간 오브젝트 */}
    <motion.div style={transformMid} className="layer-mid opacity-60">
      <ServiceObjects service={serviceType} layer="mid" />
    </motion.div>
    {/* Near layer — 근거리 작은 오브젝트 */}
    <motion.div style={transformNear} className="layer-near opacity-90">
      <ServiceObjects service={serviceType} layer="near" />
    </motion.div>
  </div>
);
```

### 구현 주의사항
- `useParallax`는 `window.addEventListener("mousemove")` 사용 — `useEffect` 내 등록
- 모바일: mousemove 비활성화, DeviceOrientation API로 대체 (또는 고정)
- SVG 오브젝트는 디자인 결과물에서 제공받은 형태 그대로 컴포넌트화

---

## Phase 3 — 영역 C: 테마별 자연 이펙트

**디자인 결과물 수령 후 시작 | 예상 작업량: 5~7일 (테마 7종)**

### 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/components/effects/ThemeAtmosphereLayer.tsx` | 수정 | 테마별 파티클 형태·속성 분기 |
| `src/components/effects/ParticleOverlay.tsx` | 수정 | 형태 SVG 주입 방식으로 리팩토링 |
| `src/styles/theme-effects.css` | 수정 | 테마별 자연현상 CSS 애니메이션 추가 |
| `src/components/effects/ThemeEffectEngine.tsx` | 수정 | 새 CSS 변수 주입 (particle-shape, count, speed) |
| `src/lib/particle-engine.ts` | 신규 | Phase 0-2에서 작성 |
| `src/data/themes.ts` (신규 생성) | 신규 | 테마별 파티클 config 데이터 분리 |

### 테마별 파티클 config 구조

```typescript
// src/data/themes.ts
export const themeParticleConfigs: Record<ThemeId, ParticleConfig> = {
  midnight: {
    shapes: ["shooting-star", "aurora-ribbon"],
    count: { desktop: 15, mobile: 8 },
    speed: 0.8,
    opacity: { min: 0.3, max: 0.9 },
    colors: ["#a78bfa", "#818cf8", "#ffffff"],
  },
  spring: {
    shapes: ["cherry-petal", "butterfly"],
    count: { desktop: 25, mobile: 12 },
    speed: 0.5,
    opacity: { min: 0.5, max: 1.0 },
    colors: ["#fda4af", "#fbcfe8", "#f9a8d4"],
  },
  // ... 나머지 5종
};
```

### 테마 전환 크로스페이드 구현

```tsx
// ThemeAtmosphereLayer.tsx — 전환 처리
<AnimatePresence>
  <motion.div
    key={currentTheme}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 1.0 }}
  >
    <ParticleSystem config={themeParticleConfigs[currentTheme]} />
  </motion.div>
</AnimatePresence>
```

### 구현 주의사항
- 파티클 SVG 형태는 디자인 결과물의 스펙 시트 기반으로 생성
- 각 테마 파티클은 독립 컴포넌트로 분리 (spring → `SpringPetals.tsx` 등)
- 모바일 count 반드시 절반 이하로 제한

---

## Phase 4 — 영역 D: 홈 페이지 고도화

**디자인 결과물 수령 후 시작 | 예상 작업량: 4~5일**

### 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/app/page.tsx` | 수정 | 레이아웃 구조 재편, 신규 컴포넌트 연결 |
| `src/components/home/HeroSection.tsx` | 수정 | 풀스크린 히어로로 재설계 |
| `src/components/home/ServiceSelector.tsx` | 신규 | 서비스 선택 인터랙션 컴포넌트 |
| `src/components/home/CharacterGallery.tsx` | 수정 | 3D perspective 배치 |

### 핵심 구현 패턴

```tsx
// HeroSection.tsx — 풀스크린 히어로
<section className="relative h-[100dvh] w-full overflow-hidden">
  {/* 살아있는 배경 */}
  <MysticBackground serviceType="home" />
  <ThemeAtmosphereLayer intensity="high" />
  
  {/* 히어로 캐릭터 — 화면 80% */}
  <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[85dvh]">
    <CharacterDisplay character={heroCharacter} showAura size="hero" />
  </motion.div>
  
  {/* CTA */}
  <div className="absolute bottom-8 left-0 right-0 flex justify-center">
    <HeroCTA />
  </div>
</section>
```

---

## Phase 5 — 영역 E: 카드 공개 & 리딩 결과

**디자인 결과물 수령 후 시작 | 예상 작업량: 3~4일**

### 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/components/tarot/CardFlipEffect.tsx` | 수정 | reveal 시 glow burst + 파티클 방사 추가 |
| `src/components/tarot/CardRevealBurst.tsx` | 신규 | 카드 공개 순간 빛 폭발 이펙트 |
| `src/components/session/ResultTextCard.tsx` | 수정 | 테마색 흐르는 테두리 애니메이션 |
| `src/components/tarot/ReadingCelebration.tsx` | 신규 | 리딩 완료 축하 연출 (confetti + 캐릭터 반응) |
| `src/app/tarot/session/page.tsx` | 수정 | result phase에서 ReadingCelebration 트리거 |
| `src/lib/share-utils.ts` | 수정 | 공유 이미지 생성 로직 개선 |

### 카드 reveal 구현 패턴

```tsx
// CardFlipEffect.tsx — 공개 시 burst
const handleReveal = () => {
  setIsRevealed(true);
  triggerBurst(); // CardRevealBurst 컴포넌트 트리거
};

// CardRevealBurst.tsx
<AnimatePresence>
  {isBursting && (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 1, scale: 0.5 }}
      animate={{ opacity: 0, scale: 2 }}
      exit={{}}
      transition={{ duration: 0.4 }}
    >
      <GlowBurst color={themeColor} particleCount={15} />
    </motion.div>
  )}
</AnimatePresence>
```

---

## 파일 변경 전체 매트릭스

| 파일 | 영역 A | 영역 B | 영역 C | 영역 D | 영역 E |
|---|---|---|---|---|---|
| `src/lib/animation-variants.ts` | 신규 | | | 사용 | 사용 |
| `src/lib/particle-engine.ts` | | | 신규 | | |
| `src/hooks/useParallax.ts` | | 신규 | | | |
| `src/data/themes.ts` | | | 신규 | | |
| `src/styles/theme-effects.css` | | | 수정 | | |
| `src/components/effects/ThemeEffectEngine.tsx` | | | 수정 | | |
| `src/components/effects/ThemeAtmosphereLayer.tsx` | | | 수정 | | |
| `src/components/effects/ParticleOverlay.tsx` | | | 수정 | | |
| `src/components/effects/MysticBackground.tsx` | | 수정 | | 사용 | |
| `src/components/effects/ServiceBackground.tsx` | | 수정 | | | |
| `src/components/effects/TarotBackgroundObjects.tsx` | | 신규 | | | |
| `src/components/effects/SajuBackgroundObjects.tsx` | | 신규 | | | |
| `src/components/effects/ShinjeomBackgroundObjects.tsx` | | 신규 | | | |
| `src/components/character/CharacterDisplay.tsx` | 수정 | | | 수정 | |
| `src/components/character/CharacterAuraLayer.tsx` | 수정 | | | | |
| `src/components/home/HeroSection.tsx` | | | | 수정 | |
| `src/components/home/ServiceSelector.tsx` | | | | 신규 | |
| `src/components/home/CharacterGallery.tsx` | | | | 수정 | |
| `src/components/tarot/CardFlipEffect.tsx` | | | | | 수정 |
| `src/components/tarot/CardRevealBurst.tsx` | | | | | 신규 |
| `src/components/tarot/ReadingCelebration.tsx` | | | | | 신규 |
| `src/components/session/ResultTextCard.tsx` | | | | | 수정 |
| `src/app/tarot/session/page.tsx` | 수정 | 수정 | | | 수정 |
| `src/app/saju/session/page.tsx` | 수정 | 수정 | | | |
| `src/app/shinjeom/session/page.tsx` | 수정 | 수정 | | | |
| `src/app/page.tsx` | | | | 수정 | |

---

## 구현 우선순위 & 브랜치 전략

```
Phase 0 (선행) → 즉시 시작 가능
  브랜치: feat/ui-animation-infra

Phase 1 (영역 A: 캐릭터) → 디자인 수령 후 첫 번째
  브랜치: feat/character-vitality
  PR 조건: 타로/사주/신점 3개 세션 페이지 검증

Phase 2+3 (영역 B+C: 배경+테마) → 병렬 진행 가능
  브랜치: feat/background-parallax, feat/theme-effects
  PR 조건: 7테마 × 3서비스 조합 시각 검증

Phase 4 (영역 D: 홈) → B+C 완료 후
  브랜치: feat/home-redesign
  PR 조건: 데스크탑 + 모바일 시각 검증

Phase 5 (영역 E: 카드/결과) → A 완료 후
  브랜치: feat/card-reveal-celebration
  PR 조건: 카드 reveal + 결과 완료 플로우 E2E 검증
```

---

## 테스트 전략

### 시각적 회귀 방지
- 각 Phase 완료 시 **스크린샷 기반 Before/After 비교** 문서 작성
- E2E: 기존 `e2e/` 셀렉터가 DOM 구조 변경에 영향받는지 사전 grep 확인
  ```bash
  grep -rn "hasText\|getByText\|getByRole" e2e/ --include="*.ts"
  ```

### 성능 검증 (각 Phase 완료 후)
- Chrome DevTools Performance 탭 — 파티클 애니메이션 중 fps 측정
- 목표: **60fps** (데스크탑), **30fps 이상** (모바일 저사양)
- `prefers-reduced-motion: reduce` 환경에서 모든 애니메이션 비활성 확인

### 접근성
- 모든 새 이미지/SVG에 `aria-hidden="true"` — 장식 요소는 스크린리더 무시
- 인터랙션 이펙트는 `pointer-events-none` 유지

---

## Claude Design 결과물 수령 후 액션

Claude Design에서 산출물이 나오면:

1. **파티클 스펙 시트** → `src/data/themes.ts` 의 `ParticleConfig` 값으로 변환
2. **idle 애니메이션 스펙** → `src/lib/animation-variants.ts` 의 variant 값으로 변환
3. **SVG 오브젝트 디자인** → `src/components/effects/` 에 각 서비스별 컴포넌트로 변환
4. **목업 이미지** → 구현 참조 자료로 활용, `docs/design/mockups/` 에 저장
5. **Before/After 비교** → PR description에 첨부

---

*이 계획은 Claude Design 결과물 수령 후 내용에 따라 파일명/구현 방식이 조정될 수 있습니다.*
