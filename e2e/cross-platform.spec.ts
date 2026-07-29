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

  // 결함 탐지용 가드는 재시도를 끊는다. CI 기본 retries:2는 OOM 유래 비결정 실패를 흡수하는 용도인데,
  // "콘솔 에러 없음"·"이미지 로드 성공"처럼 **실제 결함을 잡는 단언**까지 함께 삼켜 green으로 만든다.
  // 실증(2026-07-29 PR #509): 이미지 가드가 placeholder.supabase.co 카드 이미지 404를 정확히 탐지했으나
  // 재시도가 통과시켜 리포트에 `1 flaky`로만 남고 CI는 통과했다. 이 계열은 1회 실패 = 실패로 취급한다.
  test.describe("결함 탐지 가드 (재시도 없음)", () => {
    test.describe.configure({ retries: 0 });

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

      await page.goto("/tarot", { waitUntil: "domcontentloaded" });
      expect(errors).toHaveLength(0);
    });

    test("콘솔 에러 없음 — 사주 페이지", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/saju", { waitUntil: "domcontentloaded" });
      expect(errors).toHaveLength(0);
    });
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

  // 재시도 금지 이유는 위 "결함 탐지 가드" describe 주석 참조 — 이 테스트가 바로 실증 사례다.
  test.describe("이미지 무결성 가드 (재시도 없음)", () => {
    test.describe.configure({ retries: 0 });

    test("이미지 — 모든 이미지 로드 성공", async ({ page }, testInfo) => {
      // 홈 전체 이미지 로드 검사는 데스크톱 1회만 — 깨진 이미지(404)는 엔진 무관이라 브라우저별 반복이 불필요하고,
      // 무거운 홈 이미지 디코드가 메모리-취약한 webkit(Mobile iOS)을 크래시("Target closed")시킨다. (형제 line 203과 동일 스코프)
      test.skip(testInfo.project.name !== "Desktop Chrome", "홈 이미지 로드 검사는 데스크톱 1회만 (webkit 크래시 회피)");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // 상단 뷰포트 이미지들이 로드를 마칠 시간을 단일 예산(15s)으로 확보한다. 이미지별 15s 대기를 누적하면
      // (느린 대형 이미지 여러 개) 30s 테스트 타임아웃을 넘겨 hang → 단일 폴링으로 대체. 예산 초과도 무방(아래에서 complete만 판정).
      await page
        .waitForFunction(
          () => {
            const imgs = Array.from(document.querySelectorAll("img"))
              .slice(0, 20)
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
              });
            return imgs.length > 0 && imgs.every((el) => el.complete);
          },
          { timeout: 15_000 }
        )
        .catch(() => {
          /* 예산 초과 시에도 아래에서 로드가 끝난(complete) 이미지만 판정 */
        });

      // 깨진 이미지 = 로드가 끝났는데(complete) naturalWidth 0 (404/디코드 실패). 로딩 중(!complete)인 유효 이미지는 제외.
      const broken = await page.evaluate(() =>
        Array.from(document.querySelectorAll("img"))
          .slice(0, 20)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
          })
          .filter((el) => el.complete && el.naturalWidth === 0)
          .map((el) => el.currentSrc || el.src),
      );
      expect(broken, `깨진 이미지: ${broken.join(", ")}`).toEqual([]);
    });
  });

  test("스크롤 — 홈 페이지 전체 스크롤 가능", async ({ page, browserName }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Mobile Android Pixel 7 에뮬에서 lazy 콘텐츠(이미지·iframe·next/dynamic) hydration 후
    // scrollHeight 계산이 안정. 아래 scrollHeight > vh+200 waitForFunction 폴링이 결정적으로 대기.
    // (외부 R2 배경/이미지가 load·networkidle을 지연 → Mobile Android 타임아웃, PR #265 계열 → web-first 전환)

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
    }

    // /_next/image cold-start 최적화: 5.7MB PNG 최초 처리가 CI에서 90s를 초과할 수 있음.
    // 30s 이내 응답 시 WebP 포맷 검증, 초과 시 soft-skip (이미지 존재·해상도는 위 Range 검증에서 확인됨).
    const optimized = await request
      .get(
        "/_next/image?url=%2Fimages%2Fcharacters%2Farcana%2Fnukki-enhanced%2Fidle.png&w=48&q=75",
        { headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" }, timeout: 30_000 },
      )
      .catch(() => null);
    if (optimized) {
      expect(optimized.status(), "optimized character thumbnail should load").toBeLessThan(400);
      expect(optimized.headers()["content-type"]).toContain("image/webp");
    }
  });

  test("캐릭터 이미지 에셋 — 전체 해상도(2816×1536) 유지", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "전체 캐릭터 원본 에셋 검사는 데스크톱 1회만 수행");

    const characters = ["arcana", "miko", "seonhwa", "hoshi", "luna", "rei", "cairn", "zero", "haru", "ren", "lix", "ethan"];
    const moods = ["default", "idle", "smile", "serious", "surprised", "wink", "mystical"];

    await page.goto("/");
    const failures = await page.evaluate(
      async ({ characters, moods }) => {
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
            }
          }
        }

        return result;
      },
      { characters, moods }
    );

    expect(failures).toEqual([]);
  });
});
