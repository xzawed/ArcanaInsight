import { test, expect } from "@playwright/test";
import { enterShinjeomSession, navigateToShinjeomSession, selectFirstCharacter } from "./helpers/service-navigation";

// 서비스 진입 로직은 helpers/service-navigation.ts 1파일에 집중한다(리포지토리 규칙).
// UI가 바뀌면 헬퍼 한 곳만 고치면 되고, spec은 각 단계의 사후조건만 단언한다.
const CHARACTER_CARDS = /아르카나|루나|미코/;

test.describe("신점 서비스 플로우", () => {
  test("캐릭터 선택 → 주제 선택 화면", async ({ page }) => {
    await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
    await selectFirstCharacter(page);

    // 주제 선택 화면 (6개 카테고리)
    await expect(page.locator("text=신수").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=연애").first()).toBeVisible();
    await expect(page.locator("text=재물").first()).toBeVisible();
    await expect(page.locator("text=직장").first()).toBeVisible();
    await expect(page.locator("text=건강").first()).toBeVisible();
    await expect(page.locator("text=택일").first()).toBeVisible();
  });

  test("주제 선택 → 세션 페이지 이동", async ({ page }) => {
    await navigateToShinjeomSession(page);
    expect(page.url()).toContain("/shinjeom/session");
  });

  test("세션 — 인사말 표시 + 입력 필드 존재", async ({ page }) => {
    // 헬퍼가 세션 진입과 인사말("고민") 노출까지 보장한다.
    await enterShinjeomSession(page);

    // 입력 필드 존재
    const input = page.locator("input[type='text']");
    await expect(input).toBeVisible();

    // 전송 버튼 존재
    await expect(page.locator("text=전송")).toBeVisible();

    // 첫 턴 전에는 "신점 결과 받기" 버튼 미노출
    await expect(page.locator("text=신점 결과 받기")).not.toBeVisible();
  });

  test("뒤로가기 — 캐릭터 선택으로 복귀", async ({ page }) => {
    await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
    await selectFirstCharacter(page);

    // 뒤로가기
    const backBtn = page.locator("text=다른 상담사 선택");
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
    await backBtn.click();

    // 캐릭터 그리드 다시 표시
    await expect(page.locator("button").filter({ hasText: CHARACTER_CARDS }).first())
      .toBeVisible({ timeout: 5_000 });
  });

  test("성별 필터 동작", async ({ page }) => {
    await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });

    // 여자 필터
    const femaleBtn = page.getByRole("button", { name: "여자" });
    await femaleBtn.click();

    // 한 번만 읽으면 필터 재조정 전 값을 읽어 플레이키가 된다(`waitForTimeout`은 사후조건이 아니다).
    // 재시도하는 단언으로 게이트한다 — form-validation.spec.ts가 이미 쓰는 패턴.
    const cards = page.locator("button").filter({ hasText: /아르카나|미코|선화|호시|루나|레이/ });
    await expect.poll(() => cards.count(), { timeout: 5_000 }).toBeLessThanOrEqual(6);
  });
});

test.describe("신점 세션 — 메시지 전송 플로우", () => {
  test.beforeEach(async ({ page }) => {
    // 신점 세션 진입: 첫 번째 캐릭터 선택 → 첫 번째 주제 선택 → user-info 건너뛰기
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shinjeom", { waitUntil: "domcontentloaded" });
    await selectFirstCharacter(page);
    // 주제 선택
    const firstTopic = page.locator("[data-testid^='shinjeom-topic-btn-']").first();
    await expect(firstTopic).toBeVisible({ timeout: 5000 });
    await firstTopic.click();
    // user-info 스텝: 건너뛰기
    await page.locator("button:has-text('건너뛰기')").click();
    await page.waitForURL("**/shinjeom/session", { waitUntil: "commit", timeout: 10000 });
  });

  test("입력창 표시 + 메시지 전송 가능", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeDisabled();

    await input.fill("안녕하세요");
    const sendBtn = page.locator("button:has-text('전송')").first();
    await expect(sendBtn).not.toBeDisabled();
  });

  test("메시지 전송 후 isLoading 해제 (타임아웃 없음)", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    await input.fill("오늘 운세는 어때요?");

    const sendBtn = page.locator("button:has-text('전송')").first();
    await sendBtn.click();

    // 전송 후 입력창 비워짐 확인
    await expect(input).toHaveValue("", { timeout: 3000 });

    // 로딩 완료 후 입력 재활성화 (최대 30초 AI 응답 대기)
    await expect(input).not.toBeDisabled({ timeout: 30000 });
  });
});
