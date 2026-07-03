import { test, expect } from "@playwright/test";

/**
 * UI/UX 품질 테스트 — 텍스트 깨짐, 의도하지 않은 동작, 레이아웃 이상 감지
 */

// JSON 잔여물 패턴 — 이것들이 화면에 보이면 안 됨
const JSON_ARTIFACTS = [
  /"cardInterpretations"/,
  /"overallReading"/,
  /"cardId"/,
  /"interpretation"/,
  /"isReversed"/,
  /^\s*[\{\}\[\]]\s*$/m,
  /\\n\\n/,
];

test.describe("UI 품질 — 텍스트 깨짐 감지", () => {
  const pages = [
    { path: "/", name: "홈" },
    { path: "/tarot", name: "타로" },
    { path: "/saju", name: "사주" },
    { path: "/shinjeom", name: "신점" },
    { path: "/settings", name: "설정" },
    { path: "/auth/login", name: "로그인" },
    { path: "/terms", name: "이용약관" },
    { path: "/privacy", name: "개인정보" },
  ];

  for (const p of pages) {
    test(`${p.name} (${p.path}) — JSON 잔여물 없음 + 콘솔 에러 없음`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      // 외부 CDN(R2) 배경/카드 이미지가 window.load·networkidle을 지연시키므로(Mobile Android 타임아웃)
      // load 이벤트가 아닌 콘텐츠 렌더 자체를 대기한다 (web-first).
      await page.goto(p.path, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => (document.body.textContent?.length ?? 0) > 100, { timeout: 15_000 });
      const bodyText = await page.textContent("body");

      for (const pattern of JSON_ARTIFACTS) {
        expect(bodyText).not.toMatch(pattern);
      }
      expect(errors).toHaveLength(0);
    });
  }
});

test.describe("UI 품질 — 핵심 텍스트 존재 확인", () => {
  test("홈 — 필수 섹션 타이틀", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    // CharacterGallery는 dynamic import이므로 "상담사" 텍스트가 hydration 후 렌더링될 때까지 대기
    await page.waitForFunction(() => document.body.textContent?.includes("상담사"), { timeout: 15_000 });

    const body = await page.textContent("body");
    expect(body).toContain("상담사");
    expect(body).toContain("오늘의 카드");
  });

  test("타로 — 캐릭터 선택 텍스트", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.textContent?.includes("상담사"), { timeout: 15_000 });
    const body = await page.textContent("body");
    expect(body).toContain("상담사");
  });

  test("사주 — 캐릭터 선택 텍스트", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.textContent?.includes("상담사"), { timeout: 15_000 });
    const body = await page.textContent("body");
    expect(body).toContain("상담사");
  });

  test("신점 — 캐릭터 선택 + 주제", async ({ page }) => {
    await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.textContent?.includes("상담사"), { timeout: 15_000 });
    const body = await page.textContent("body");
    expect(body).toContain("신점");
    expect(body).toContain("상담사");
  });

  test("설정 — 6개 섹션 존재", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const body = await page.textContent("body");

    expect(body).toContain("테마");
    expect(body).toContain("카드 스킨");
    expect(body).toContain("상담사 필터");
    expect(body).toContain("카드 선택 방식");
    expect(body).toContain("저장된 개인정보");
  });

  test("로그인 — Google 버튼 + 안내문", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Google")).toBeVisible();
    await expect(page.locator("text=로그인 없이도")).toBeVisible();
  });

  test("이용약관 — 필수 섹션", async ({ page }) => {
    await page.goto("/terms");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=이용약관").first()).toBeVisible();
    await expect(page.locator("text=목적").first()).toBeVisible();
  });

  test("개인정보 — 테이블 + 필수 섹션", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=개인정보처리방침").first()).toBeVisible();
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe("UI 품질 — 레이아웃 깨짐 감지", () => {
  test("홈 — 가로 스크롤 없음 (오버플로우)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("타로 — 가로 스크롤 없음", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.textContent?.includes("상담사"), { timeout: 15_000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("설정 — 모든 섹션 카드 가시", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const sections = page.locator("section");
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }
  });

  test("모든 이미지 로드 성공 (깨진 이미지 없음)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const images = page.locator("img");
    const count = await images.count();

    let broken = 0;
    for (let i = 0; i < Math.min(count, 30); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const { inViewport, naturalWidth } = await img.evaluate((el: HTMLImageElement) => {
          const rect = el.getBoundingClientRect();
          return {
            inViewport: rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0,
            naturalWidth: el.naturalWidth,
          };
        });
        if (inViewport && naturalWidth === 0) broken++;
      }
    }
    expect(broken).toBe(0);
  });
});

test.describe("UI 품질 — 의도하지 않은 동작 감지", () => {
  test("빈 페이지 감지 — body 텍스트가 100자 이상", async ({ page }) => {
    const paths = ["/", "/tarot", "/saju", "/shinjeom", "/settings", "/terms", "/privacy"];
    for (const path of paths) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => (document.body.textContent?.length ?? 0) > 100, { timeout: 15_000 });
      const text = await page.textContent("body");
      expect(text?.length ?? 0, `${path} 페이지가 비어있음`).toBeGreaterThan(100);
    }
  });

  test("무한 로딩 감지 — 로딩 스피너가 5초 내 사라짐", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    // 로딩 인디케이터가 있다면 5초 내 사라져야 함
    const spinner = page.locator("[class*='animate-spin'], [class*='animate-pulse']");
    if (await spinner.count() > 0) {
      await expect(spinner.first()).toBeHidden({ timeout: 5000 });
    }
  });

  test("에러 경계 — 존재하지 않는 페이지 → 404", async ({ request }) => {
    const response = await request.get("/nonexistent-page-12345");
    expect(response.status()).toBe(404);
  });

  test("에러 경계 — 존재하지 않는 캐릭터 → 에러 메시지", async ({ page }) => {
    await page.goto("/character/nonexistent", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => /찾을 수 없|404|not found/i.test(document.body.textContent ?? ""), { timeout: 15_000 });
    const text = await page.textContent("body");
    expect(text).toMatch(/찾을 수 없|404|not found/i);
  });
});
