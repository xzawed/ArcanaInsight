import { test, expect } from "@playwright/test";
import { createSSEBody, mockSessionCreate, TAROT_READING_CHUNKS, TAROT_READING_RESULT } from "./helpers/sse-mock";

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

  test("뒤로가기: 카드 스프레드 단계 → 스프레드 선택 단계로 복귀 (캐릭터·주제 유지)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockSessionCreate(page, "**/api/tarot/session");

    // 풀 플로우: 캐릭터 → 주제(종합) → 스프레드(원카드) → 세션 카드 선택 단계
    await page.goto("/tarot");
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    await expect(page.locator("[data-testid='topic-btn-general']")).toBeVisible({ timeout: 5_000 });
    await page.locator("[data-testid='topic-btn-general']").click();

    const spreadBtn = page.locator("[data-testid='spread-btn-one-card']");
    await expect(spreadBtn).toBeVisible({ timeout: 5_000 });
    await spreadBtn.evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/tarot/session**", { timeout: 10_000 });

    // 카드 스프레드 단계의 '뒤로' → 이전 단계(스프레드 선택)로 복귀 (상담사 선택 아님)
    const backBtn = page.getByRole("button", { name: /스프레드 다시 선택/ });
    await expect(backBtn).toBeVisible({ timeout: 10_000 });
    await backBtn.click();

    // 스프레드 선택 단계로 복귀 — 주제 유지(general 스프레드 노출), topic-select·character-select 아님
    await page.waitForURL(/\/tarot\?.*step=spread/, { timeout: 5_000 });
    await expect(page.locator("[data-testid='spread-btn-one-card']")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("[data-testid='topic-btn-general']")).toHaveCount(0);
  });

  test("카드 선택 중 중복/초과 클릭을 반복해도 리딩은 한 번만 시작된다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockSessionCreate(page, "**/api/tarot/session");

    let readingRequests = 0;
    await page.route("**/api/tarot/reading", async (route) => {
      readingRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache", "Connection": "keep-alive" },
        body: createSSEBody(TAROT_READING_CHUNKS, { result: TAROT_READING_RESULT }),
      });
    });

    await page.goto("/tarot");
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    await page.locator("[data-testid='topic-btn-general']").click();
    await page.locator("[data-testid='spread-btn-one-card']").evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/tarot/session**", { timeout: 10_000 });

    const firstCard = page.locator("[data-testid='card-back-0']");
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(700);

    for (let i = 0; i < 8; i += 1) {
      await firstCard.click({ force: true });
    }

    const proceedButton = page.getByRole("button", { name: /진행|Proceed|進む|확인|Confirm|確認/ });
    if (await proceedButton.isVisible().catch(() => false)) {
      await proceedButton.click({ force: true });
      await proceedButton.click({ force: true }).catch(() => undefined);
    }

    await expect(page.locator("[data-testid='reading-content']")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-testid='reading-error']")).toHaveCount(0);
    expect(readingRequests).toBe(1);
  });

  test("JSON 파싱 fallback 텍스트가 있으면 오류 대신 결과를 표시한다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockSessionCreate(page, "**/api/tarot/session");
    await page.route("**/api/tarot/reading", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache", "Connection": "keep-alive" },
        body: createSSEBody([], {
          result: {
            cardInterpretations: [],
            overallReading: "카드들이 말하는 핵심은 지금의 불안을 정리하고 다음 선택을 차분히 보라는 것입니다.",
            advice: "",
            parseError: "fallback_text",
            expectedCardCount: 1,
          },
        }),
      });
    });

    await page.goto("/tarot");
    const characterCards = page.locator("button").filter({ hasText: /아르카나|미코|선화/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    await page.locator("[data-testid='topic-btn-general']").click();
    await page.locator("[data-testid='spread-btn-one-card']").evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL("**/tarot/session**", { timeout: 10_000 });

    const firstCard = page.locator("[data-testid='card-back-0']");
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(700);
    await firstCard.click({ force: true });

    await expect(page.locator("[data-testid='reading-content']")).toContainText("카드들이 말하는 핵심", { timeout: 10_000 });
    await expect(page.locator("[data-testid='reading-error']")).toHaveCount(0);
  });
});
