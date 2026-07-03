import { test, expect } from "@playwright/test";
import {
  selectFirstCharacter,
  navigateToSajuForm,
  fillSajuForm,
  submitSajuForm,
} from "./helpers/service-navigation";

test.describe("사주 서비스 플로우", () => {
  test("Step 1: 캐릭터 선택", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await selectFirstCharacter(page);
    await expect(page.locator("text=생년월일").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Step 2: 개인정보 폼 입력 및 유효성 검증", async ({ page }) => {
    await navigateToSajuForm(page);
    await expect(page.locator("text=성별").first()).toBeVisible();
    await fillSajuForm(page);
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await expect(submitBtn).toBeEnabled();
  });

  test("Step 2→3: 폼 제출 → 시간단위×분석영역 선택", async ({ page }) => {
    await navigateToSajuForm(page);
    await fillSajuForm(page);
    await submitSajuForm(page);
    await expect(page.locator("text=이번 주").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=올해").first()).toBeVisible();
  });

  test("Step 3: 시간단위 + 분석영역 선택 → 세션 이동", async ({ page }) => {
    await navigateToSajuForm(page);
    await fillSajuForm(page);
    await submitSajuForm(page);

    await page.locator("text=올해").first().click();
    await page.locator("text=종합운").first().click();

    const startBtn = page.locator("button").filter({ hasText: /사주 분석|시작|흐름/ }).last();
    await expect(startBtn).toBeEnabled({ timeout: 3_000 });
    await startBtn.click();

    await page.waitForURL("**/saju/session**", { waitUntil: "commit", timeout: 10_000 });
    expect(page.url()).toContain("/saju/session");
  });
});
