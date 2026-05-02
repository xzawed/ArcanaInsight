import { test, expect } from "@playwright/test";

// 테마 ID → 한글 이름 (useTheme.ts의 themes 객체와 일치)
const THEMES = [
  { id: "midnight", nameKo: "한밤의 신비" },
  { id: "dawn",     nameKo: "새벽빛 여명" },
  { id: "sunset",   nameKo: "황혼의 노을" },
  { id: "spring",   nameKo: "벚꽃 봄바람" },
  { id: "summer",   nameKo: "한여름 밤" },
  { id: "autumn",   nameKo: "가을 단풍" },
  { id: "winter",   nameKo: "겨울 설경" },
] as const;

// data-testid 기반 셀렉터 — auto 버튼 오탐 없이 테마 버튼만 정확히 선택
// 데스크탑: data-testid="theme-option-${id}"
// 모바일:  data-testid="mobile-theme-option-${id}"
function themeOptionBtn(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-testid="theme-option-${id}"]`);
}
function mobileThemeOptionBtn(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-testid="mobile-theme-option-${id}"]`);
}

test.describe("테마 드롭다운 — 데스크탑 기본 동작", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("load");
  });

  test("테마 버튼 visible + 드롭다운 열기", async ({ page }) => {
    const btn = page.locator("button[aria-label='테마 변경']").first();
    await expect(btn).toBeVisible();
    await btn.click();

    // 드롭다운 내 자동 모드 항목 표시 확인 (데스크탑: first)
    const autoOption = page.locator("text=자동 (시간/계절)").first();
    await expect(autoOption).toBeVisible({ timeout: 3000 });
  });

  test("외부 클릭 시 드롭다운 닫힘", async ({ page }) => {
    const btn = page.locator("button[aria-label='테마 변경']").first();
    await btn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });

    await page.locator("body").click({ position: { x: 100, y: 400 } });
    await page.waitForTimeout(300);
    await expect(page.locator("text=자동 (시간/계절)").first()).not.toBeVisible();
  });
});

test.describe("테마 드롭다운 — 7개 테마 선택 + localStorage + CSS 변수", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("load");
  });

  for (const { id, nameKo } of THEMES) {
    test(`테마 선택: ${nameKo} (${id})`, async ({ page }) => {
      const btn = page.locator("button[aria-label='테마 변경']").first();
      await btn.click();
      await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });

      // data-testid 기반 — auto 버튼 오탐 완전 차단
      await themeOptionBtn(page, id).evaluate((el) => (el as HTMLElement).click());
      await page.waitForTimeout(300);

      const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
      expect(saved).toBe(id);

      const cssBg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--color-arcana-bg").trim()
      );
      expect(cssBg).toBeTruthy();
    });
  }
});

test.describe("테마 드롭다운 — auto 모드 선택", () => {
  test("자동(시간/계절) 선택 → localStorage 'auto' 저장", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("load");

    const btn = page.locator("button[aria-label='테마 변경']").first();
    await btn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    await themeOptionBtn(page, "midnight").evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    await btn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    await page.locator("text=자동 (시간/계절)").first().evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("auto");
  });
});

test.describe("테마 드롭다운 — 모바일 390px", () => {
  test("모바일 드롭다운 열기 + 한밤의 신비 선택 + 닫힘 확인", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("load");

    // 모바일 테마 버튼 (.last() — 모바일 헤더 버튼)
    const btn = page.locator("button[aria-label='테마 변경']").last();
    await btn.click();

    // 모바일 드롭다운은 DOM 순서상 두 번째(last) — 첫 번째는 데스크탑(md:flex → 390px hidden)
    await expect(page.locator("text=자동 (시간/계절)").last()).toBeVisible({ timeout: 3000 });

    // 모바일 드롭다운 버튼 — mobile-theme-option-* testid 사용
    await mobileThemeOptionBtn(page, "midnight").evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("midnight");

    await expect(page.locator("text=새벽빛 여명").first()).not.toBeVisible();
  });
});

test.describe("테마 — 새로고침 후 유지", () => {
  test("황혼의 노을 선택 후 reload → 테마 유지", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("load");

    const btn = page.locator("button[aria-label='테마 변경']").first();
    await btn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    await themeOptionBtn(page, "sunset").evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    await page.reload();
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("sunset");

    const cssBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-arcana-bg").trim()
    );
    expect(cssBg).toBeTruthy();
  });
});

test.describe("테마 — 설정 페이지 상태 일치", () => {
  test("Header에서 한여름 밤 선택 → 설정 페이지 활성 버튼 일치", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("load");

    const btn = page.locator("button[aria-label='테마 변경']").first();
    await btn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    await themeOptionBtn(page, "summer").evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    await page.goto("/settings");
    await page.waitForLoadState("load");

    const activeBtn = page.locator("button:has-text('한여름 밤')").first();
    await expect(activeBtn).toBeVisible();
    await expect(activeBtn).toHaveClass(/bg-arcana-purple/);
  });
});
