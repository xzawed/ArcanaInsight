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
        // iOS WebKit은 load 이벤트 이후에도 이미지 디코딩이 완료되지 않을 수 있으므로
        // complete && naturalWidth > 0 조건을 폴링으로 대기한 뒤 확인한다.
        const handle = await img.elementHandle();
        if (handle) {
          await page
            .waitForFunction(
              (el) =>
                el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0,
              handle,
              { timeout: 10000 }
            )
            .catch(() => {
              /* 폴링 실패 시 아래 expect로 정상 fail */
            });
        }
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        // naturalWidth > 0이면 이미지 로드 성공
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test("스크롤 — 홈 페이지 전체 스크롤 가능", async ({ page }) => {
    await page.goto("/");
    // Mobile Android Pixel 7 에뮬에서 lazy 콘텐츠(이미지·iframe·next/dynamic) load 후
    // scrollHeight 계산이 안정. domcontentloaded · load 직후엔 viewportHeight보다 작아 보이는
    // flaky 사례 발생 (PR #265 회귀 핫픽스 v2 — 2026-05-08).
    await page.waitForLoadState("load");
    await page.waitForLoadState("networkidle").catch(() => { /* networkidle 미도달도 허용 */ });

    // scrollHeight 안정화 폴링 — lazy 이미지 hydration 후 페이지가 viewport보다 충분히 길어질 때까지 대기.
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await page
      .waitForFunction(
        (vh) =>
          Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) > vh + 200,
        viewportHeight,
        { timeout: 10000 }
      )
      .catch(() => { /* 폴링 실패 시 아래 expect로 정상 fail */ });

    // 페이지 높이가 뷰포트보다 큰지 (스크롤 가능)
    const scrollHeight = await page.evaluate(() =>
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    );
    expect(scrollHeight).toBeGreaterThan(viewportHeight);

    // 스크롤: window.scrollTo + 네이티브 휠 이벤트 둘 다 시도 (mobile webkit/android headless 호환)
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 500);
    // 고정 타임아웃 대신 스크롤 상태 폴링 (CI 환경 응답 지연 대응)
    // iOS WebKit headless에서 scrollY가 즉시 반영되지 않으므로
    // document.scrollingElement?.scrollTop fallback을 추가하고 timeout을 10000ms로 늘린다.
    await page.waitForFunction(
      () =>
        (window.scrollY ||
          document.scrollingElement?.scrollTop ||
          document.documentElement.scrollTop ||
          document.body.scrollTop) > 0,
      { timeout: 10000 }
    );

    const scrolled = await page.evaluate(
      () =>
        window.scrollY ||
        document.scrollingElement?.scrollTop ||
        document.documentElement.scrollTop ||
        document.body.scrollTop
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
