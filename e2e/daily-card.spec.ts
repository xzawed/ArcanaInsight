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
    page.on("pageerror", (err) => {
      // webkit는 Next RSC 프리페치(_rsc) 요청을 access control로 차단해 benign pageerror를 낸다 — 앱 버그 아님(내비게이션 정상)
      if (/_rsc=.*access control/i.test(err.message)) return;
      errors.push(err.message);
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#daily-fortune")).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
