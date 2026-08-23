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

test.describe("서비스 종료 공지", () => {
  test("/notice — 종료 일정과 데이터 파기 안내가 노출된다", async ({ page }) => {
    await page.goto("/notice");

    await expect(page.getByRole("heading", { name: "서비스 종료 안내", level: 1 })).toBeVisible();
    await expect(page.locator("text=2026년 8월 31일").first()).toBeVisible();
    await expect(page.locator("text=2026년 9월 1일").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "이용자 데이터 처리" })).toBeVisible();
  });

  test("/notice — 공지 페이지에는 배너를 중복 렌더하지 않는다", async ({ page }) => {
    await page.goto("/notice");
    await expect(page.getByTestId("service-closure-banner")).toHaveCount(0);
  });

  test("홈 — 종료 배너가 노출되고 공지 페이지로 이동한다", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByTestId("service-closure-banner");
    await expect(banner).toBeVisible();

    await banner.getByRole("link", { name: "자세히 보기" }).click();
    await expect(page).toHaveURL(/\/notice$/);
    await expect(page.getByRole("heading", { name: "서비스 종료 안내", level: 1 })).toBeVisible();
  });
});
