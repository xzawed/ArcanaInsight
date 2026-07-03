import { test, expect } from "@playwright/test";

test.describe("DailyFortune — 오늘의 운세", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#daily-fortune")).toBeVisible();
    const section = page.locator("#daily-fortune");
    await section.scrollIntoViewIfNeeded();
  });

  test("DailyFortune 섹션 존재", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    await expect(section).toBeVisible();
  });

  test("캐릭터 탭 버튼 존재 (최소 2개)", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const tabs = section.getByRole("button");
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test("캐릭터 탭 전환 가능", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const tabs = section.getByRole("button");
    if (await tabs.count() >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test("카드 영역 존재 (뒷면 또는 앞면)", async ({ page }) => {
    const section = page.locator("#daily-fortune");
    const cardElements = section.locator("img, svg");
    expect(await cardElements.count()).toBeGreaterThanOrEqual(1);
  });

  test("콘솔 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#daily-fortune")).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
