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

test.describe("테마 드롭다운 — 데스크탑 기본 동작", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("테마 버튼 visible + 드롭다운 열기", async ({ page }) => {
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // 드롭다운 내 자동 모드 항목 표시 확인
    const autoOption = page.locator("text=자동 (시간/계절)").first();
    await expect(autoOption).toBeVisible({ timeout: 3000 });
  });

  test("외부 클릭 시 드롭다운 닫힘", async ({ page }) => {
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await themeBtn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });

    // body 외부 영역 클릭 → 드롭다운 닫힘
    await page.locator("body").click({ position: { x: 100, y: 400 } });
    await page.waitForTimeout(300);
    await expect(page.locator("text=자동 (시간/계절)").first()).not.toBeVisible();
  });
});

test.describe("테마 드롭다운 — 7개 테마 선택 + localStorage + CSS 변수", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  for (const { id, nameKo } of THEMES) {
    test(`테마 선택: ${nameKo} (${id})`, async ({ page }) => {
      // 드롭다운 오픈
      const themeBtn = page.locator("button[aria-label='테마 변경']").first();
      await themeBtn.click();
      await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });

      // 테마 옵션 클릭 — evaluate로 nextjs-portal 가로채기 우회
      const option = page.locator(`text=${nameKo}`).first();
      await option.evaluate((el) => (el as HTMLElement).click());
      await page.waitForTimeout(300);

      // localStorage 저장 확인
      const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
      expect(saved).toBe(id);

      // CSS 변수 적용 확인
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
    await page.waitForLoadState("domcontentloaded");

    // 먼저 다른 테마로 고정
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await themeBtn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    const midnightOption = page.locator("text=한밤의 신비").first();
    await midnightOption.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    // auto 모드로 전환
    await themeBtn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    const autoOption = page.locator("text=자동 (시간/계절)").first();
    await autoOption.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("auto");
  });
});

test.describe("테마 드롭다운 — 모바일 390px", () => {
  test("모바일 드롭다운 열기 + 한밤의 신비 선택 + 닫힘 확인", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 모바일 테마 버튼 (.last() — 모바일 헤더 버튼)
    const themeBtn = page.locator("button[aria-label='테마 변경']").last();
    await themeBtn.click();

    // 드롭다운 표시 확인
    const autoOption = page.locator("text=자동 (시간/계절)").first();
    await expect(autoOption).toBeVisible({ timeout: 3000 });

    // 한밤의 신비 선택
    const midnightOption = page.locator("text=한밤의 신비").first();
    await midnightOption.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    // localStorage 확인
    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("midnight");

    // 드롭다운 닫힘 확인 (새벽빛 여명이 보이지 않아야 함)
    await expect(page.locator("text=새벽빛 여명").first()).not.toBeVisible();
  });
});

test.describe("테마 — 새로고침 후 유지", () => {
  test("황혼의 노을 선택 후 reload → 테마 유지", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 황혼의 노을 선택
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await themeBtn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    const sunsetOption = page.locator("text=황혼의 노을").first();
    await sunsetOption.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    // 새로고침
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // localStorage 유지 확인
    const saved = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
    expect(saved).toBe("sunset");

    // CSS 변수 적용 확인
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
    await page.waitForLoadState("domcontentloaded");

    // Header 드롭다운에서 한여름 밤 선택
    const themeBtn = page.locator("button[aria-label='테마 변경']").first();
    await themeBtn.click();
    await expect(page.locator("text=자동 (시간/계절)").first()).toBeVisible({ timeout: 3000 });
    const summerOption = page.locator("text=한여름 밤").first();
    await summerOption.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(300);

    // 설정 페이지 이동
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    // 설정 페이지의 활성 테마 버튼 확인
    const activeBtn = page.locator("button:has-text('한여름 밤')").first();
    await expect(activeBtn).toBeVisible();
    await expect(activeBtn).toHaveClass(/bg-arcana-purple/);
  });
});
