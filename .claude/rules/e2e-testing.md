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
   CI 브라우저 기본값 en-US → 제거 시 SSR 영어 렌더링 → 한국어 단언 전부 실패 (PR #243, 23개 실패)

2. **CI vs 로컬 차이**
   - CI: `pnpm start` (프로덕션 빌드), retries: 2
   - 로컬: `pnpm dev`, retries: 0, reuseExistingServer: true
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

## 텍스트 변경 시 E2E 동시 수정 규칙

버튼·레이블 텍스트를 변경할 때는 **같은 커밋**에 E2E 셀렉터도 수정한다.

```bash
# 변경 전 영향 파일 grep 필수
grep -rn '"변경할 텍스트"' e2e/ --include="*.ts"
grep -rn "hasText.*변경할" e2e/ --include="*.ts"
```
