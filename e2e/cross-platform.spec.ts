import { test, expect } from "@playwright/test";

test.describe("크로스 플랫폼 품질 검증", () => {
  test("콘솔 에러 없음 — 홈 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("콘솔 에러 없음 — 타로 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/tarot");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("콘솔 에러 없음 — 사주 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/saju");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("MobileNav — safe area 하단 패딩 존재", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // MobileNav에 safe-area-inset-bottom 스타일 존재 확인
    const mobileNav = page.locator("[class*='fixed'][class*='bottom-0']").first();
    if (await mobileNav.isVisible()) {
      const classes = await mobileNav.getAttribute("class");
      expect(classes).toContain("safe-area-inset-bottom");
    }
  });

  test("이미지 — 모든 이미지 로드 성공", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        // naturalWidth > 0이면 이미지 로드 성공
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test("스크롤 — 홈 페이지 전체 스크롤 가능", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 페이지 높이가 뷰포트보다 큰지 (스크롤 가능)
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(scrollHeight).toBeGreaterThan(viewportHeight);

    // 최하단까지 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test("링크 — 주요 네비게이션 링크 200 응답", async ({ request }) => {
    const urls = ["/", "/tarot", "/saju", "/auth/login", "/terms", "/privacy"];

    for (const url of urls) {
      const response = await request.get(url);
      expect(response.status(), `${url} should return 200`).toBeLessThan(400);
    }
  });

  test("캐릭터 이미지 경로 — 메인 캐릭터 이미지 접근 가능", async ({ request }) => {
    const testPaths = [
      "/images/characters/arcana/nukki/default.png",
      "/images/characters/luna/nukki/default.png",
      "/images/characters/miko/default.jpg",
    ];

    for (const path of testPaths) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be accessible`).toBeLessThan(400);
    }
  });
});
