import { test, expect } from "@playwright/test";

const CHARACTER_IDS = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
];

test.describe("캐릭터 상세 페이지", () => {
  for (const id of CHARACTER_IDS) {
    test(`/character/${id} — 페이지 로드 및 기본 요소`, async ({ page }) => {
      await page.goto(`/character/${id}`);
      await page.waitForLoadState("networkidle");

      // 캐릭터 이미지 존재 (img.first()는 Header의 hidden 아이콘을 선택할 수 있으므로 캐릭터 경로로 한정)
      const img = page.locator(`img[src*="/characters/"]`).first();
      await expect(img).toBeVisible({ timeout: 10_000 });

      // 서비스 선택 카드 존재 (타로/사주)
      await expect(page.locator("text=타로").first()).toBeVisible();
      await expect(page.locator("text=사주").first()).toBeVisible();
    });
  }

  test("존재하지 않는 캐릭터 ID → 에러 표시", async ({ page }) => {
    await page.goto("/character/nonexistent");
    await page.waitForLoadState("networkidle");

    // 에러 메시지 또는 빈 상태 표시
    const content = await page.textContent("body");
    expect(
      content?.includes("찾을 수 없") || content?.includes("404") || content?.includes("not found")
    ).toBeTruthy();
  });

  test("서비스 카드 — 비활성 항목 클릭 불가", async ({ page }) => {
    await page.goto("/character/arcana");
    await page.waitForLoadState("networkidle");

    // "준비 중" 표시된 비활성 카드 확인
    const disabledCards = page.locator("text=준비 중");
    if (await disabledCards.count() > 0) {
      // opacity 또는 cursor-not-allowed 스타일 확인
      const firstDisabled = disabledCards.first().locator("..");
      const opacity = await firstDisabled.evaluate((el) => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThan(1);
    }
  });
});
