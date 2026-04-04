import { test, expect } from "@playwright/test";

test.describe("사주 서비스 플로우", () => {
  test("Step 1: 캐릭터 선택", async ({ page }) => {
    await page.goto("/saju");

    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });

    await characterCards.first().click();

    // Step 2: 개인정보 입력 폼 표시
    await expect(page.locator("text=생년월일").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Step 2: 개인정보 폼 입력 및 유효성 검증", async ({ page }) => {
    await page.goto("/saju");

    // 캐릭터 선택
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 폼 필드 확인
    await expect(page.locator("text=생년월일").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=성별").first()).toBeVisible();

    // 생년월일 입력
    const dateInput = page.locator("input[type='date']");
    await dateInput.fill("1995-06-15");

    // 성별 선택 (여성)
    await page.getByRole("button", { name: "여성" }).click();

    // 태어난 시 선택
    const hourSelect = page.locator("select");
    if (await hourSelect.isVisible()) {
      await hourSelect.selectOption({ index: 1 });
    }

    // 제출 버튼 활성화 확인
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await expect(submitBtn).toBeEnabled();
  });

  test("Step 2→3: 폼 제출 → 시간단위×분석영역 선택", async ({ page }) => {
    await page.goto("/saju");

    // 캐릭터 선택
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 폼 입력
    await page.locator("input[type='date']").fill("1995-06-15");
    await page.getByRole("button", { name: "여성" }).click();

    const hourSelect = page.locator("select");
    if (await hourSelect.isVisible()) {
      await hourSelect.selectOption({ index: 1 });
    }

    // 제출
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await submitBtn.click();

    // Step 3: 시간단위 옵션 표시
    await expect(page.locator("text=이번 주").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=올해").first()).toBeVisible();
  });

  test("Step 3: 시간단위 + 분석영역 선택 → 세션 이동", async ({ page }) => {
    await page.goto("/saju");

    // 캐릭터 선택 + 폼 입력 + 제출
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    await page.locator("input[type='date']").fill("1995-06-15");
    await page.getByRole("button", { name: "여성" }).click();
    const hourSelect = page.locator("select");
    if (await hourSelect.isVisible()) await hourSelect.selectOption({ index: 1 });

    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await submitBtn.click();

    // 시간단위 선택 (올해)
    await page.locator("text=올해").first().click();

    // 분석영역 선택 (종합운)
    await page.locator("text=종합운").first().click();

    // 시작 버튼 클릭
    const startBtn = page.locator("button").filter({ hasText: /사주 분석|시작/ }).last();
    await expect(startBtn).toBeEnabled({ timeout: 3_000 });
    await startBtn.click();

    // /saju/session으로 이동
    await page.waitForURL("**/saju/session**", { timeout: 10_000 });
    expect(page.url()).toContain("/saju/session");
  });
});
