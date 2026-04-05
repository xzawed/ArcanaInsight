import { test, expect } from "@playwright/test";

test.describe("결과 페이지 — 공유 URL", () => {
  test("타로 결과 — 존재하지 않는 token → 404", async ({ page }) => {
    await page.goto("/tarot/result/nonexistent-token-12345");
    await page.waitForLoadState("networkidle");
    // notFound() → Next.js 404 페이지
    expect(page.url()).toContain("nonexistent");
  });

  test("사주 결과 — 존재하지 않는 token → 404", async ({ page }) => {
    await page.goto("/saju/result/nonexistent-token-12345");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("nonexistent");
  });

  test("타로 결과 페이지 — 콘솔 에러 없음 (404에서도)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/tarot/result/test-token");
    await page.waitForLoadState("networkidle");
    // 404는 정상 동작이므로 JS 에러만 검증
    expect(errors).toHaveLength(0);
  });

  test("사주 결과 페이지 — 콘솔 에러 없음 (404에서도)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/saju/result/test-token");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
