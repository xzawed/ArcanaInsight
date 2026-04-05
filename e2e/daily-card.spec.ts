import { test, expect } from "@playwright/test";

test.describe("DailyCard — 오늘의 카드", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // daily-card 섹션으로 스크롤
    const section = page.locator("#daily-card");
    await section.scrollIntoViewIfNeeded();
  });

  test("DailyCard 섹션 존재", async ({ page }) => {
    const section = page.locator("#daily-card");
    await expect(section).toBeVisible();
  });

  test("캐릭터 탭 버튼 존재 (최소 2개)", async ({ page }) => {
    const section = page.locator("#daily-card");
    const tabs = section.getByRole("button");
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test("캐릭터 탭 전환 가능", async ({ page }) => {
    const section = page.locator("#daily-card");
    const tabs = section.getByRole("button");
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      // 두 번째 탭 클릭
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      // 에러 없이 전환 완료 확인
    }
  });

  test("카드 영역 존재 (뒷면 또는 앞면)", async ({ page }) => {
    const section = page.locator("#daily-card");
    // 카드 이미지 또는 SVG 존재
    const cardElements = section.locator("img, svg");
    expect(await cardElements.count()).toBeGreaterThanOrEqual(1);
  });

  test("콘솔 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
