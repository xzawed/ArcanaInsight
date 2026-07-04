import { test, expect } from "@playwright/test";

test.describe("정적 페이지", () => {
  test("이용약관 — 콘텐츠 로드", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("text=이용약관").first()).toBeVisible();
    await expect(page.locator("text=목적").first()).toBeVisible();
  });

  test("개인정보처리방침 — 콘텐츠 및 테이블", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.locator("text=개인정보처리방침").first()).toBeVisible();

    // 테이블 존재 확인
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(1);
  });

  test("개인정보처리방침 — 테이블 모바일 가로 스크롤 가능", async ({ page }) => {
    await page.goto("/privacy");
    const tableContainer = page.locator(".overflow-x-auto").first();
    if (await tableContainer.isVisible()) {
      const overflow = await tableContainer.evaluate((el) => getComputedStyle(el).overflowX);
      expect(overflow).toBe("auto");
    }
  });
});
