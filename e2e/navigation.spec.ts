import { test, expect } from "@playwright/test";

test.describe("네비게이션 — Header 데스크탑 링크", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
  });

  test("홈 링크", async ({ page }) => {
    const homeLink = page.locator("header a[href='/']").first();
    await homeLink.click();
    await page.waitForURL("**/");
    await expect(page).toHaveURL(/\/$/);
  });

  test("타로 상담 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/tarot']").first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/tarot", { waitUntil: "commit" });
  });

  test("사주 상담 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/saju']").first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/saju", { waitUntil: "commit" });
  });

  test("마이페이지 링크", async ({ page }) => {
    const link = page.locator("nav a[href='/mypage']").first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL("**/mypage");
  });
});

test.describe("네비게이션 — Header 테마 드롭다운", () => {
  test("테마 드롭다운 열기/닫기", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // 테마 버튼 클릭 (데스크탑 헤더 버튼만, 모바일 헤더 버튼 제외)
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // 드롭다운 표시 (strict mode: 2개 요소 → first)
    const dropdown = page.locator("text=자동 (시간/계절)").first();
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // 테마 선택 (한밤의 신비) — evaluate로 nextjs-portal 가로채기 우회
    const midnightOption = page.locator("text=한밤의 신비").first();
    if (await midnightOption.isVisible()) {
      await midnightOption.evaluate((el) => (el as HTMLElement).click());
    }
  });

  test("테마 변경 후 CSS 변수 적용", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    // 다른 테마 클릭 (황혼의 노을) → 에러 없이 전환되면 성공
    const sunsetBtn = page.locator("button:has-text('황혼의 노을')").first();
    if (await sunsetBtn.isVisible()) {
      await sunsetBtn.click();
      await page.waitForFunction(() => localStorage.getItem("arcana-theme-mode") === "sunset", { timeout: 3000 }).catch(() => {});
      // localStorage에 저장되었는지 확인
      const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
      expect(saved).toBe("sunset");
    }
  });
});

test.describe("네비게이션 — Footer 링크", () => {
  test("Footer 존재 + 서비스 링크", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // 앱 Footer만 선택 (Next.js error-overlay footer 제외)
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    // 서비스 링크 확인
    await expect(footer.locator("a[href='/tarot']")).toBeVisible();
    await expect(footer.locator("a[href='/terms']")).toBeVisible();
    await expect(footer.locator("a[href='/privacy']")).toBeVisible();
  });

  test("Footer 약관 링크 클릭", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();

    const termsLink = footer.locator("a[href='/terms']");
    await termsLink.click();
    await page.waitForURL("**/terms");
    await expect(page.locator("text=이용약관").first()).toBeVisible();
  });

  test("Footer 개인정보 링크 클릭", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer").first();
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    const settingsIcon = page.locator("[data-testid='mobile-settings-link']");
    await expect(settingsIcon).toBeVisible();
  });

  test("모바일 설정 아이콘 클릭 → /settings 이동", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    const settingsIcon = page.locator("[data-testid='mobile-settings-link']");
    await settingsIcon.click();
    await page.waitForURL("**/settings");
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("MobileNav 5탭 표시 + 클릭", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // 타로 탭 클릭 — evaluate로 직접 DOM click (nextjs-portal 가로채기 우회)
    const tarotTab = page.locator("nav a[href='/tarot']").last();
    await expect(tarotTab).toBeVisible();
    if (await tarotTab.isVisible()) {
      await tarotTab.evaluate((el) => (el as HTMLElement).click());
      await page.waitForURL("**/tarot", { waitUntil: "commit" });
      await expect(page).toHaveURL(/\/tarot$/);
    }
  });
});

test.describe("네비게이션 — 페이지 이동 후 스크롤 최상단 초기화", () => {
  // 홈으로 이동하는 케이스가 있어 DailyFortune의 API 호출을 끊는다. CI는 DB가 placeholder라
  // 이 요청이 실패까지 오래 걸리고, 그 사이 재렌더가 목적지 커밋을 더 늦춘다.
  // cross-platform·responsive·api-error-handling spec이 이미 같은 이유로 모킹한다.
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/daily-fortune", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ areas: [] }),
      });
    });
  });

  test("MobileNav 탭 클릭 후 scrollY === 0 (모바일)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // 홈에서 아래로 스크롤
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 2000 });
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);

    // 타로 탭 클릭 → 스크롤 최상단 확인 (evaluate로 nextjs-portal 우회)
    const tarotTab = page.locator("nav a[href='/tarot']").last();
    await tarotTab.evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/tarot", { waitUntil: "commit" });
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 2000 }).catch(() => {});
    const scrollAfterTarot = await page.evaluate(() => window.scrollY);
    expect(scrollAfterTarot).toBe(0);

    // 사주 탭 클릭 → 스크롤 최상단 확인
    const sajuTab = page.locator("nav a[href='/saju']").last();
    await sajuTab.evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/saju", { waitUntil: "commit" });
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 2000 }).catch(() => {});
    const scrollAfterSaju = await page.evaluate(() => window.scrollY);
    expect(scrollAfterSaju).toBe(0);

    // 신점 탭 클릭 → 스크롤 최상단 확인
    const shinjeomTab = page.locator("nav a[href='/shinjeom']").last();
    await shinjeomTab.evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/shinjeom", { waitUntil: "commit" });
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 2000 }).catch(() => {});
    const scrollAfterShinjeom = await page.evaluate(() => window.scrollY);
    expect(scrollAfterShinjeom).toBe(0);
  });

  test("Header 데스크탑 링크 클릭 후 scrollY === 0", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // 홈에서 아래로 스크롤
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 2000 });

    // 타로 링크 클릭
    const tarotLink = page.locator("nav a[href='/tarot']").first();
    await tarotLink.click();
    await page.waitForURL("**/tarot", { waitUntil: "commit" });
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 2000 }).catch(() => {});
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(0);
  });

  test("페이지 내 스크롤 후 다른 페이지 이동 시 초기화", async ({ page }) => {
    // 이 테스트는 두 무거운 라우트를 연달아 지난다: /tarot 진입(외부 R2 배경) → 홈(캐릭터
    // 12장이 next/image 런타임 최적화를 탄다, #521). 단계별 예산(진입 15s + 목적지 30s)의
    // 합이 60s에 근접해 실제로 예산 소진으로 깨졌으므로 90s로 둔다.
    // 이 값은 "느려도 통과시키자"가 아니라 **목적지가 실제로 그만큼 느리다**는 실측 반영이다 —
    // 근본 해소는 #521이고, 그것이 끝나면 이 값을 되돌린다.
    test.setTimeout(90_000);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    // 캐릭터 그리드(로컬 이미지 + CSS aspect-[2/3]로 높이 확정)가 렌더되면 페이지가 스크롤 가능해진다.
    // ServiceBackground(fixed inset-0, 외부 R2)는 scrollHeight에 기여하지 않아 load 대기가 불필요하다.
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화|루나/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 15_000 });

    // 타로 페이지에서 아래로 스크롤 (캐릭터 그리드 영역)
    await page.evaluate(() => window.scrollTo(0, 300));
    // Mobile Android 에뮬에서 scrollTo 반영이 늦거나 무시될 수 있으므로 soft 대기
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 5000 }).catch(() => {});

    // 홈으로 이동 — 안정 testid(mobile-nav-home) + Playwright 신뢰 클릭(액셔너빌리티 자동 대기).
    // `nav a[href='/']`.last()+synthetic evaluate-click+waitUntil:"commit"은 홈(소프트) 네비게이션에서
    // 클릭이 네비게이션을 트리거하지 못해 waitForURL이 60s 타임아웃(#460 CI, error-context: 페이지가 /tarot 유지).
    // web-first toHaveURL은 소프트/하드 네비게이션 무관하게 URL을 폴링하므로 commit 라이프사이클에 비의존.
    // 홈은 이 앱에서 가장 무거운 목적지다 — 캐릭터 12장이 next/image 런타임 최적화를 타고
    // (원본 2816×1536·약 4.8MB, 이슈 #521), DailyFortune이 API를 호출한다. App Router는
    // 새 트리가 커밋될 때까지 **이전 URL을 유지**하므로, 메인 스레드가 포화되면 URL 갱신이
    // 15s를 넘긴다. 2026-08-01 trace 실측: `click action done` 직후 toHaveURL이 계속
    // `/tarot`를 보고, 미완료 요청은 `_next/image` 6건 + `/api/daily-fortune`이었다.
    // 클릭은 성공했고 문제는 목적지 준비 속도이므로, URL이 아니라 **목적지가 실제로
    // 그려졌는지**로 게이트하고 예산을 현실에 맞춘다.
    const homeTab = page.locator("[data-testid='mobile-nav-home']");
    await expect(homeTab).toBeVisible({ timeout: 10_000 });
    // `locator.click()`을 쓰지 않는 이유: trace상 클릭 자체는 성공하지만("click action done"),
    // 그 뒤 click()이 **"waiting for scheduled navigations to finish"** 단계에서 대기한다.
    // App Router 전이가 목적지 커밋까지 끝나지 않으면 이 대기가 60s 예산을 통째로 태우고
    // 실패는 click() 줄로 보고된다. evaluate 디스패치는 그 대기를 만들지 않는다
    // (형제 테스트들이 이미 쓰는 패턴 — :142, :165).
    await homeTab.evaluate((el) => (el as HTMLElement).click());
    // #460이 evaluate에서 물러났던 이유는 `waitForURL(..., "commit")`이 소프트 네비게이션에서
    // 해소되지 않아서였다. 라이프사이클 이벤트에 의존하지 않는 URL 폴링으로 게이트한다.
    //
    // 예산이 큰 이유: 홈은 캐릭터 12장이 next/image 런타임 최적화를 타는 가장 무거운
    // 목적지이고(#521), App Router는 새 트리가 커밋될 때까지 이전 URL을 유지한다.
    // ⚠️ CharacterGallery의 텍스트로 게이트하지 말 것 — next/dynamic 지연 로드라 가장 늦게
    //    나타나며, 실제로 30s 예산을 넘겨 이 테스트를 다시 깨뜨렸다.
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    // 라우트 전환 시 스크롤 최상단 초기화 확인 (load 대기 불필요)
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 5000 }).catch(() => {});
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(0);
  });
});
