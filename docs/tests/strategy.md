# 테스트 전략 (TDD)

> **정본**: 어떤 계층이 무엇을 책임지는가. 개별 실행 방법은 [`unit-testing.md`](../tests/unit-testing.md)·[`e2e-testing.md`](../tests/e2e-testing.md)가 정본이다.

---

## 1. 계층별 책임

| 계층 | 도구 | 책임 | 책임 아닌 것 |
|---|---|---|---|
| 단위 | Vitest (`node` 환경) | 순수 함수·서비스 계층·어댑터·스키마 | React 렌더, 브라우저 동작 |
| API | Vitest (`src/__tests__/api/`) | Rate Limit → Zod → Auth → 소유권 검증 **순서**와 상태 코드 | 실제 DB·AI 호출 |
| E2E | Playwright | 라우팅·상호작용·SSR/hydration·시각 무결성 | 프롬프트 품질, AI 응답 내용 |
| 리딩 품질 | `pnpm eval:reading` (온디맨드) | `directAnswer`·`overallReading`·`parseError` 계약 | 자동 CI 게이트 아님(실 AI 호출·비용) |

`vitest.config.ts`가 `src/components/**`와 `src/app/**`를 단위 테스트에서 제외한다 — **React 컴포넌트는 E2E가 커버한다**는 것이 이 프로젝트의 명시적 선택이다. 컴포넌트 결함을 잡고 싶으면 jsdom 단위 테스트를 새로 만들기 전에 E2E 가드를 먼저 고려한다.

---

## 2. E2E 안에서의 이분법 — 이것이 이 프로젝트의 핵심 규칙

E2E 테스트는 **성격이 다른 두 종류**이고, 재시도 정책이 정반대다.

### (A) 플로우 테스트 — `retries: 2`

사용자 여정이 끝까지 도달하는지 본다. 네트워크·타이밍에 취약하므로 재시도를 허용해 인프라 잡음으로 전면 적색이 되는 것을 막는다.

### (B) 결함 탐지 가드 — `retries: 0`

"콘솔 에러 없음", "이미지 404 없음", "hydration 불일치 없음"처럼 **결함의 존재 자체**를 단언한다.

```ts
test.describe("결함 탐지 가드 (재시도 없음)", () => {
  test.describe.configure({ retries: 0 });
  // ...
});
```

> **왜 분리하는가 — 실증**
> 재시도는 인프라 잡음뿐 아니라 **진짜 결함까지 삼킨다.** 2026-07-29, 카드 이미지가 전량 404였고 가드가 이를 정확히 탐지했으나 `retries: 2`가 통과시켜 리포트에 `1 flaky`로만 남았다. **약 3.5주간 깨진 채 방치됐다.**

**새 무결성 가드는 반드시 (B)에 넣는다.**

---

## 3. 가드가 결함을 잡는지 어떻게 아는가 — red→green 의무

가드를 추가할 때 **통과하는 것만 확인하면 안 된다.** 결함이 있을 때 실제로 실패하는지 먼저 봐야 한다.

```bash
git stash push src/          # 수정을 잠시 되돌린다
pnpm build && CI=true pnpm exec playwright test <spec> -g "<가드>"   # 실패해야 정상
git stash pop
pnpm build && CI=true pnpm exec playwright test <spec> -g "<가드>"   # 이제 통과
```

> **실증**: hydration 가드의 첫 버전은 dev 모드에서 결함이 있는데도 통과했다(Next 오버레이가 콘솔을 가로챔). 프로덕션 빌드로 옮겨서야 `Minified React error #418`을 잡았다. **red를 확인하지 않았다면 무력한 가드를 회귀 테스트로 착각했을 것이다.**

---

## 4. CI와 로컬의 차이 — 로컬 결과를 CI로 착각하지 않기

| | CI | 로컬 기본 |
|---|---|---|
| 서버 | `pnpm start` (프로덕션 빌드) | `pnpm dev` |
| workers | **1** | 무제한(코어 수) |
| retries | 2 (가드는 0) | 0 |

이 차이가 만드는 함정:

- **로컬 `workers` 무제한** — dev 서버에 수십 개를 동시에 던져 실패가 무더기로 난다. CI 조건 재현은 `--workers=1`.
- **dev 모드 hydration 오류가 브라우저 콘솔에 안 뜬다** — 반드시 프로덕션 빌드로 검증한다.
- **dev의 느린 hydration** — hydration 전 클릭이 무시돼 로컬에서만 실패할 수 있다. 이때는 테스트가 아니라 **게이트 부재**를 의심한다.

CI 동일 조건 재현:

```bash
pnpm build
CI=true NEXT_PUBLIC_ASSET_BASE_URL=https://cdn.xzawed.xyz \
  pnpm exec playwright test --project="Desktop Chrome" --workers=1
```

---

## 5. 테스트를 고칠 때 먼저 물어야 할 것

E2E가 깨졌을 때 **테스트를 고치기 전에** 앱이 옳은지 확인한다.

> **실증**: `tarot-flow` 중복클릭 테스트가 6런 중 5회 깨졌다. 테스트를 고치기 전에 "앱의 중복 클릭 가드가 실제로 동작하는가"를 별도 실험으로 확인했고(`readingRequests = 1`), 앱이 옳음을 확인한 **뒤에** 테스트를 고쳤다. 반대로 같은 조사에서 hydration 결함은 **앱이 틀린 경우**였다 — 테스트를 고쳤다면 실제 사용자 버그를 덮었을 것이다.

판단 순서:

1. 실패 아티팩트(`error-context.md`·`trace.zip`)로 **실제 에러**를 확인한다 — 추정하지 않는다.
2. 앱 동작을 최소 실험으로 격리 검증한다.
3. 앱이 옳으면 테스트를 고치고, 앱이 틀리면 앱을 고치고 **가드를 추가**한다.

---

## 6. 커버리지 임계값

`pnpm test:coverage` — branches 90 / functions 97 / lines·statements 98.

측정 범위는 `vitest.config.ts`의 `coverage.include` **화이트리스트**다. 전체 코드가 아니라 "테스트가 있는 파일"만 센다. 새 파일을 측정에 넣으려면 테스트와 함께 include에 추가한다.

---

## 관련 문서

- [`specs/platform/rendering-contract.md`](../specs/platform/rendering-contract.md) — E2E 가드가 검증하는 SSR 계약
- [`tests/e2e-testing.md`](../tests/e2e-testing.md) — 셀렉터·대기 패턴 정본
- [`tests/unit-testing.md`](../tests/unit-testing.md) — 단위 테스트 작성 규칙
- [`operations/known-issues.md`](../operations/known-issues.md) — 재발 기록
