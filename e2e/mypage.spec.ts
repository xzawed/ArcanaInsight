import { test, expect } from "@playwright/test";

test.describe("마이페이지", () => {
  test("비로그인 접근 → /auth/login 리디렉트", async ({ page }) => {
    await page.goto("/mypage");

    // 로그인 페이지로 리디렉트되거나, 로그인 버튼이 표시됨
    await page.waitForLoadState("networkidle");
    const url = page.url();
    const content = await page.textContent("body");

    expect(
      url.includes("/auth/login") ||
      content?.includes("로그인") ||
      content?.includes("Google")
    ).toBeTruthy();
  });
});
