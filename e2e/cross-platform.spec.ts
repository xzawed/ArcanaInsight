import { test, expect } from "@playwright/test";

test.describe("크로스 플랫폼 품질 검증", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/daily-fortune", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          areas: [
            { area: "general", cardId: "major-00", isReversed: false, interpretation: "테스트 해석", keywords: ["테스트"] },
            { area: "love", cardId: "major-06", isReversed: false, interpretation: "연애 해석", keywords: ["인연"] },
            { area: "career", cardId: "major-01", isReversed: false, interpretation: "직장 해석", keywords: ["의지"] },
            { area: "health", cardId: "major-14", isReversed: false, interpretation: "건강 해석", keywords: ["균형"] },
            { area: "wealth", cardId: "major-10", isReversed: false, interpretation: "재물 해석", keywords: ["행운"] },
          ],
        }),
      });
    });
  });

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

    const images = await page.locator("img").elementHandles();

    for (const img of images.slice(0, 20)) {
      const snapshot = await img
        .evaluate((el: HTMLImageElement) => {
          if (!el.isConnected) return { isConnected: false, isVisible: false, currentSrc: "", naturalWidth: 0 };
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return {
            isConnected: true,
            isVisible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none",
            currentSrc: el.currentSrc || el.src,
            naturalWidth: el.naturalWidth,
          };
        })
        .catch(() => ({ isConnected: false, isVisible: false, currentSrc: "", naturalWidth: 0 }));

      if (!snapshot.isConnected || !snapshot.isVisible) continue;

      await page
        .waitForFunction(
          (el) => {
            if (!(el instanceof HTMLImageElement) || !el.isConnected) return true;
            el.scrollIntoView({ block: "center", inline: "nearest" });
            return el.complete && el.naturalWidth > 0;
          },
          img,
          { timeout: 15000 }
        )
        .catch(() => {
          /* 폴링 실패 시 아래 expect로 정상 fail */
        });

      const result = await img
        .evaluate((el: HTMLImageElement) => ({
          currentSrc: el.currentSrc || el.src,
          naturalWidth: el.naturalWidth,
        }))
        .catch(() => null);
      if (!result) continue;
      // naturalWidth > 0이면 이미지 로드 성공
      expect(result.naturalWidth, result.currentSrc).toBeGreaterThan(0);
    }
  });

  test("스크롤 — 홈 페이지 전체 스크롤 가능", async ({ page, browserName }) => {
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

    // 스크롤: mobile WebKit은 mouse.wheel을 지원하지 않으므로 DOM 스크롤만 사용.
    await page.evaluate(() => window.scrollTo(0, 500));
    if (browserName !== "webkit") {
      await page.mouse.move(200, 400);
      await page.mouse.wheel(0, 500);
    }
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

  test("캐릭터 이미지 경로 — 운영용 enhanced 캐릭터 이미지 접근 가능", async ({ request }) => {
    // 2816×1536 PNG 12개 전체 다운로드 → CI 30s 초과 방지: timeout 연장 + Range 헤더로 PNG IHDR만 수신
    test.setTimeout(90_000);

    const testPaths = [
      "/images/characters/arcana/nukki-enhanced/default.png",
      "/images/characters/miko/nukki-enhanced/default.png",
      "/images/characters/seonhwa/nukki-enhanced/default.png",
      "/images/characters/hoshi/nukki-enhanced/default.png",
      "/images/characters/luna/nukki-enhanced/default.png",
      "/images/characters/rei/nukki-enhanced/wink.png",
      "/images/characters/cairn/nukki-enhanced/default.png",
      "/images/characters/zero/nukki-enhanced/default.png",
      "/images/characters/haru/nukki-enhanced/default.png",
      "/images/characters/ren/nukki-enhanced/default.png",
      "/images/characters/lix/nukki-enhanced/default.png",
      "/images/characters/ethan/nukki-enhanced/default.png",
    ];

    for (const path of testPaths) {
      // Range: bytes=0-32 — PNG signature(8) + IHDR chunk(4+4+13) = bytes 0-28로 width/height/color type 검증 가능
      const response = await request.get(path, { headers: { range: "bytes=0-32" } });
      // 206 Partial Content(Range 지원) 또는 200 OK(Range 미지원) 모두 허용
      expect(response.status(), `${path} should be accessible`).toBeLessThan(400);

      const body = await response.body();
      expect(body.readUInt32BE(16), `${path} width`).toBe(2816);
      expect(body.readUInt32BE(20), `${path} height`).toBe(1536);
      expect(body.readUInt8(25), `${path} PNG color type`).toBe(6);
    }

    const optimized = await request.get(
      "/_next/image?url=%2Fimages%2Fcharacters%2Farcana%2Fnukki-enhanced%2Fidle.png&w=48&q=75",
      { headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" } }
    );
    expect(optimized.status(), "optimized character thumbnail should load").toBeLessThan(400);
    expect(optimized.headers()["content-type"]).toContain("image/webp");
  });

  test("캐릭터 이미지 에셋 — enhanced 전체 해상도와 투명 알파 유지", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "전체 캐릭터 원본 에셋 검사는 데스크톱 1회만 수행");

    const characters = ["arcana", "miko", "seonhwa", "hoshi", "luna", "rei", "cairn", "zero", "haru", "ren", "lix", "ethan"];
    const moods = ["default", "idle", "smile", "serious", "surprised", "wink", "mystical"];

    await page.goto("/");
    const failures = await page.evaluate(
      async ({ characters, moods }) => {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 54;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return ["canvas context unavailable"];

        const loadImage = (src: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`failed to load ${src}`));
            image.src = src;
          });

        const result: string[] = [];
        for (const character of characters) {
          for (const mood of moods) {
            const src = `/images/characters/${character}/nukki-enhanced/${mood}.png`;
            const image = await loadImage(src);
            if (image.naturalWidth !== 2816 || image.naturalHeight !== 1536) {
              result.push(`${src}: ${image.naturalWidth}x${image.naturalHeight}`);
              continue;
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let transparent = 0;
            let translucent = 0;
            for (let index = 3; index < pixels.length; index += 4) {
              if (pixels[index] === 0) transparent += 1;
              if (pixels[index] > 0 && pixels[index] < 255) translucent += 1;
            }
            if (transparent === 0) result.push(`${src}: transparent alpha missing`);
            if (translucent === 0) result.push(`${src}: antialias alpha missing`);
          }
        }

        return result;
      },
      { characters, moods }
    );

    expect(failures).toEqual([]);
  });
});
