import { expect, type Page } from "@playwright/test";

// ── 공통 ──

export async function selectFirstCharacter(
  page: Page,
  pattern = /아르카나|미코|선화|루나/,
) {
  const cards = page.locator("button").filter({ hasText: pattern });
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  await cards.first().click();
}

// ── 사주 ──

export async function navigateToSajuForm(page: Page) {
  await page.goto("/saju", { waitUntil: "domcontentloaded" });
  await selectFirstCharacter(page);
  await expect(page.locator("text=생년월일").first()).toBeVisible({ timeout: 5_000 });
}

export async function fillSajuForm(
  page: Page,
  opts?: { date?: string; gender?: string; useExactTime?: boolean },
) {
  await page.locator("input[type='date']").fill(opts?.date ?? "1995-06-15");
  await page.getByRole("button", { name: opts?.gender ?? "여성" }).click();
  if (opts?.useExactTime) {
    await page.locator("input[type='number']").first().fill("14");
    await page.locator("input[type='number']").nth(1).fill("30");
  } else {
    await page
      .locator("label")
      .filter({ hasText: "시간을 모릅니다" })
      .locator("input[type='checkbox']")
      .check();
  }
}

export async function submitSajuForm(page: Page) {
  await page.locator("button").filter({ hasText: /시작|다음|확인/ }).last().click();
}

export async function enterSajuSession(page: Page) {
  await page.goto("/saju", { waitUntil: "domcontentloaded" });
  await selectFirstCharacter(page);

  const birthInput = page.locator("input[type='date']");
  await birthInput.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (!(await birthInput.isVisible())) return;

  await fillSajuForm(page, { date: "2000-01-15" });
  const submitBtn = page.locator("button").filter({ hasText: /다음|시작|확인/ }).last();
  if (!(await submitBtn.isEnabled().catch(() => false))) return;
  await submitBtn.click();

  const timeBtn = page.locator("[data-testid^='saju-time-btn-']").first();
  await timeBtn.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (!(await timeBtn.isVisible())) return;
  await timeBtn.click();

  const areaBtn = page.locator("[data-testid^='saju-area-btn-']").first();
  await areaBtn.waitFor({ state: "visible", timeout: 3_000 }).catch(() => {});
  if (!(await areaBtn.isVisible())) return;
  await areaBtn.click();

  const startBtn = page.locator("button").filter({ hasText: /사주 분석|시작|흐름/ }).last();
  if (await startBtn.isEnabled().catch(() => false)) {
    await startBtn.click();
    await page.waitForURL("**/saju/session**", { waitUntil: "commit", timeout: 10_000 }).catch(() => {});
  }
}

// ── 신점 ──

export async function navigateToShinjeomSession(page: Page) {
  await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
  await selectFirstCharacter(page);
  await page.locator("text=신수").first().click();
  // user-info 스텝: 건너뛰기로 즉시 세션 진입
  await page.locator("button:has-text('건너뛰기')").click();
  await page.waitForURL("**/shinjeom/session**", { waitUntil: "commit", timeout: 10_000 });
}

export async function enterShinjeomSession(page: Page) {
  await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
  await selectFirstCharacter(page);
  await page.locator("text=신수").first().click();
  // user-info 스텝: 건너뛰기로 즉시 세션 진입
  await page.locator("button:has-text('건너뛰기')").click();
  await page.waitForURL("**/shinjeom/session**", { waitUntil: "commit", timeout: 10_000 });
  await expect(page.locator("text=고민").first()).toBeVisible({ timeout: 10_000 });
}

// ── 타로 ──

export async function enterTarotSession(page: Page) {
  await page.goto("/tarot", { waitUntil: "domcontentloaded" });
  await selectFirstCharacter(page);
  await expect(page.locator("[data-testid='topic-btn-general']")).toBeVisible({ timeout: 5_000 });
  await page.locator("[data-testid='topic-btn-general']").click();
  const spreadBtn = page.locator("[data-testid='spread-btn-one-card']");
  await expect(spreadBtn).toBeVisible({ timeout: 5_000 });
  await spreadBtn.evaluate((el) => (el as HTMLElement).click());
  await page.waitForURL("**/tarot/session**", { waitUntil: "commit", timeout: 10_000 });
}
