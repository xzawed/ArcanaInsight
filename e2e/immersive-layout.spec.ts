import { test, expect } from "@playwright/test";
import { enterTarotSession } from "./helpers/service-navigation";
import { mockSessionCreate } from "./helpers/sse-mock";

/**
 * 모바일 몰입형 레이아웃 회귀 가드 (PR: 이중 스크롤 + 카드리딩 대기 UI 가림 수정).
 *
 * 버그1(이중 스크롤): 몰입형 라우트는 app/(immersive) 그룹 레이아웃에서 전역 Footer를
 *   렌더하지 않으므로, 100dvh 스테이지 아래 footer가 쌓여 document가 추가 스크롤되던
 *   현상이 사라진다. 일반(site) 라우트는 Footer를 그대로 유지한다.
 * 버그2(대기 UI 가림): ReadingProgressIndicator는 z-40으로 모바일 대사창(z-30) 위에 그려진다.
 */
const MOBILE = { width: 390, height: 844 };

test.describe("몰입형 레이아웃 — 이중 스크롤 / 대기 UI (모바일)", () => {
  test.use({ viewport: MOBILE });

  test("몰입형 라우트는 전역 Footer를 렌더하지 않는다", async ({ page }) => {
    for (const url of ["/tarot", "/saju", "/shinjeom", "/character/arcana"]) {
      // 무거운 이미지로 "load" 이벤트가 지연되므로 domcontentloaded 기준 (Footer는 SSR 렌더).
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("footer")).toHaveCount(0);
    }
  });

  test("일반(site) 라우트는 전역 Footer를 렌더한다", async ({ page }) => {
    for (const url of ["/", "/privacy", "/terms"]) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("footer")).toHaveCount(1);
    }
  });

  test("타로 세션은 외부 document 스크롤이 없다 (이중 스크롤 제거)", async ({ page }) => {
    await mockSessionCreate(page, "**/api/tarot/session");
    await enterTarotSession(page);
    await expect(page.locator("footer")).toHaveCount(0);
    // 스테이지가 가용 높이를 정확히 채워 외부(document) 스크롤이 없어야 한다.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("카드리딩 대기 인디케이터가 대사창 위(z-40)로 보인다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockSessionCreate(page, "**/api/tarot/session");
    // 리딩 응답을 지연시켜 phase=reading(로딩) 상태를 유지 → 인디케이터가 노출된 상태를 단언.
    await page.route("**/api/tarot/reading", async (route) => {
      await new Promise((r) => setTimeout(r, 6000));
      await route.abort();
    });
    await enterTarotSession(page);

    const firstCard = page.locator("[data-testid='card-back-0']");
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(700); // 덱 스프레드 애니메이션 안정화 (tarot-flow 패턴)
    await firstCard.click({ force: true }); // 원카드 → 자동 리딩 시작

    const indicator = page.getByTestId("reading-progress");
    await expect(indicator).toBeVisible({ timeout: 10_000 });
    // 대사창(z-30)보다 위 stacking — 가림 회귀 방지.
    const z = await indicator.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(z)).toBeGreaterThanOrEqual(40);
  });
});
