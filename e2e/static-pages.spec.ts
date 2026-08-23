import { test, expect } from "@playwright/test";

test.describe("정적 페이지", () => {
  test("이용약관 — 콘텐츠 로드", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("text=이용약관").first()).toBeVisible();
    await expect(page.locator("text=목적").first()).toBeVisible();
  });

  test("개인정보처리방침 — 콘텐츠 및 테이블", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.locator("text=개인정보처리방침").first()).toBeVisible();

    // 테이블 존재 확인
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(1);
  });

  test("개인정보처리방침 — 테이블 모바일 가로 스크롤 가능", async ({ page }) => {
    await page.goto("/privacy");
    const tableContainer = page.locator(".overflow-x-auto").first();
    if (await tableContainer.isVisible()) {
      const overflow = await tableContainer.evaluate((el) => getComputedStyle(el).overflowX);
      expect(overflow).toBe("auto");
    }
  });
});

test.describe("서비스 종료 공지", () => {
  test("/notice — 종료 일정과 데이터 파기 안내가 노출된다", async ({ page }) => {
    await page.goto("/notice", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "서비스 종료 안내", level: 1 })).toBeVisible();
    await expect(page.locator("text=2026년 8월 31일").first()).toBeVisible();
    await expect(page.locator("text=2026년 9월 1일").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "이용자 데이터 처리" })).toBeVisible();
  });

  test("/notice — 공지 페이지에는 배너를 중복 렌더하지 않는다", async ({ page }) => {
    await page.goto("/notice", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "서비스 종료 안내", level: 1 })).toBeVisible();
    await expect(page.getByTestId("service-closure-banner")).toHaveCount(0);
  });

  test("홈 — 종료 배너가 노출되고 공지 페이지로 이동한다", async ({ page }) => {
    // 홈은 캐릭터 이미지가 무거워 기본 goto(=load 대기)가 예산을 태운다.
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const banner = page.getByTestId("service-closure-banner");
    await expect(banner).toBeVisible();

    await banner.getByRole("link", { name: "안내 보기" }).click();
    await expect(page).toHaveURL(/\/notice$/);
    await expect(page.getByRole("heading", { name: "서비스 종료 안내", level: 1 })).toBeVisible();
  });
});

test.describe("서비스 종료 배너 무결성 가드 (재시도 없음)", () => {
  // 아래는 '결함 탐지' 단언이라 retries가 삼키면 안 된다(.claude/rules/e2e-testing.md).
  test.describe.configure({ retries: 0 });

  test("배너는 고정 높이 안에서 문구가 잘리지 않는다", async ({ page }) => {
    // 배너는 h-14 md:h-11 + overflow-hidden으로 높이가 고정된다 — (site) main은
    // sticky-footer 플렉스에서 이미 뷰포트를 채우므로, 흐름 높이가 늘면 그대로
    // 유령 스크롤이 되기 때문이다. 대신 문구가 길어지면 조용히 잘린다 — 그걸 잡는다.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("service-closure-banner")).toBeVisible();

    const m = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="service-closure-banner"]');
      return b ? { scrollH: b.scrollHeight, clientH: b.clientHeight } : null;
    });

    expect(m, "배너 렌더").not.toBeNull();
    if (!m) return;
    expect(
      m.scrollH,
      `배너 내용 ${m.scrollH}px > 표시 높이 ${m.clientH}px (문구가 잘린다 — 문구를 줄이거나 배너 높이와 로그인 min-h 보정을 함께 조정)`,
    ).toBeLessThanOrEqual(m.clientH);
  });
});
