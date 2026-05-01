# 타로 카드 셔플 의식 (ShuffleCeremony) 설계 문서

## 목표

타로 카드 선택 화면 진입 시, 덱이 살아있는 것처럼 움직이며 사용자를 의식(儀式)으로 초대하는 2.2초 애니메이션 시퀀스 구현.

## 확정된 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 애니메이션 스타일 | C (덱 컷 + 글로우 폭발 + 타이프라이터 + 부채꼴 펼침) | 의식(儀式) 분위기 가장 강함 |
| 스킵 가능 여부 | 가능 (화면 어디든 클릭) | UX, prefers-reduced-motion |
| 캐릭터 텍스트 | 12종 캐릭터별 개별 텍스트 | 캐릭터 경험 강화 |
| 구현 방식 | A — ShuffleCeremony 신규 독립 컴포넌트 | CardDeck 무변경, 버그 위험 최소 |

---

## 섹션 1 — 아키텍처

### 변경 파일 (3개)

| 역할 | 파일 | 변경 유형 |
|------|------|----------|
| 의식 컴포넌트 | `src/components/tarot/ShuffleCeremony.tsx` | 신규 생성 |
| 캐릭터별 텍스트 | `src/data/characters/waiting-lines.ts` | 수정 (export 1개 추가) |
| 세션 페이지 통합 | `src/app/tarot/session/page.tsx` | 수정 (phase 조건 + 타이머 교체) |

### 컴포넌트 인터페이스

```tsx
interface ShuffleCeremonyProps {
  characterId: string;
  onComplete: () => void;
}
```

### 단계 흐름

```
tarot/page.tsx
  → setPhase("card-shuffle") + navigate to session
  → session/page.tsx mounts
      if (phase === "card-shuffle") → <ShuffleCeremony ... onComplete={handleCeremonyComplete} />
      handleCeremonyComplete:
        setAnimationPhase("spreading")
        setPhase("card-select")
        addChatMessage(카드 선택 안내)
```

현재 코드의 `setTimeout 2000ms` 블록은 `handleCeremonyComplete` 콜백으로 대체된다.

---

## 섹션 2 — 애니메이션 타이밍

총 **2,200ms** 4단계 시퀀스. 클릭 시 즉시 `onComplete()` 스킵.

```
0ms     500ms    700ms         1400ms       2000ms  2200ms
 |---①---|---②---|------③------|-----④-------|--hold--|
 덱 컷   글로우   타이프라이터    부채꼴 펼침
```

| 단계 | 구간 | 설명 |
|------|------|------|
| ① 덱 컷 | 0–500ms | 덱이 위아래로 분리(easeInOut 350ms) → 글로우 빌드업 → 재합쳐짐(150ms) |
| ② 글로우 폭발 | 500–700ms | 반경 120px 보라빛 방사형 그라디언트 폭발 → easeOut 페이드아웃 |
| ③ 타이프라이터 | 700–1400ms | 캐릭터 텍스트 글자당 **58ms** 순차 등장. 최대 12자 (≤ 696ms) |
| ④ 부채꼴 펼침 | 1400–2000ms | 카드들 spring(stiffness:200, damping:20) fan-out |
| hold / onComplete | 2000–2200ms | 최종 상태 유지 후 onComplete() 호출 |

**easing 함수 (자체 구현, Canvas rAF 기반):**
```ts
easeInOut(t) = t < 0.5 ? 4t³ : 1 - (-2t+2)³/2
easeOut(t)   = 1 - (1-t)³
spring(t)    = 1 - cos(t·π·2.5) · (1-t)^2.5
```

**스킵 처리:**
- 화면 클릭 → `done = true` → 다음 rAF에서 최종 상태로 이동 → `onComplete()`
- `prefers-reduced-motion: reduce` 감지 시 즉시 `onComplete()` (useEffect 내)

---

## 섹션 3 — 데이터 레이어

`src/data/characters/waiting-lines.ts`에 추가할 새 export:

```ts
/** 타로 카드 셔플 의식 타이프라이터 텍스트 (최대 12자) */
export const shuffleCeremonyText: Record<string, string> = {
  arcana:  "카드를 골라봐요 ✨",
  miko:    "패를 고르십시오",
  seonhwa: "카드를 고르세요~",
  hoshi:   "골라봐~! ★",
  luna:    "카드를 골라줘요 🌙",
  rei:     "골라.",
  cairn:   "카드를 고르십시오",
  zero:    "...운명을 골라",
  haru:    "카드 골라요! ☀️",
  ren:     "패를 고르시오",
  lix:     "어떤 거 골라볼까~ ㅋ",
  ethan:   "카드 선택해줘요",
};
```

폴백: 캐릭터 ID 미정의 시 `"카드를 선택하세요"` 사용.

---

## 구현 세부 사항

### ShuffleCeremony.tsx 구조

- Canvas 기반 rAF 루프 (Framer Motion 없음 — 타이밍 정밀도 필요)
- `useEffect`로 `prefers-reduced-motion` 감지 → 즉시 `onComplete()`
- 클릭 이벤트는 Canvas 부모 div에 `onClick` 핸들러 (once)
- `done` ref로 중복 `onComplete()` 호출 방지
- 카드 렌더: `N = 9` 고정 (의식은 순수 시각 효과 — 실제 스프레드 크기와 무관)
- 캔버스 크기: 컨테이너에 맞게 responsive (`ResizeObserver`)

### session/page.tsx 변경 범위

1. `ShuffleCeremony` import 추가
2. `shuffleCeremonyText` import 추가 (`waiting-lines.ts`에서)
3. 기존 `setTimeout 2000ms` 블록 → `handleCeremonyComplete` 콜백 함수로 추출
4. `phase === "card-shuffle"` 조건부 렌더링 추가:
   ```tsx
   {phase === "card-shuffle" && (
     <ShuffleCeremony
       characterId={characterId ?? "arcana"}
       onComplete={handleCeremonyComplete}
     />
   )}
   ```

### 레이아웃 배치

session/page.tsx의 기존 5:5 레이아웃(캐릭터 `md:w-1/2` + 콘텐츠 `md:w-1/2`) 유지.  
`ShuffleCeremony`는 콘텐츠 영역(`md:w-1/2`) 내부에서 전체 공간 차지 (`w-full h-full`).  
캐릭터(`CharacterDisplay`)는 계속 표시됨.

---

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)

- [ ] SSR/Hydration: `prefers-reduced-motion` 감지는 `useEffect` 안에서만 (SSR 값 없음)
- [ ] 비슷한 파일 N개 생성 여부 → 파일 1개 신규, 공통 베이스 불필요
- [ ] UI 텍스트 변경 여부 → 기존 텍스트 변경 없음. E2E 셀렉터 영향 없음

---

## 테스트 전략

- **단위**: `ShuffleCeremony` — `onComplete` 즉시 호출 확인(reduced-motion mock), 클릭 스킵 확인
- **통합**: `phase === "card-shuffle"` 렌더링 → 완료 후 `card-select` 전환 확인
- **E2E**: 기존 타로 플로우 회귀 없음 (card-select 진입 타이밍이 달라지므로 wait 여유 확인)

---

## 비범위 (Phase 3 스킵)

- TTS 연동
- 카드 뒤집기 전략 변경
- 의식 이후 대기줄 스키마 확장
