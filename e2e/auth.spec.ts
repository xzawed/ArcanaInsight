import { test, expect } from "@playwright/test";

test.describe("로그인 페이지", () => {
  test("페이지 렌더링 — Google/Kakao 버튼", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Google")).toBeVisible();
    await expect(page.locator("text=카카오")).toBeVisible();
    await expect(page.locator("text=로그인").first()).toBeVisible();
  });

  test("에러 파라미터 시 에러 메시지 표시", async ({ page }) => {
    await page.goto("/auth/login?error=access_denied&message=인증이+거부되었습니다");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=로그인 실패")).toBeVisible();
  });

  test("안내 텍스트 — 비로그인 이용 가능 안내", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("text=로그인 없이도")).toBeVisible();
  });
});
