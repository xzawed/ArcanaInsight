---
paths:
  - "e2e/**"
---

# E2E 테스트 규칙

## 셀렉터 오탐 방지 패턴

```typescript
// ❌ 금지 — hidden 요소 오탐
page.locator('img').first()
page.getByText('짧은글자')

// ✅ 권장 — aria-label 또는 data-testid 우선
page.getByRole('button', { name: '타로 시작하기' })
page.getByTestId('start-button')

// ✅ 텍스트 셀렉터는 충분히 고유한 문자열만
page.getByText('카드를 직접 선택해주세요', { exact: true })
```

## service-navigation.ts 헬퍼 의존성

서비스 진입 로직(타로/사주/신점 페이지 이동, 주제 선택, 카드 선택)은  
**반드시** `e2e/helpers/service-navigation.ts` 1파일에 집중한다.

UI 변경 시 이 파일을 **먼저** 수정 → 이 파일을 import하는 spec 파일들은 자동 대응.  
직접 수정하면 PR #347~#350 패턴(4개 spec 일괄 실패) 재발.

```bash
# 영향 파일 사전 탐색 필수
grep -rn "service-navigation" e2e/ --include="*.ts"
```

## CI 재현성 필수 조건

1. **`playwright.config.ts`의 `use.locale: "ko"` 유지 필수**  
   CI 브라우저 기본값 en-US → 제거 시 SSR 영어 렌더링 → 한국어 단언 전부 실패 (PR #243, 25개 실패)

2. **CI vs 로컬 차이**
   - CI: `pnpm start` (프로덕션 빌드), retries: 2(단 **결함 탐지 가드는 0** — 아래 참조), **workers: 1**, **프로젝트당 2샤드**
   - 로컬: `pnpm dev`, retries: 0, workers 무제한, reuseExistingServer: true
   - CI `workers: 1` 이유(#462): 2코어/7GB 러너에서 브라우저 2개 + `pnpm start` + sharp 2816×1536 원본 디코드 공존이 호스트 OOM → OOM-killer가 브라우저 kill → "Target closed" 크래시(chromium·webkit 공통). 3개 디바이스 프로젝트의 매트릭스 레벨 병렬은 유지.
   - Pre-PR 훅에 E2E 전체 포함 권장 안 함 — CI에서 재검증

3. **hidden 요소 확인**  
   모바일 뷰포트에서 데스크탑 전용 요소가 hidden 처리되므로,  
   `toBeVisible()` 단언 전에 뷰포트 컨텍스트 확인.

## 컴포넌트 삭제·교체 전 testId 사전 점검

컴포넌트를 삭제하거나 다른 컴포넌트로 교체하기 전에 E2E가 의존하는 testId가 없는지 확인한다.

```bash
# 변경 전 필수 실행
grep -rn "getByTestId\|data-testid" e2e/ --include="*.ts" | grep "<변경할 컴포넌트명>"
```

testId가 발견되면 새 컴포넌트에 동일한 testId를 유지하거나 E2E를 동시 수정한다.  
**같은 커밋에 포함하지 않으면 CI에서 즉시 실패한다.** (PR #412 1차 실패 원인)

## 외부 URL Image에 priority 금지

Cloudflare R2/CDN(`cdn.xzawed.xyz`)·Supabase Storage 등 외부 URL을 `src`로 쓰는 `<Image>`에는 **`priority` 속성을 붙이지 않는다.**

```tsx
// ❌ 금지 — <link rel="preload"> 가 window.load 를 블로킹
<Image src="https://...supabase.co/..." priority ... />

// ✅ 권장 — loading="lazy" 기본값, window.load 비블로킹
<Image src="https://...supabase.co/..." ... />
```

`priority` 는 `<link rel="preload">` 를 `<head>` 에 추가하므로 CI 환경에서 외부 이미지 응답이
느리면 `waitForLoadState("load")` 가 20-30s 블로킹 → E2E 타임아웃 유발.  
LCP 요소(히어로 이미지 등)가 아닌 배경·데코 이미지에는 절대 사용하지 않는다. (PR #412 2차 실패 원인)

## 테스트 측: `waitForLoadState("load")` 대신 web-first 대기

`ServiceBackground`를 렌더하는 **몰입형 페이지**(`/tarot`·`/saju`·`/shinjeom` 진입·세션)는
`priority`를 안 붙여도 **`fixed inset-0` 풀스크린(in-viewport) 외부 R2 배경이라 `window.load`를 게이트**한다.
따라서 테스트에서 `waitForLoadState("load")`·`waitForLoadState("networkidle")`(및 `waitForURL`의 기본 `waitUntil:'load'`)를
쓰면 Mobile Android CI에서 타임아웃이 재발한다. (홈 `(site)/page.tsx`는 ServiceBackground가 **없다** — 로컬 hero 이미지 +
`StyleSelector`의 lazy R2 카드 이미지 구성이라 게이팅 요인이 다르나, 그래도 web-first 대기가 안전하다.)

```ts
// ❌ 금지 — 외부 배경/CDN 이미지가 window.load·networkidle 을 지연시켜 타임아웃
await page.goto("/tarot");
await page.waitForLoadState("load"); // 또는 networkidle

// ✅ 권장 — web-first 준비 신호 + load 비의존 네비게이션
await page.goto("/tarot", { waitUntil: "domcontentloaded" });
await expect(page.locator("button").filter({ hasText: /아르카나|미코/ }).first()).toBeVisible();
await page.waitForURL(/\/$/, { waitUntil: "commit" }); // 또는 expect(page).toHaveURL(...)
```

`networkidle`은 Playwright 공식 **DISCOURAGED**이며, 이제 **`eslint-plugin-playwright`의 `playwright/no-networkidle`로 lint 강제**된다
(`eslint.config.mjs`, `e2e/**` 스코프, error). **몰입형+홈(#459)에 이어 (site) 로컬 라우트 잔여까지 전면 제거 완료 (#460)** — 이제
`e2e/`에 `networkidle` **0건**. 전환: 몰입형 `goto` 기본-load → `{ waitUntil: "domcontentloaded" }`, 세션 `waitForURL` 기본-load →
`{ waitUntil: "commit" }`, `networkidle`·`load` → web-first 어서션. 대체 패턴 — 뒤따르는 `toBeVisible`가 게이트면 제거,
one-shot 읽기(`textContent`/`.count()`/`getAttribute`) 앞이면 `toBeVisible`/`toContainText`/`toHaveCount`/`waitForFunction`으로 게이트,
404 페이지는 `getByRole("heading", { name: "페이지를 찾을 수 없습니다" })` 대기.
(PR #455·#457 부분 → #459 몰입형+홈 → #460 (site)+eslint 가드. #121~#428 재발 계열. 상세: `docs/operations/known-issues.md`)

> ⚠️ 홈 `goto("/")` 후 **인터랙션 전에 한 번만 읽는 값**(one-shot `textContent`/`.count()`/`getAttribute`)은 금지 — DCL 시점에 SSR
> 값을 읽어 hydration 후 재조정을 놓친다. web-first 재시도(`expect(...).toBeVisible()`, `expect.poll()`, `toHaveCount()`, `waitForFunction`)로 게이트한다.
> (예: 성별 필터 `.count()`가 12→6 재조정 전 12를 읽는 플레이키 — `expect.poll(...).toBeLessThanOrEqual(6)`로 교정)

## 결함 탐지 가드는 retries 0 — 재시도가 결함을 삼키지 않게

CI 기본 `retries: 2`는 **호스트 OOM 유래 비결정 실패를 흡수하는 용도**다. 그런데 이 재시도는
"콘솔 에러 없음"·"이미지 로드 성공"처럼 **실제 결함을 잡는 단언**까지 함께 삼켜 green으로 만든다.

> 실증(2026-07-29, PR #509): CI가 `NEXT_PUBLIC_ASSET_BASE_URL` 미설정으로 카드 이미지를 전량
> 404로 서빙하고 있었고 가드가 이를 정확히 탐지했으나, 재시도가 통과시켜 리포트에 `1 flaky`로만
> 남고 CI는 통과했다. **약 3.5주간 깨진 채로 방치.**

따라서 결함 탐지 계열은 재시도를 끊는다.

```ts
test.describe("결함 탐지 가드 (재시도 없음)", () => {
  test.describe.configure({ retries: 0 });   // Playwright는 describe 단위만 지원
  test("콘솔 에러 없음 — 홈 페이지", async ({ page }) => { /* ... */ });
});
```

**새 무결성 가드(404·콘솔 에러·접근성 위반 등)를 추가할 때는 이 describe 안에 넣는다.**
반대로 네트워크·타이밍에 취약한 플로우 테스트는 `retries: 2`를 유지해 OOM flake로 전면 적색이 되는 것을 피한다.

### 이미지 무결성은 네트워크 시그널로 판정 — DOM `complete`만 보면 새어나간다

```ts
// ❌ 타이밍 의존 — 아직 로드가 안 끝난(!complete) 깨진 이미지가 검사에서 빠진다
.filter((el) => el.complete && el.naturalWidth === 0)

// ✅ goto **전에** 네트워크 리스너 부착이 정본, DOM은 2차 시그널
page.on("response", (r) => { if (r.request().resourceType() === "image" && r.status() >= 400) ... });
page.on("requestfailed", (r) => { if (r.resourceType() === "image") ... });
```

⚠️ `requestfailed`는 **중단된 요청에도 발화**한다. hydration의 `src` 교체·언마운트로 lazy 이미지 요청이
취소되면 `net::ERR_ABORTED`가 잡히는데 이건 결함이 아니다 — `retries:0` 가드에서 정상 페이지를 적색으로
만든다. **`net::ERR_ABORTED`만 예외 처리**한다(진짜 결함은 status≥400 또는 DOM `naturalWidth===0`로 잡힘).

### 자산 URL 환경변수는 build 잡에도 설정

`NEXT_PUBLIC_*`는 **빌드 타임에 인라인**된다. E2E 잡은 `build` 잡의 `.next` 아티팩트를 내려받아
`pnpm start`로 서빙하므로, **E2E 잡에만 설정하면 클라이언트 번들에는 반영되지 않는다.**
`deploy.yml`의 `build`·`e2e` 두 잡에 동일한 값을 설정한다(값이 갈리면 SSR/CSR URL 불일치).

## 텍스트 변경 시 E2E 동시 수정 규칙

버튼·레이블 텍스트를 변경할 때는 **같은 커밋**에 E2E 셀렉터도 수정한다.

```bash
# 변경 전 영향 파일 grep 필수
grep -rn '"변경할 텍스트"' e2e/ --include="*.ts"
grep -rn "hasText.*변경할" e2e/ --include="*.ts"
```
