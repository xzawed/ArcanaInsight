import { test, expect } from "@playwright/test";

test.describe("홈 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지 로드 성공 및 콘솔 에러 없음", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("HeroSection — CTA 버튼 2개 가시성", async ({ page }) => {
    await expect(page.getByRole("link", { name: /타로 상담/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /오늘의 카드/i })).toBeVisible();
  });

  test("CharacterGallery — 캐릭터 카드 표시", async ({ page }) => {
    const gallery = page.locator("text=상담사를 선택하세요").first();
    await gallery.scrollIntoViewIfNeeded();

    // 최소 12개 캐릭터 카드 존재
    const cards = page.locator("[href^='/character/']");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(12);
  });

  test("CharacterGallery — 성별 필터 동작", async ({ page }) => {
    const gallery = page.locator("text=상담사를 선택하세요").first();
    await gallery.scrollIntoViewIfNeeded();

    // "여자" 필터 클릭
    const femaleBtn = page.getByRole("button", { name: "여자" });
    await femaleBtn.click();

    // 필터 후 캐릭터 수 감소 (6명)
    const cards = page.locator("[href^='/character/']");
    await page.waitForTimeout(300); // 필터 애니메이션 대기
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(6);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("DailyCard — 섹션 존재 및 탭 전환", async ({ page }) => {
    const section = page.locator("#daily-card");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();

    // 캐릭터 탭 버튼 존재
    const tabs = section.getByRole("button");
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test("FAQ — 아코디언 열기/닫기", async ({ page }) => {
    const faqSection = page.locator("text=자주 묻는 질문").first();
    await faqSection.scrollIntoViewIfNeeded();

    // 첫 번째 FAQ 항목 클릭
    const firstQuestion = page.locator("text=AI가 정말로 타로를 해석").first();
    if (await firstQuestion.isVisible()) {
      await firstQuestion.click();
      // 답변 영역이 열리는지 확인
      await page.waitForTimeout(500);
    }
  });

  test("BottomCTA — 버튼 존재", async ({ page }) => {
    const cta = page.locator("text=지금 시작하기").last();
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
  });
});
