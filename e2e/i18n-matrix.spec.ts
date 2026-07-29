/**
 * i18n locale 매트릭스 회귀 테스트
 *
 * ai_locale 쿠키 주입 → SSR html[lang] + 클라이언트 UI 텍스트 검증.
 * 인증 불필요 (홈·설정 페이지만 대상).
 */

import { test, expect, type Page } from "@playwright/test";

const LOCALE_COOKIE = "ai_locale";

async function setLocaleCookie(page: Page, locale: "ko" | "en" | "ja") {
  await page.context().addCookies([
    { name: LOCALE_COOKIE, value: locale, domain: "localhost", path: "/" },
  ]);
}

// ─────────────────────────────────────────────
// 홈 페이지 locale 렌더링
// ─────────────────────────────────────────────

test.describe("i18n — 홈 페이지 locale 렌더링", () => {
  test("ko (기본) — html[lang]=ko + 한국어 히어로 CTA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator("text=타로 상담 시작하기").first()).toBeVisible();
  });

  test("en — html[lang]=en + 영어 히어로 CTA", async ({ page }) => {
    await setLocaleCookie(page, "en");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator("text=Start tarot reading").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("ja — html[lang]=ja + 일본어 히어로 CTA", async ({ page }) => {
    await setLocaleCookie(page, "ja");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(
      page.locator("text=タロット占いを始める").first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// 설정 페이지 locale 렌더링
// ─────────────────────────────────────────────

test.describe("i18n — 설정 페이지 locale 렌더링", () => {
  test("ko — 설정 헤딩 한국어", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h1").filter({ hasText: "설정" })).toBeVisible();
  });

  test("en — 설정 헤딩 영어 (Settings)", async ({ page }) => {
    await setLocaleCookie(page, "en");
    await page.goto("/settings");

    await expect(
      page.locator("h1").filter({ hasText: "Settings" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("ja — 설정 헤딩 일본어 (設定)", async ({ page }) => {
    await setLocaleCookie(page, "ja");
    await page.goto("/settings");

    await expect(
      page.locator("h1").filter({ hasText: "設定" })
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// LanguageSwitcher 인터랙션 (데스크탑)
// ─────────────────────────────────────────────

test.describe("i18n — LanguageSwitcher 데스크탑", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
  });

  test("lang-switcher 버튼 존재 + 드롭다운 3개 옵션", async ({ page }) => {
    const switcher = page.locator('[data-testid="lang-switcher"]');
    await expect(switcher).toBeVisible();
    await switcher.click();

    await expect(
      page.locator('[data-testid="lang-option-ko"]')
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.locator('[data-testid="lang-option-en"]')
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.locator('[data-testid="lang-option-ja"]')
    ).toBeVisible({ timeout: 3000 });
  });

  test("영어 선택 → ai_locale 쿠키 en으로 설정", async ({ page }) => {
    await page.locator('[data-testid="lang-switcher"]').click();
    await page.locator('[data-testid="lang-option-en"]').click();
    await page.waitForResponse((resp) => resp.url().includes("api/locale"), { timeout: 3000 }).catch(() => {});

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === LOCALE_COOKIE);
    expect(localeCookie?.value).toBe("en");
  });

  test("일본어 선택 → ai_locale 쿠키 ja로 설정", async ({ page }) => {
    await page.locator('[data-testid="lang-switcher"]').click();
    await page.locator('[data-testid="lang-option-ja"]').click();
    await page.waitForResponse((resp) => resp.url().includes("api/locale"), { timeout: 3000 }).catch(() => {});

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === LOCALE_COOKIE);
    expect(localeCookie?.value).toBe("ja");
  });

  test("영어 전환 후 페이지 재방문 시 영어 UI 유지", async ({ page }) => {
    // 언어 전환
    await page.locator('[data-testid="lang-switcher"]').click();
    await page.locator('[data-testid="lang-option-en"]').click();
    await page.waitForResponse((resp) => resp.url().includes("api/locale"), { timeout: 3000 }).catch(() => {});

    // 재방문
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator("text=Start tarot reading").first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// LanguageSwitcher 인터랙션 (모바일)
// ─────────────────────────────────────────────

test.describe("i18n — LanguageSwitcher 모바일", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
  });

  test("mobile-lang-switcher 버튼 존재 + 드롭다운 옵션", async ({ page }) => {
    const switcher = page.locator('[data-testid="mobile-lang-switcher"]');
    await expect(switcher).toBeVisible();
    await switcher.click();

    await expect(
      page.locator('[data-testid="mobile-lang-option-en"]')
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.locator('[data-testid="mobile-lang-option-ja"]')
    ).toBeVisible({ timeout: 3000 });
  });
});
