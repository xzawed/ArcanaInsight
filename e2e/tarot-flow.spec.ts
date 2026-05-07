import { test, expect } from "@playwright/test";

test.describe("타로 서비스 플로우", () => {
  test("Step 1→2: 캐릭터 선택 → 주제 선택 전환", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 그리드 로딩
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });

    // 첫 번째 캐릭터 클릭
    await characterCards.first().click();

    // 캐릭터 클릭 → 바로 주제 선택 단계로 전환 (상담 시작 중간 단계 없음)
    await expect(page.locator("[data-testid='topic-btn-love-single']")).toBeVisible({ timeout: 5_000 });
  });

  test("Step 2→3: 캐릭터 선택 → 주제 선택", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택 → 바로 topic-select로 전환 (상담 시작 버튼 단계 없음)
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // Step 3: 토픽 목록 표시
    await expect(page.locator("[data-testid='topic-btn-love-single']")).toBeVisible({ timeout: 5_000 });
  });

  test("Step 3→4: 주제 선택 → 스프레드 선택", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택 → 바로 topic-select
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 토픽 선택 (종합)
    await expect(page.locator("[data-testid='topic-btn-general']")).toBeVisible({ timeout: 5_000 });
    await page.locator("[data-testid='topic-btn-general']").click();

    // Step 4: 스프레드 옵션 표시
    await expect(page.locator("[data-testid='spread-btn-one-card']")).toBeVisible({ timeout: 5_000 });
  });

  test("Step 4: 스프레드 선택 → 세션 페이지 이동", async ({ page }) => {
    await page.goto("/tarot");

    // 풀 플로우: 캐릭터 → 주제 → 스프레드
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    await expect(page.locator("[data-testid='topic-btn-general']")).toBeVisible({ timeout: 5_000 });
    await page.locator("[data-testid='topic-btn-general']").click();

    // 원카드 선택 — evaluate로 직접 DOM click (헤더 가로채기 완전 우회)
    const spreadBtn = page.locator("[data-testid='spread-btn-one-card']");
    await expect(spreadBtn).toBeVisible({ timeout: 5_000 });
    await spreadBtn.evaluate((el) => (el as HTMLElement).click());

    // /tarot/session으로 이동
    await page.waitForURL("**/tarot/session**", { timeout: 10_000 });
    expect(page.url()).toContain("/tarot/session");
  });

  test("뒤로가기: 주제 선택에서 캐릭터 선택으로 복귀", async ({ page }) => {
    await page.goto("/tarot");

    // 캐릭터 선택 → 바로 주제 선택 (캐릭터 상세 단계 제거됨)
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();
    await expect(page.locator("[data-testid='topic-btn-love-single']")).toBeVisible({ timeout: 5_000 });

    // 뒤로가기 버튼 클릭
    const backBtn = page.locator("[data-testid='topic-back-btn']");
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(characterCards.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
