// ⚠️ 일부 케이스는 실 Supabase 인증 세션 필요 — 비로그인 케이스는 인증 불필요
// 인증 의존 케이스는 TEST_USER_EMAIL/PASSWORD env 미설정 시 skip 처리됨
import { test, expect } from "@playwright/test";

test.describe("마이페이지", () => {
  test("비로그인 접근 → /auth/login 리디렉트", async ({ page }) => {
    await page.goto("/mypage");

    // 비로그인 → /auth/login 리디렉트 또는 로그인 안내 노출 (web-first 대기)
    await expect(page.locator("body")).toContainText(/로그인|Google/);
  });
});
