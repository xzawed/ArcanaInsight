import { expect, test, type Page } from "@playwright/test";
import {
  selectFirstCharacter,
  fillSajuForm,
  submitSajuForm,
} from "./helpers/service-navigation";

async function forceTheme(page: Page, theme = "winter") {
  await page.addInitScript((themeId) => {
    window.localStorage.setItem("arcana-theme-mode", themeId);
  }, theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectAtmosphere(page: Page, testId: string, theme = "winter") {
  const atmosphere = page.locator(`[data-testid="${testId}"]`);
  await expect(atmosphere).toBeAttached({ timeout: 5_000 });
  await expect(atmosphere).toHaveAttribute("data-theme-atmosphere", theme);
  await expect(atmosphere.locator("span.absolute.block").first()).toBeAttached({ timeout: 5_000 });
}

test.describe("테마 atmosphere 적용 범위", () => {
  test("타로 상담사/카테고리/리딩 방식 선택 단계에 테마 atmosphere가 유지된다", async ({ page }) => {
    await forceTheme(page);
    await page.goto("/tarot");

    await expectAtmosphere(page, "service-theme-atmosphere-tarot");
    await selectFirstCharacter(page);

    await expect(page.locator("[data-testid='topic-btn-general']")).toBeVisible({ timeout: 5_000 });
    await expectAtmosphere(page, "service-theme-atmosphere-tarot");

    await page.locator("[data-testid='topic-btn-general']").click();
    await expect(page.locator("[data-testid='spread-btn-one-card']")).toBeVisible({ timeout: 5_000 });
    await expectAtmosphere(page, "service-theme-atmosphere-tarot");
  });

  test("사주 상담사/리딩 카테고리 선택 단계에 테마 atmosphere가 유지된다", async ({ page }) => {
    await forceTheme(page);
    await page.goto("/saju");

    await expectAtmosphere(page, "service-theme-atmosphere-saju");
    await selectFirstCharacter(page);

    await fillSajuForm(page);
    await submitSajuForm(page);

    await expect(page.locator("[data-testid^='saju-time-btn-']").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("[data-testid^='saju-area-btn-']").first()).toBeVisible({ timeout: 5_000 });
    await expectAtmosphere(page, "service-theme-atmosphere-saju");
  });

  test("신점 상담사/리딩 카테고리 선택 단계에 테마 atmosphere가 유지된다", async ({ page }) => {
    await forceTheme(page);
    await page.goto("/shinjeom");

    await expectAtmosphere(page, "service-theme-atmosphere-shinjeom");
    await selectFirstCharacter(page);

    await expect(page.locator("[data-testid^='shinjeom-topic-btn-']").first()).toBeVisible({ timeout: 5_000 });
    await expectAtmosphere(page, "service-theme-atmosphere-shinjeom");
  });

  test("캐릭터 상세 서비스 선택 화면에도 테마 atmosphere가 적용된다", async ({ page }) => {
    await forceTheme(page, "spring");
    await page.goto("/character/arcana");

    await expect(page.getByRole("heading", { name: "아르카나" })).toBeVisible({ timeout: 5_000 });
    await expectAtmosphere(page, "character-theme-atmosphere", "spring");
  });
});
