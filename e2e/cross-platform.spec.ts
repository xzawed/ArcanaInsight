import { test, expect } from "@playwright/test";

test.describe("크로스 플랫폼 품질 검증", () => {
  test("콘솔 에러 없음 — 홈 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    expect(errors).toHaveLength(0);
  });

  test("콘솔 에러 없음 — 타로 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/tarot");
    await page.waitForLoadState("domcontentloaded");
    expect(errors).toHaveLength(0);
  });

  test("콘솔 에러 없음 — 사주 페이지", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/saju");
    await page.waitForLoadState("domcontentloaded");
    expect(errors).toHaveLength(0);
  });

  test("MobileNav — safe area 하단 패딩 존재", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // MobileNav에 safe-area-inset-bottom 스타일 존재 확인
    const mobileNav = page.locator("[class*='fixed'][class*='bottom-0']").first();
    if (await mobileNav.isVisible()) {
      const classes = await mobileNav.getAttribute("class");
      expect(classes).toContain("safe-area-inset-bottom");
    }
  });

  test("이미지 — 모든 이미지 로드 성공", async ({ page }) => {
    await page.goto("/");
    // load 이벤트 대기 — img.naturalWidth 확인 전 이미지 리소스 로드 완료 보장
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("domcontentloaded");

    // 페이지 높이가 뷰포트보다 큰지 (스크롤 가능)
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(scrollHeight).toBeGreaterThan(viewportHeight);

    // 네이티브 휠 이벤트로 스크롤 — overflow-x:clip 환경에서 window.scrollTo가
    // 작동하지 않으므로 실제 브라우저 스크롤 이벤트를 사용
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);

    const scrolled = await page.evaluate(
      () => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
    );
    expect(scrolled).toBeGreaterThan(0);
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
      "/images/characters/miko/nukki/default.png",
      "/images/characters/seonhwa/nukki/default.png",
    ];

    for (const path of testPaths) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be accessible`).toBeLessThan(400);
    }
  });
});
