import { test, expect } from "@playwright/test";

test.describe("신점 서비스 플로우", () => {
  test("캐릭터 선택 → 주제 선택 화면", async ({ page }) => {
    await page.goto("/shinjeom");
    await page.waitForLoadState("networkidle");

    // 캐릭터 그리드 존재
    const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });

    // 캐릭터 선택
    await characterCards.first().click();

    // 주제 선택 화면 (6개 카테고리)
    await expect(page.locator("text=신수").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=연애").first()).toBeVisible();
    await expect(page.locator("text=재물").first()).toBeVisible();
    await expect(page.locator("text=직장").first()).toBeVisible();
    await expect(page.locator("text=건강").first()).toBeVisible();
    await expect(page.locator("text=택일").first()).toBeVisible();
  });

  test("주제 선택 → 세션 페이지 이동", async ({ page }) => {
    await page.goto("/shinjeom");
    await page.waitForLoadState("networkidle");

    // 캐릭터 선택
    const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 주제 선택 (신수)
    await page.locator("text=신수").first().click();

    // 세션 페이지 이동
    await page.waitForURL("**/shinjeom/session**", { timeout: 10_000 });
    expect(page.url()).toContain("/shinjeom/session");
  });

  test("세션 — 인사말 표시 + 입력 필드 존재", async ({ page }) => {
    await page.goto("/shinjeom");

    const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();
    await page.locator("text=신수").first().click();
    await page.waitForURL("**/shinjeom/session**", { timeout: 10_000 });

    // 인사말 메시지 존재
    await expect(page.locator("text=고민").first()).toBeVisible({ timeout: 10_000 });

    // 입력 필드 존재
    const input = page.locator("input[type='text']");
    await expect(input).toBeVisible();

    // 전송 버튼 존재
    await expect(page.locator("text=전송")).toBeVisible();

    // 첫 턴 전에는 "신점 결과 받기" 버튼 미노출
    await expect(page.locator("text=신점 결과 받기")).not.toBeVisible();
  });

  test("뒤로가기 — 캐릭터 선택으로 복귀", async ({ page }) => {
    await page.goto("/shinjeom");

    const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    await characterCards.first().click();

    // 뒤로가기
    const backBtn = page.locator("text=다른 상담사 선택");
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
    await backBtn.click();

    // 캐릭터 그리드 다시 표시
    await expect(characterCards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("성별 필터 동작", async ({ page }) => {
    await page.goto("/shinjeom");
    await page.waitForLoadState("networkidle");

    // 여자 필터
    const femaleBtn = page.getByRole("button", { name: "여자" });
    await femaleBtn.click();
    await page.waitForTimeout(300);

    const cards = page.locator("button").filter({ hasText: /아르카나|미코|선화|호시|루나|레이/ });
    expect(await cards.count()).toBeLessThanOrEqual(6);
  });
});

test.describe("신점 세션 — 메시지 전송 플로우", () => {
  test.beforeEach(async ({ page }) => {
    // 신점 세션 진입: 첫 번째 캐릭터 선택 → 첫 번째 주제 선택
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shinjeom");
    await page.waitForLoadState("domcontentloaded");
    // 캐릭터 선택
    const firstChar = page.locator("[data-testid='character-card']").first();
    if (await firstChar.isVisible()) {
      await firstChar.click();
    }
    // 주제 선택
    const firstTopic = page.locator("[data-testid^='shinjeom-topic-btn-']").first();
    await expect(firstTopic).toBeVisible({ timeout: 5000 });
    await firstTopic.click();
    await page.waitForURL("**/shinjeom/session", { timeout: 10000 });
  });

  test("입력창 표시 + 메시지 전송 가능", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeDisabled();

    await input.fill("안녕하세요");
    const sendBtn = page.locator("button:has-text('전송')").first();
    await expect(sendBtn).not.toBeDisabled();
  });

  test("메시지 전송 후 isLoading 해제 (타임아웃 없음)", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await input.fill("오늘 운세는 어때요?");

    const sendBtn = page.locator("button:has-text('전송')").first();
    await sendBtn.click();

    // 전송 후 입력창 비워짐 확인
    await expect(input).toHaveValue("", { timeout: 3000 });

    // 로딩 완료 후 입력 재활성화 (최대 30초 AI 응답 대기)
    await expect(input).not.toBeDisabled({ timeout: 30000 });
  });
});
