import { test, expect } from "@playwright/test";

test.describe("타로 서비스 플로우", () => {
  test("Step 1→2: 캐릭터 선택 → 상세 전환", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 그리드 로딩
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });

    // 첫 번째 캐릭터 클릭
    await characterCards.first().click();

    // Step 2: 캐릭터 상세 정보 표시
    await expect(page.getByRole("button", { name: /상담 시작/i })).toBeVisible({ timeout: 5_000 });
  });

  test("Step 2→3: 상담 시작 → 주제 선택", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 상담 시작
    await page.getByRole("button", { name: /상담 시작/i }).click();

    // Step 3: 토픽 목록 표시
    await expect(page.locator("text=연애").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Step 3→4: 주제 선택 → 스프레드 선택", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택 → 상담 시작
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();
    await page.getByRole("button", { name: /상담 시작/i }).click();

    // 토픽 선택 (종합)
    await page.locator("text=종합").first().click();

    // Step 4: 스프레드 옵션 표시
    await expect(page.locator("text=원카드").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Step 4: 스프레드 선택 → 세션 페이지 이동", async ({ page }) => {
    await page.goto("/tarot");

    // 풀 플로우: 캐릭터 → 상담 → 주제 → 스프레드
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();
    await page.getByRole("button", { name: /상담 시작/i }).click();
    await page.locator("text=종합").first().click();

    // 원카드 선택
    await page.locator("text=원카드").first().click();

    // /tarot/session으로 이동
    await page.waitForURL("**/tarot/session**", { timeout: 10_000 });
    expect(page.url()).toContain("/tarot/session");
  });

  test("뒤로가기: 주제 선택에서 캐릭터 선택으로 복귀", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택 → 상담 시작 → 주제 화면
    const characterCards = page.locator("[class*='cursor-pointer']").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();
    await page.getByRole("button", { name: /상담 시작/i }).click();
    await expect(page.locator("text=연애").first()).toBeVisible({ timeout: 5_000 });

    // 뒤로가기 버튼 클릭
    const backBtn = page.locator("text=다른 상담사 선택").first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      // 캐릭터 그리드 다시 표시
      await expect(characterCards.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
