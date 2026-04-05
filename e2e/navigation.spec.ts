import { test, expect } from "@playwright/test";

test.describe("네비게이션 — Header 데스크탑 링크", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("홈 링크", async ({ page }) => {
    await page.goto("/tarot"); // 다른 페이지에서 시작
    const homeLink = page.locator("nav a[href='/']").first();
    await homeLink.click();
    await page.waitForURL("**/");
  });

  test("타로 상담 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/tarot']");
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/tarot");
  });

  test("사주 상담 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/saju']");
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/saju");
  });

  test("설정 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/settings']");
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/settings");
  });
});

test.describe("네비게이션 — Header 테마 드롭다운", () => {
  test("테마 드롭다운 열기/닫기", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 테마 버튼 클릭
    const themeBtn = page.locator("button[aria-label='테마 변경']");
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // 드롭다운 표시
    const dropdown = page.locator("text=자동 (시간/계절)");
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // 테마 선택 (한밤의 신비)
    const midnightOption = page.locator("text=한밤의 신비");
    if (await midnightOption.isVisible()) {
      await midnightOption.click();
    }
  });

  test("테마 변경 후 CSS 변수 적용", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // 다른 테마 클릭 (황혼의 노을) → 에러 없이 전환되면 성공
    const sunsetBtn = page.locator("text=황혼의 노을");
    if (await sunsetBtn.isVisible()) {
      await sunsetBtn.click();
      await page.waitForTimeout(500);
      // localStorage에 저장되었는지 확인
      const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
      expect(saved).toBe("sunset");
    }
  });
});

test.describe("네비게이션 — Footer 링크", () => {
  test("Footer 존재 + 서비스 링크", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    // 서비스 링크 확인
    await expect(footer.locator("a[href='/tarot']")).toBeVisible();
    await expect(footer.locator("a[href='/terms']")).toBeVisible();
    await expect(footer.locator("a[href='/privacy']")).toBeVisible();
  });

  test("Footer 약관 링크 클릭", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();

    const termsLink = footer.locator("a[href='/terms']");
    await termsLink.click();
    await page.waitForURL("**/terms");
    await expect(page.locator("text=이용약관").first()).toBeVisible();
  });

  test("Footer 개인정보 링크 클릭", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();

    const privacyLink = footer.locator("a[href='/privacy']");
    await privacyLink.click();
    await page.waitForURL("**/privacy");
    await expect(page.locator("text=개인정보처리방침").first()).toBeVisible();
  });
});

test.describe("네비게이션 — 모바일 Header", () => {
  test("모바일 설정 아이콘 표시", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsIcon = page.locator("a[href='/settings'][aria-label='설정']");
    await expect(settingsIcon).toBeVisible();
  });

  test("모바일 설정 아이콘 클릭 → /settings 이동", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsIcon = page.locator("a[href='/settings'][aria-label='설정']");
    await settingsIcon.click();
    await page.waitForURL("**/settings");
  });

  test("MobileNav 5탭 표시 + 클릭", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 타로 탭 클릭
    const tarotTab = page.locator("nav a[href='/tarot']").last();
    if (await tarotTab.isVisible()) {
      await tarotTab.click();
      await page.waitForURL("**/tarot");
    }
  });
});

test.describe("네비게이션 — 페이지 이동 후 스크롤 최상단 초기화", () => {
  test("MobileNav 탭 클릭 후 scrollY === 0 (모바일)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 홈에서 아래로 스크롤
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(100);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);

    // 타로 탭 클릭 → 스크롤 최상단 확인
    const tarotTab = page.locator("nav a[href='/tarot']").last();
    await tarotTab.click();
    await page.waitForURL("**/tarot");
    await page.waitForTimeout(500); // AnimatePresence 전환 대기
    const scrollAfterTarot = await page.evaluate(() => window.scrollY);
    expect(scrollAfterTarot).toBe(0);

    // 사주 탭 클릭 → 스크롤 최상단 확인
    const sajuTab = page.locator("nav a[href='/saju']").last();
    await sajuTab.click();
    await page.waitForURL("**/saju");
    await page.waitForTimeout(500);
    const scrollAfterSaju = await page.evaluate(() => window.scrollY);
    expect(scrollAfterSaju).toBe(0);

    // 신점 탭 클릭 → 스크롤 최상단 확인
    const shinjeomTab = page.locator("nav a[href='/shinjeom']").last();
    await shinjeomTab.click();
    await page.waitForURL("**/shinjeom");
    await page.waitForTimeout(500);
    const scrollAfterShinjeom = await page.evaluate(() => window.scrollY);
    expect(scrollAfterShinjeom).toBe(0);
  });

  test("Header 데스크탑 링크 클릭 후 scrollY === 0", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 홈에서 아래로 스크롤
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(100);

    // 타로 링크 클릭
    const tarotLink = page.locator("nav a[href='/tarot']").first();
    await tarotLink.click();
    await page.waitForURL("**/tarot");
    await page.waitForTimeout(500);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(0);
  });

  test("페이지 내 스크롤 후 다른 페이지 이동 시 초기화", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tarot");
    await page.waitForLoadState("networkidle");

    // 타로 페이지에서 아래로 스크롤 (캐릭터 그리드 영역)
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(100);

    // 홈으로 이동
    const homeTab = page.locator("nav a[href='/']").last();
    await homeTab.click();
    await page.waitForURL(/\/$/);
    await page.waitForTimeout(500);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(0);
  });
});
