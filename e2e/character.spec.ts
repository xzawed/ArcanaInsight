import { test, expect } from "@playwright/test";

const CHARACTER_IDS = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
];

test.describe("캐릭터 상세 페이지", () => {
  for (const id of CHARACTER_IDS) {
    test(`/character/${id} — 페이지 로드 및 기본 요소`, async ({ page }) => {
      await page.goto(`/character/${id}`, { waitUntil: "domcontentloaded" });

      // 캐릭터 이미지 존재 (Next.js Image는 /_next/image?url=...characters... 로 렌더링)
      const img = page.locator('img[src*="characters"]').first();
      await expect(img).toBeVisible({ timeout: 10_000 });

      // 서비스 선택 섹션 헤딩 존재 (서비스 카드는 스크롤 컨테이너 내부일 수 있음)
      await expect(page.locator("h2", { hasText: "서비스 선택" })).toBeVisible();
    });
  }

  test("존재하지 않는 캐릭터 ID → 에러 표시", async ({ page }) => {
    await page.goto("/character/nonexistent", { waitUntil: "domcontentloaded" });

    // 존재하지 않는 캐릭터 → 404 (web-first — body에 에러 텍스트 노출 대기)
    await expect(page.locator("body")).toContainText(/찾을 수 없|404|not found/i);
  });

  test("서비스 카드 — 비활성 항목 클릭 불가", async ({ page }) => {
    await page.goto("/character/arcana", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h2", { hasText: "서비스 선택" })).toBeVisible();

    // "준비 중" 표시된 비활성 카드 확인
    const disabledCards = page.locator("text=준비 중");
    if (await disabledCards.count() > 0) {
      // opacity 또는 cursor-not-allowed 스타일 확인
      const firstDisabled = disabledCards.first().locator("..");
      const opacity = await firstDisabled.evaluate((el) => getComputedStyle(el).opacity);
      expect(Number.parseFloat(opacity)).toBeLessThan(1);
    }
  });
});
