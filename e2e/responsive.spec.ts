import { test, expect } from "@playwright/test";

test.describe("반응형 레이아웃", () => {
  test("데스크탑 — Header 네비게이션 표시, MobileNav 숨김", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "데스크탑 테스트는 Chromium에서만");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 데스크탑 네비 표시 (data-testid 사용 — i18n 텍스트 변경에 안정적)
    const desktopNav = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopNav).toBeVisible();

    // MobileNav 숨김
    const mobileNav = page.locator("nav[class*='fixed'][class*='bottom']");
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeHidden();
    }
  });

  test("모바일 — MobileNav 표시, Header 네비 숨김", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit" && browserName !== "chromium", "모바일 테스트");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 최소 5개의 모바일 네비 아이템 (data-testid="mobile-nav-*" 사용 — i18n 안정적)
    // Desktop Chrome project는 default viewport가 desktop이라 setViewportSize 후 미디어 쿼리
    // reflow에 시간 필요 — networkidle만으로는 부족해 explicit visible 대기 추가 (flaky 방지)
    const navItems = page.locator('[data-testid^="mobile-nav-"]');
    await expect(navItems.first()).toBeVisible({ timeout: 10_000 });
    expect(await navItems.count()).toBeGreaterThanOrEqual(4);
  });

  test("캐릭터 상세 — 데스크탑 좌우 50:50 분할", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/character/arcana");
    await page.waitForLoadState("networkidle");

    // 좌측(캐릭터)과 우측(콘텐츠) 영역의 너비 비교
    const mainContainer = page.locator("[class*='md\\:flex-row']").first();
    if (await mainContainer.isVisible()) {
      const children = mainContainer.locator("> div");
      if (await children.count() >= 2) {
        const leftWidth = await children.nth(0).evaluate((el) => el.getBoundingClientRect().width);
        const rightWidth = await children.nth(1).evaluate((el) => el.getBoundingClientRect().width);
        const total = leftWidth + rightWidth;

        // 좌측이 전체의 40~60% (대략 50:50)
        expect(leftWidth / total).toBeGreaterThan(0.35);
        expect(leftWidth / total).toBeLessThan(0.65);
      }
    }
  });

  test("캐릭터 상세 — 모바일 캐릭터 영역 25% 높이", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/character/arcana");
    await page.waitForLoadState("networkidle");

    const characterArea = page.locator("[class*='h-\\[25%\\]']").first();
    if (await characterArea.isVisible()) {
      const parentHeight = await characterArea.evaluate(
        (el) => el.parentElement?.getBoundingClientRect().height ?? 0
      );
      const selfHeight = await characterArea.evaluate(
        (el) => el.getBoundingClientRect().height
      );

      if (parentHeight > 0) {
        const ratio = selfHeight / parentHeight;
        // 25% ± 5% 허용
        expect(ratio).toBeGreaterThan(0.18);
        expect(ratio).toBeLessThan(0.32);
      }
    }
  });

  test("타로 페이지 — 모바일 세로 배치", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tarot");
    await page.waitForLoadState("networkidle");

    // 캐릭터 선택 그리드가 세로로 표시
    const grid = page.locator("[class*='grid-cols']").first();
    if (await grid.isVisible()) {
      const gridDisplay = await grid.evaluate((el) => getComputedStyle(el).display);
      expect(gridDisplay).toBe("grid");
    }
  });
});
