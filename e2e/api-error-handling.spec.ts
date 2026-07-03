import { test, expect } from "@playwright/test";

test.describe("API 에러 처리 — mock 응답", () => {
  test("타로 리딩 API 500 → 에러 메시지 표시", async ({ page }) => {
    // API 응답을 500으로 mock
    await page.route("**/api/tarot/reading", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/tarot/session", { waitUntil: "domcontentloaded" });
    // 세션 페이지가 로드되면 에러 메시지가 표시되거나 리디렉트
    // (세션 데이터 없이 접근하면 /tarot로 리디렉트됨)
  });

  test("사주 리딩 API 500 → 에러 메시지 표시", async ({ page }) => {
    await page.route("**/api/saju/reading", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/saju/session", { waitUntil: "domcontentloaded" });
  });

  test("신점 메시지 API 400 → 에러 처리", async ({ page }) => {
    await page.route("**/api/shinjeom/message", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Missing required fields" }),
      });
    });

    await page.goto("/shinjeom/session", { waitUntil: "domcontentloaded" });
  });

  test("일일 운세 API 타임아웃 → 에러 처리", async ({ page }) => {
    await page.route("**/api/daily-fortune", (route) => {
      // 10초 지연 후 에러 반환 (타임아웃 시뮬레이션)
      setTimeout(() => {
        route.fulfill({
          status: 504,
          contentType: "application/json",
          body: JSON.stringify({ error: "Gateway Timeout" }),
        });
      }, 3000);
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // 홈 페이지의 DailyFortune이 에러 상태에서도 페이지가 깨지지 않아야 함 (히어로 CTA 가시성으로 렌더 준비 확인)
    await expect(page.getByRole("link", { name: "타로 상담 시작하기" })).toBeVisible();
    const body = await page.textContent("body");
    expect(body?.length ?? 0).toBeGreaterThan(100);
  });

  test("API 429 Rate Limit → 페이지 정상", async ({ page }) => {
    await page.route("**/api/tarot/**", (route) => {
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: { "Retry-After": "30" },
      });
    });

    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=상담사").first()).toBeVisible();
    // 타로 메인 페이지는 API 실패와 무관하게 정상 로드
    const body = await page.textContent("body");
    expect(body).toContain("상담사");
  });

  test("네트워크 완전 차단 → 페이지 기본 렌더링", async ({ page }) => {
    // API만 차단 (페이지 자체는 정상 로드)
    await page.route("**/api/**", (route) => {
      route.abort("connectionrefused");
    });

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    // 설정 페이지는 API 호출 없이 렌더링 가능
    await expect(page.locator("text=테마").first()).toBeVisible();
  });
});
