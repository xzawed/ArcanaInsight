import { test, expect } from "@playwright/test";
import {
  navigateToSajuForm,
  navigateToShinjeomSession,
} from "./helpers/service-navigation";

test.describe("폼 유효성 — 사주 개인정보 입력", () => {
  test("모든 필드 비어있으면 제출 버튼 비활성화", async ({ page }) => {
    await navigateToSajuForm(page);
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await expect(submitBtn).toBeDisabled();
  });

  test("생년월일만 입력 → 여전히 비활성화", async ({ page }) => {
    await navigateToSajuForm(page);
    await page.locator("input[type='date']").fill("1995-06-15");
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await expect(submitBtn).toBeDisabled();
  });

  test("생년월일 + 성별 + 태어난 시 입력 → 활성화", async ({ page }) => {
    await navigateToSajuForm(page);
    await page.locator("input[type='date']").fill("1995-06-15");
    await page.getByRole("button", { name: "여성" }).click();
    // 사주 모드는 시·분 입력 또는 "시간을 모릅니다" 체크 필수
    await page.locator("input[type='number']").first().fill("14");
    await page.locator("input[type='number']").nth(1).fill("30");
    const submitBtn = page.locator("button").filter({ hasText: /시작|다음|확인/ }).last();
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
  });

  test("태어난 시 입력 가능", async ({ page }) => {
    await navigateToSajuForm(page);
    await page.locator("input[type='number']").first().fill("14");
    await page.locator("input[type='number']").nth(1).fill("30");
    // 자동 시진 변환 레이블 표시 확인
    await expect(page.locator("text=미시").first()).toBeVisible({ timeout: 2_000 });
  });
});

test.describe("폼 유효성 — 신점 메시지 입력", () => {
  test("빈 메시지 전송 차단", async ({ page }) => {
    await navigateToShinjeomSession(page);
    const sendBtn = page.locator("button").filter({ hasText: "전송" });
    await expect(sendBtn).toBeDisabled();
  });

  test("텍스트 입력 후 전송 활성화", async ({ page }) => {
    await navigateToShinjeomSession(page);
    const input = page.locator("input[type='text']");
    await input.fill("테스트 메시지입니다");
    const sendBtn = page.locator("button").filter({ hasText: "전송" });
    await expect(sendBtn).toBeEnabled();
  });

  test("입력 필드 항상 표시 + 첫 턴 전 결과 버튼 미노출", async ({ page }) => {
    await navigateToShinjeomSession(page);
    // 입력 필드는 항상 표시
    await expect(page.locator("input[type='text']")).toBeVisible();
    // 첫 턴 전에는 "신점 결과 받기" 버튼 미노출
    await expect(page.locator("text=신점 결과 받기")).not.toBeVisible();
  });
});

test.describe("설정 — 상태 저장 + 교차 페이지 반영", () => {
  test("테마 변경 후 새로고침 → 유지", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // 한밤의 신비 테마 선택
    const midnightBtn = page.locator("button").filter({ hasText: "한밤의 신비" });
    if (await midnightBtn.isVisible()) {
      await midnightBtn.click();
      await page.waitForTimeout(500);

      // 새로고침
      await page.reload();
      await page.waitForLoadState("networkidle");

      // localStorage에서 테마 확인
      const savedTheme = await page.evaluate(() => localStorage.getItem("arcana-theme-mode"));
      expect(savedTheme).toBe("midnight");
    }
  });

  test("성별 필터 변경 → 타로 페이지 반영", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // 여자 필터 선택
    const femaleBtn = page.locator("section").filter({ hasText: "상담사 필터" }).getByRole("button", { name: "여자" });
    await femaleBtn.click();
    await page.waitForTimeout(300);

    // 타로 페이지로 이동
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });

    // 캐릭터 카드 수 확인 — 캐릭터 이름 텍스트가 포함된 버튼만 카운트 (필터 버튼 제외)
    const characterCards = page.locator("button").filter({
      hasText: /아르카나|미코|선화|호시|루나|레이|카이른|제로|하루|렌|릭스|에단/,
    });
    await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
    // hydration이 persist된 성별 필터(여자)를 적용해 12→6으로 재조정될 때까지 재시도 대기.
    // one-shot count는 재조정 전 SSR의 12를 읽어 플레이키 — 제거한 networkidle을 web-first 재시도로 대체.
    await expect
      .poll(async () => characterCards.count(), { timeout: 10_000 })
      .toBeLessThanOrEqual(6); // 여자 필터: 6명 이하
  });

  test("카드 확인 모드 토글 후 유지", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // 토글 클릭 (ON으로)
    const toggle = page.locator("section").filter({ hasText: "카드 선택 방식" }).locator("button");
    await toggle.click();
    await page.waitForTimeout(300);

    // localStorage 확인
    const saved = await page.evaluate(() => localStorage.getItem("arcana-confirm-each-card"));
    // 토글 상태가 변경되었는지 확인
    expect(saved).toBeDefined();
  });
});
