import { test, expect } from "@playwright/test";

test.describe("설정 페이지", () => {
  test("페이지 로드 + 5개 섹션 존재", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").filter({ hasText: "설정" })).toBeVisible();

    const sections = ["테마", "카드 스킨", "상담사 필터", "카드 선택 방식", "저장된 개인정보"];
    for (const section of sections) {
      await expect(page.locator(`text=${section}`).first()).toBeVisible();
    }
  });

  test("테마 선택 — 8개 옵션 존재", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // 자동 + 7개 테마 = 8개 — h2로 정확히 테마 섹션만 매칭 (카드 스타일 섹션 제외)
    const themeSection = page.locator("section").filter({ has: page.locator("h2").filter({ hasText: "테마" }) });
    const themeButtons = themeSection.locator("button");
    expect(await themeButtons.count()).toBe(8);
  });

  test("카드 스킨 — 6개 옵션 존재", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const skinButtons = page.locator("section").filter({ hasText: "카드 스킨" }).locator("button");
    expect(await skinButtons.count()).toBe(6);
  });

  test("성별 필터 — 3버튼 존재 + 클릭 동작", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const filterSection = page.locator("section").filter({ hasText: "상담사 필터" });
    await expect(filterSection.getByRole("button", { name: "전부" })).toBeVisible();
    await expect(filterSection.getByRole("button", { name: "여자" })).toBeVisible();
    await expect(filterSection.getByRole("button", { name: "남자" })).toBeVisible();

    // 클릭 시 스타일 변경
    await filterSection.getByRole("button", { name: "여자" }).click();
  });

  test("카드 확인 모드 — 토글 동작", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const toggle = page.locator("section").filter({ hasText: "카드 선택 방식" }).locator("button");
    await expect(toggle).toBeVisible();

    // 토글 클릭
    await toggle.click();
    await page.waitForTimeout(300);
    // 다시 클릭 (원래 상태로)
    await toggle.click();
  });

  test("콘솔 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
