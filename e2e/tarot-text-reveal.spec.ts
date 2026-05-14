// e2e/tarot-text-reveal.spec.ts
import { test, expect } from "@playwright/test";

/**
 * 타로 카드 텍스트 비노출 → AI 리딩 완료 후 텍스트 등장 E2E
 *
 * 전제: tarot 세션 페이지에 도달하기 위해 로컬 스토리지 또는
 * 직접 URL 이동 방식으로 세션 상태를 사전 설정한다.
 */

test.describe("타로 카드 텍스트 reveal 흐름", () => {
  test.beforeEach(async ({ page }) => {
    // 세션 스토어 사전 설정: character, topic, spread 선택 완료 상태로 주입
    await page.goto("/tarot");
    await page.evaluate(() => {
      // Zustand persist key로 상태 직접 주입 (테스트 전용)
      localStorage.setItem("arcana-session-store", JSON.stringify({
        state: {
          phase: "card-select",
          characterId: "arcana",
          topic: { id: "love", label: "연애" },
          spreadType: "three-card",
          requiredCards: 3,
          selectedCards: [],
          chatMessages: [],
          readingResult: null,
          isLoading: false,
        },
        version: 0,
      }));
    });
    await page.goto("/tarot/session");
    await page.waitForLoadState("networkidle");
  });

  test("card-select 단계에서 카드명 텍스트가 DOM에 없다 (showLabel=false)", async ({ page }) => {
    // SVG text 요소가 카드명을 포함하지 않아야 함
    // CardFace showLabel=false → THE FOOL 류 텍스트 없음
    await page.waitForTimeout(1500);
    const svgTexts = await page.locator("svg text").allTextContents();
    const hasCardName = svgTexts.some(
      (t) => t.length > 3 && /[A-Z]{2,}/.test(t) && !["THE", "OF"].includes(t)
    );
    // card-select 단계에서는 카드명이 없어야 함
    // (roman numeral만 표시: "0", "I", "II" 등)
    expect(hasCardName).toBe(false);
  });

  test("result 단계에서 카드명 텍스트가 등장한다 (revealAll 후)", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("arcana-session-store", JSON.stringify({
        state: {
          phase: "result",
          characterId: "arcana",
          topic: { id: "love", label: "연애" },
          spreadType: "three-card",
          requiredCards: 3,
          selectedCards: [
            { position: 0, card: { id: "fool", name: "The Fool", number: 0, type: "major" }, isReversed: false },
          ],
          chatMessages: [],
          readingResult: {
            cardInterpretations: [
              { cardId: "fool", position: 0, interpretation: "새로운 시작을 의미합니다." },
            ],
            overallReading: "전체 리딩 완료",
          },
          isLoading: false,
        },
        version: 0,
      }));
    });
    await page.goto("/tarot/session");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // result 단계: reading-content가 존재하고 카드 해석 텍스트가 보임
    const readingContent = page.locator('[data-testid="reading-content"]');
    await expect(readingContent).toBeVisible();
    await expect(readingContent).toContainText("새로운 시작");
  });
});
