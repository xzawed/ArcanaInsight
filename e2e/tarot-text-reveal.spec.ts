import { test, expect } from "@playwright/test";

/**
 * 타로 showLabel 제어 동작 E2E 검증
 *
 * useSession 스토어는 persist 없는 인메모리 스토어이므로 localStorage 주입 불가.
 * 기본 상태(topic-select, readingResult=null)에서 검증 가능한 계약만 확인한다:
 *   - result phase가 아니면 reading-content 영역 미노출
 *   - card-select 진입 전(기본 상태)에서 SVG 카드명 텍스트 없음
 */

test.describe("타로 카드 텍스트 reveal 흐름", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tarot/session");
    await page.waitForLoadState("networkidle");
  });

  test("result phase가 아니면 reading-content 영역 미노출", async ({ page }) => {
    // 기본 상태(topic-select, readingResult=null)에서 result 섹션은 DOM에 없어야 함
    const readingContent = page.locator('[data-testid="reading-content"]');
    await expect(readingContent).not.toBeVisible();
  });

  test("card-select 이전 단계에서 SVG 카드명 텍스트 없음 (showLabel=false 계약)", async ({ page }) => {
    await page.waitForTimeout(1000);
    const svgTexts = await page.locator("svg text").allTextContents();
    // 카드명은 대문자 2자 이상 단어 (THE, OF 등 조사 제외)
    const hasCardName = svgTexts.some(
      (t) => t.length > 3 && /[A-Z]{2,}/.test(t) && !["THE", "OF"].includes(t),
    );
    expect(hasCardName).toBe(false);
  });
});
