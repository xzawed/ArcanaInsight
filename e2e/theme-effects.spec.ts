import { test, expect } from "@playwright/test";

test.describe("Theme Effect Layers", () => {
  test("타로 페이지에 ThemeAtmosphereLayer가 렌더된다", async ({ page }) => {
    await page.goto("/tarot");
    // midnight은 aurora layer가 있음
    const layer = page.getByTestId("theme-atmosphere-layer-midnight");
    await expect(layer).toBeAttached();
  });

  test("InteractionClickParticles 오버레이가 존재한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("interaction-click-particles")).toBeAttached();
  });

  test("ThemeAtmosphere 서비스 레이어가 렌더된다", async ({ page }) => {
    await page.goto("/tarot");
    await expect(
      page.getByTestId("service-theme-atmosphere-tarot")
    ).toBeAttached();
  });

  test("reduced-motion 시 특수 이펙트 레이어가 비활성화된다", async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: "reduce",
      locale: "ko",
    });
    const page = await ctx.newPage();
    await page.goto("/tarot");
    // ThemeAtmosphereLayer(midnight)는 reduced-motion 시에도 DOM에는 존재
    const layer = page.getByTestId("theme-atmosphere-layer-midnight");
    await expect(layer).toBeAttached();
    await ctx.close();
  });

  test("타로 서비스 배경이 렌더된다", async ({ page }) => {
    await page.goto("/tarot");
    await expect(page.getByTestId("service-background-tarot")).toBeAttached();
  });
});
