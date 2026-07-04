import { test, expect } from "@playwright/test";

// share_token 공개 정책:
// - 유효한 share_token → 결과 열람 허용 (공유 링크 생성 = 공개 의도)
// - 존재하지 않는 token → 404 (notFound())
// - share_token은 항상 UUID로 자동 생성됨 (NULL 불가)

test.describe("결과 페이지 — 공유 URL", () => {
  test("타로 결과 — 존재하지 않는 token → 404", async ({ page }) => {
    await page.goto("/tarot/result/nonexistent-token-12345");
    // notFound() → Next.js 404 페이지 (web-first — 404 헤딩 노출 대기)
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    expect(page.url()).toContain("nonexistent");
  });

  test("사주 결과 — 존재하지 않는 token → 404", async ({ page }) => {
    await page.goto("/saju/result/nonexistent-token-12345");
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    expect(page.url()).toContain("nonexistent");
  });

  test("타로 결과 페이지 — 콘솔 에러 없음 (404에서도)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/tarot/result/test-token");
    // 404 렌더 완료 대기 (web-first) — 렌더 중 JS 에러가 있으면 pageerror로 포착
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    // 404는 정상 동작이므로 JS 에러만 검증
    expect(errors).toHaveLength(0);
  });

  test("사주 결과 페이지 — 콘솔 에러 없음 (404에서도)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/saju/result/test-token");
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  // share_token 형식 검증 — UUID 형식이 아닌 malformed token도 DB miss → 404
  test("타로 결과 — 특수문자 포함 malformed token → 404, JS 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/tarot/result/not-a-uuid-!!!");
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("사주 결과 — 특수문자 포함 malformed token → 404, JS 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/saju/result/not-a-uuid-!!!");
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

// PR #219 회귀 방지 (D1 P0):
// migration 014 가 share_token 공개 RLS 를 DROP 한 후 SSR 페이지가 anon 키로
// 조회하면 정상 발급된 토큰조차 RLS empty → notFound() → 100% 404 가 된다.
// service_role 어댑터 사용 시 라우팅·렌더 자체가 깨지지 않아야 한다는 최소
// 보장으로, 비인증 브라우저 컨텍스트에서 모든 result page 가 5xx/JS 에러 없이
// 응답하는지 검증한다.
test.describe("결과 페이지 — 비인증 컨텍스트 (D1 회귀 방지)", () => {
  for (const service of ["tarot", "saju", "shinjeom"] as const) {
    test(`${service} 결과 — 비인증 시크릿 컨텍스트에서 5xx/JS 에러 없이 응답`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();
      const errors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("response", (res) => {
        if (res.status() >= 500) failedRequests.push(`${res.status()} ${res.url()}`);
      });
      const response = await page.goto(`/${service}/result/probe-token-${Date.now()}`);
      await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
      expect(response, "초기 응답이 존재해야 함").not.toBeNull();
      expect(response!.status(), "5xx 금지 (RLS 빈결과는 404 로 변환되어야 함)").toBeLessThan(500);
      expect(errors, "JS 페이지 에러 없음").toHaveLength(0);
      expect(failedRequests, "5xx 부속 요청 없음").toHaveLength(0);
      await context.close();
    });
  }
});
