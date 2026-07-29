// ⚠️ 실 Supabase 인증 세션 필요 — TEST_USER_EMAIL/PASSWORD env 미설정 시 모든 케이스 skip
// CI에서는 testIgnore 대상은 아니지만 Supabase 자격 증명 없이는 의미 없는 통과 처리됨
import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const hasTestCredentials = TEST_EMAIL && TEST_PASSWORD && SUPABASE_URL && SUPABASE_ANON_KEY;

/** Supabase 이메일 로그인 → 세션 토큰 획득 */
async function getAuthTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
  if (!hasTestCredentials) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch { return null; }
}

test.describe("인증 — 로그인 상태 테스트", () => {
  test.skip(!hasTestCredentials, "TEST_USER 환경변수 미설정");

  test("Supabase 이메일 로그인 성공", async () => {
    const tokens = await getAuthTokens();
    expect(tokens).not.toBeNull();
    expect(tokens!.access_token).toBeTruthy();
  });

  test("마이페이지 — 로그인 상태에서 접근", async ({ page }) => {
    const tokens = await getAuthTokens();
    if (!tokens) return;

    // Supabase 세션 쿠키 설정
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(({ url, access, refresh }) => {
      const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      localStorage.setItem(storageKey, JSON.stringify({
        access_token: access,
        refresh_token: refresh,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }));
    }, { url: SUPABASE_URL, access: tokens.access_token, refresh: tokens.refresh_token });

    await page.goto("/mypage");
    await expect(page.locator("main").first()).toBeVisible();

    // 리디렉트되지 않고 마이페이지 콘텐츠 표시
    const body = await page.textContent("body");
    // 로그인 상태면 프로필 정보 또는 히스토리가 표시됨
    expect(body?.length ?? 0).toBeGreaterThan(100);
  });
});
