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

      await page.goto("/", { waitUntil: "domcontentloaded" });
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

    // hydration mismatch는 uncaught exception이 아니라 console.error로 나오므로 위 `pageerror`
    // 가드에 걸리지 않는다. 그리고 "동작 줄이기"를 켜야만 재현되므로 기본 가드는 조건 자체를
    // 만들지 못한다 — 그래서 CanvasParticleLayer의 SSR 불일치가 오래 방치됐다(#525 진단).
    // mismatch가 나면 React가 서버 트리를 버리고 다시 그리는데, 그 사이 클릭이 유실돼
    // E2E가 산발적으로 깨진다. 실제 사용자(OS 동작 줄이기 사용자)도 같은 재렌더를 겪는다.
    // 홈(`/`)도 포함한다 — HeroSection → CharacterDisplay → CharacterAuraLayer가 같은 분기를
    // 갖고 있었는데, 몰입형 라우트만 보던 초기 가드는 이를 통과시켰다(Grok 교차감사에서 발견).
    for (const route of ["/", "/tarot", "/saju", "/shinjeom"]) {
      test(`hydration 불일치 없음 — 동작 줄이기 · ${route}`, async ({ page }) => {
        const hydrationErrors: string[] = [];
        // 프로덕션 빌드는 메시지가 축약되므로(react.dev/errors/418·423) 양쪽 형태를 모두 잡는다.
        const HYDRATION = /hydrat|did not match|react\.dev\/errors\/(418|421|423|425)|Minified React error #(418|421|423|425)/i;
        page.on("console", (msg) => {
          if (msg.type() === "error" && HYDRATION.test(msg.text())) hydrationErrors.push(msg.text());
        });
        page.on("pageerror", (err) => {
          if (HYDRATION.test(err.message)) hydrationErrors.push(err.message);
        });

        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(route, { waitUntil: "domcontentloaded" });

        // hydration은 DCL 이후에 일어나므로 상호작용 가능 상태까지 기다린 뒤 판정한다.
        // 홈은 캐릭터 링크, 몰입형 진입은 캐릭터 선택 버튼이 준비 신호다.
        const ready = route === "/"
          ? page.locator("[href^='/character/']").first()
          : page.locator("button").filter({ hasText: /아르카나|미코|선화|루나/ }).first();
        await expect(ready).toBeVisible({ timeout: 10_000 });

        expect(hydrationErrors).toHaveLength(0);
      });
    }
  });

  test("MobileNav — safe area 하단 패딩 존재", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
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

      // 네트워크 시그널이 정본 — DOM complete 폴링은 로딩 미완료(!complete) 깨진 이미지를 스킵해
      // CI에서 카드 이미지 404가 flaky-pass로 빠져나갔던 결함을 막는다. goto 전에 리스너 부착 필수.
      const networkFailures: string[] = [];
      page.on("response", (response) => {
        if (response.request().resourceType() !== "image") return;
        if (response.status() < 400) return;
        networkFailures.push(`${response.status()} ${response.url()}`);
      });
      page.on("requestfailed", (request) => {
        if (request.resourceType() !== "image") return;
        const failure = request.failure()?.errorText ?? "unknown";
        // net::ERR_ABORTED는 결함이 아님 — 홈 StyleSelector lazy R2 카드가 hydration/src 교체·언마운트로
        // 진행 중 요청을 취소할 때 Playwright가 requestfailed를 낸다. retries:0 가드에서 이 취소만으로
        // 적색이 되면 정상 페이지가 flaky-fail 한다. 진짜 깨진 이미지는 status>=400 또는 DOM naturalWidth=0으로 잡힌다.
        if (failure === "net::ERR_ABORTED") return;
        networkFailures.push(`${failure} ${request.url()}`);
      });

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

      // 2차 시그널: 로드 완료 후 naturalWidth 0 (디코드 실패·빈 응답 등 네트워크 status만으로 안 잡히는 경우).
      // 로딩 중(!complete)은 네트워크 시그널이 담당 — 여기서는 complete 이미지만 본다.
      const brokenDom = await page.evaluate(() =>
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

      // 둘 중 하나라도 실패면 fail — assertion을 분리해 어느 시그널이 터졌는지 바로 보이게 한다.
      expect(networkFailures, `네트워크 이미지 실패: ${networkFailures.join(" | ")}`).toEqual([]);
      expect(brokenDom, `DOM naturalWidth=0: ${brokenDom.join(", ")}`).toEqual([]);
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

  });

  // 이 가드는 두 번 무력했다. ① `.catch(() => null)` + `if (res)` 로 **어떤 실패도 통과**시켰고,
  // ② 검사 대상이 `/_next/image`인데 `NEXT_PUBLIC_CHARACTER_VARIANTS=1`인 환경(CI·프로덕션)에서는
  //    앱이 커스텀 로더로 변형을 직접 가리켜 **그 경로를 아예 타지 않는다.** 즉 변형이 전부
  //    깨져도 초록이었다. 그래서 **홈이 실제로 요청하는 URL**을 HTML에서 뽑아 검증한다.
  test("캐릭터 이미지 서빙 경로 — 홈이 실제로 쓰는 URL이 200", async ({ request, baseURL }) => {
    test.setTimeout(90_000);

    const home = await request.get("/");
    expect(home.status()).toBe(200);
    const html = await home.text();

    // 변형이 켜져 있으면 HTML에 `<mood>-<width>.webp`가 박힌다(커스텀 로더 산출물).
    // ⚠️ **첫 매칭 하나만 보면 안 된다** — 초안 가드가 그렇게 했다가, 없는 파일을 만들어도
    // 다른 URL이 먼저 잡혀 통과했다. 홈이 요청하는 **모든 고유 변형**을 검사한다.
    const found = [...html.matchAll(
      /(?:https?:\/\/[^"'\\\s]+|\/images)\/characters\/[a-z]+\/nukki-enhanced\/[a-z]+-(\d+)\.webp/g,
    )];

    if (found.length > 0) {
      const unique = [...new Map(found.map((m) => [m[0], m])).values()];
      const results = await Promise.all(
        unique.map(async (m) => {
          const url = m[0].startsWith("http") ? m[0] : new URL(m[0], baseURL).toString();
          const res = await request.get(url, { timeout: 20_000 });
          return { url, width: Number(m[1]), status: res.status(), type: res.headers()["content-type"] ?? "" };
        }),
      );

      const broken = results.filter((r) => r.status !== 200 || !r.type.includes("image/webp"));
      expect(broken.map((b) => `${b.status} ${b.type} ${b.url}`), "홈이 요청하는 변형은 전부 200/webp여야 한다").toEqual([]);

      // 로더의 폭 사다리와 생성 스크립트가 어긋나면 여기서 걸린다.
      const outOfLadder = results.filter((r) => ![320, 640, 960, 1280, 1920].includes(r.width));
      expect(outOfLadder.map((r) => r.url), "사다리 밖 폭이 요청됐다").toEqual([]);
      return;
    }

    // 변형이 꺼진 환경(로컬 기본)에서는 런타임 최적화 경로가 정본이다. soft-skip하지 않는다.
    const optimized = await request.get(
      "/_next/image?url=%2Fimages%2Fcharacters%2Farcana%2Fnukki-enhanced%2Fidle.png&w=48&q=75",
      { headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" }, timeout: 60_000 },
    );
    expect(optimized.status(), "변형이 꺼진 환경에서는 런타임 최적화가 동작해야 한다").toBeLessThan(400);
    expect(optimized.headers()["content-type"] ?? "").toContain("image/webp");
  });

  test("캐릭터 이미지 에셋 — 전체 해상도(2816×1536) 유지", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "전체 캐릭터 원본 에셋 검사는 데스크톱 1회만 수행");

    const characters = ["arcana", "miko", "seonhwa", "hoshi", "luna", "rei", "cairn", "zero", "haru", "ren", "lix", "ethan"];
    const moods = ["default", "idle", "smile", "serious", "surprised", "wink", "mystical"];

    await page.goto("/", { waitUntil: "domcontentloaded" });
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
