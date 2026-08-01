# 렌더링 계약 — SSR / Hydration

> **정본**: 이 문서가 SSR·hydration 규칙의 단일 정본이다. 코드가 이 계약을 어기면 코드가 틀린 것이다.

이 계약은 추상적 원칙이 아니라 **2026-07-31에 실측된 결함**에서 나왔다. 같은 결함이 서로 다른 7개 컴포넌트에서 반복된 이유는 규칙이 문서로 존재하지 않았기 때문이다.

---

## 1. 계약

### C1. 첫 클라이언트 렌더는 서버 렌더와 **트리 모양**이 같아야 한다

서버가 알 수 없는 값으로 **렌더 유무·요소 종류·자식 개수**를 갈라서는 안 된다.

서버가 알 수 없는 값은 다음과 같다.

| 종류 | 예 |
|---|---|
| 미디어 쿼리 | `prefers-reduced-motion`, `prefers-color-scheme`, viewport 폭 |
| 브라우저 저장소 | `localStorage`, `sessionStorage`, Zustand `persist` 스토어 |
| 브라우저 API | `window`, `document`, `navigator`, `matchMedia` |
| 비결정 값 | `Date.now()`, `new Date()`, `Math.random()`, 타임존 |

> ⚠️ `style`·`animate` **prop 값**만 바꾸는 것은 계약 위반이 아니다. 금지되는 것은 **트리 모양**을 가르는 것이다.

### C2. 클라이언트 전용 값은 hydration 이후에만 반영한다

`useSyncExternalStore`의 `getServerSnapshot`으로 첫 렌더를 서버와 일치시킨 뒤 실제 값으로 다시 렌더한다.

- 미디어 쿼리 → [`useReducedMotionSafe`](../../../src/hooks/useReducedMotionSafe.ts)
- persist 스토어·기타 클라이언트 전용 값 → [`useHydrated`](../../../src/hooks/useHydrated.ts)

`useEffect` + `setState`로 마운트를 감지하는 방식은 쓰지 않는다 — 프로젝트 lint 규칙(`react-hooks`)이 effect 내 동기 `setState`를 차단한다.

### C3. 가능하면 분기 자체를 없앤다

C2로 **감싸는** 것보다 분기를 **제거**하는 것이 낫다. 같은 호스트 요소를 항상 렌더하고 애니메이션만 끄면, 서버가 무엇을 모르든 어긋날 수 없다.

```tsx
// ❌ 호스트 요소를 가른다 — 서버는 shouldReduceMotion을 알 수 없다
return shouldReduceMotion ? <div style={s}>{rune}</div> : <motion.div style={s} animate={a}>{rune}</motion.div>;

// ✅ 항상 같은 요소, 애니메이션만 끈다
return <motion.div style={s} animate={shouldReduceMotion ? staticA : a}>{rune}</motion.div>;
```

---

## 2. 왜 중요한가 — 실측된 영향

계약 위반 시 React는 **서버가 보낸 트리를 통째로 버리고 클라이언트에서 다시 그린다.**

프로덕션 빌드에서 직접 관측한 형태:

```
[pageerror] Minified React error #418
→ "Hydration failed because the server rendered HTML didn't match the client"
```

결과는 두 가지다.

1. **사용자 입력 유실** — 재렌더 구간에 들어온 클릭은 핸들러가 아직 없어 사라진다. OS "동작 줄이기"를 켠 사용자는 몰입형 페이지와 홈에서 매번 이 구간을 지났다.
2. **E2E 산발 실패** — 같은 원인으로 클릭이 유실돼 테스트가 비결정적으로 깨졌다. 6런 중 5회 실패/flaky였고, CPU 부하는 재렌더 구간의 길이를 바꿔 승패를 흔들었을 뿐 **원인이 아니었다**.

> 이 결함은 약 한 달간 "E2E flake"로만 보였다. 원인을 OOM으로 추정하던 기록도 함께 틀렸다 — 상세는 [`operations/e2e-incidents.md`](../../operations/e2e-incidents.md)와 이슈 #522·#525.

---

## 3. 검증 — 계약을 지키는지 무엇이 보증하는가

### 자동 가드

[`e2e/cross-platform.spec.ts`](../../../e2e/cross-platform.spec.ts)의 **`hydration 불일치 없음 — 동작 줄이기`** 가드가 `/`·`/tarot`·`/saju`·`/shinjeom`을 `prefers-reduced-motion: reduce` 상태로 열어 React hydration 오류를 잡는다.

- **`retries: 0`** — 결함 탐지 가드이므로 1회 실패 = 실패다.
- dev·프로덕션 양쪽 메시지 형태를 모두 매칭한다(프로덕션은 `Minified React error #418`로 축약된다).

### 가드가 놓치는 지점 (알려진 한계)

| 미커버 | 이유 |
|---|---|
| 세션·결과 라우트 | 진입에 세션 상태가 필요해 가드가 단순 `goto`로 도달할 수 없다 |
| `prefers-color-scheme` 등 다른 미디어 쿼리 | 현재 가드는 `reducedMotion`만 켠다 |
| persist 스토어 값이 기본값과 다른 경우 | 가드는 빈 저장소 상태로만 연다 |

**새 컴포넌트가 위 조건에서 트리를 가른다면 가드는 잡지 못한다.** 리뷰에서 C1을 직접 확인한다.

### 로컬 재현 방법

dev 모드에서는 Next 오버레이가 콘솔을 가로채 브라우저 콘솔에 오류가 뜨지 않는다. **프로덕션 빌드로 확인해야 한다.**

```bash
pnpm build
CI=true pnpm exec playwright test cross-platform.spec.ts --project="Desktop Chrome" --workers=1 -g "hydration 불일치"
```

---

## 4. 현재 적용 현황

| 컴포넌트 | 처리 |
|---|---|
| `CanvasParticleLayer` | `useReducedMotionSafe` |
| `ThemeAtmosphereLayer` (Sunset·Summer) | `useReducedMotionSafe` |
| `ShinjeomEnergyEffect` | `useReducedMotionSafe` |
| `CharacterAuraLayer` | `useReducedMotionSafe` + `useHydrated` (미디어 쿼리 + persist 스토어 이중 분기) |
| `MysticBackground` 룬 | 분기 제거 (C3) |
| `SajuChartReveal` | 분기 제거 (C3) |

`ThemeAtmosphere`·`ServiceIllustrations`·`InteractionClickParticles`·`ParticleOverlay`·`ScrollReveal`은 `animate` prop만 바꾸므로 계약 위반이 아니다.

---

## 관련 문서

- [`conventions/cross-platform.md`](../../conventions/cross-platform.md) — 뷰포트·safe-area 등 플랫폼 규칙
- [`tests/strategy.md`](../../tests/strategy.md) — 어떤 계층이 이 계약을 검증하는가
- [`operations/e2e-incidents.md`](../../operations/e2e-incidents.md) — 폐기된 OOM 가설과 계측 기록
