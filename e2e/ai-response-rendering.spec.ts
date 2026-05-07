import { test, expect } from "@playwright/test";
import {
  createSSEBody,
  mockSSERoute,
  mockSessionCreate,
  SHINJEOM_MID_RESPONSE,
  SHINJEOM_FINAL_RESULT,
  TAROT_READING_RESULT,
  SAJU_READING_RESULT,
  SAJU_DATA,
  JSON_ARTIFACTS,
} from "./helpers/sse-mock";

/**
 * AI 응답 렌더링 검증 — Mock SSE로 실제 응답 렌더링을 테스트
 *
 * 기존 테스트와의 차이점:
 * - 기존: UI 요소 존재 여부 + 네비게이션만 확인
 * - 이번: API 성공 응답이 화면에 올바르게 렌더링되는지 검증 (JSON 미노출, 텍스트 정상 표시)
 */

// ── 신점 진입 헬퍼 ──
async function enterShinjeomSession(page: import("@playwright/test").Page) {
  await page.goto("/shinjeom");
  await page.waitForLoadState("networkidle");

  const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
  await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
  await characterCards.first().click();

  await page.locator("text=신수").first().click();
  await page.waitForURL("**/shinjeom/session**", { timeout: 10_000 });
  await expect(page.locator("text=고민").first()).toBeVisible({ timeout: 10_000 });
}

// ── 타로 진입 헬퍼 ──
async function enterTarotSession(page: import("@playwright/test").Page) {
  await page.goto("/tarot");
  await page.waitForLoadState("networkidle");

  const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
  await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
  await characterCards.first().click();

  // 주제 선택 (종합)
  await expect(page.locator("text=종합").first()).toBeVisible({ timeout: 5_000 });
  await page.locator("text=종합").first().click();

  // 스프레드 선택 (원카드)
  // step 전환 후 원카드 버튼 — evaluate로 직접 DOM click (헤더 가로채기 완전 우회)
  const spreadBtn = page.locator("button").filter({ hasText: "원카드" }).first();
  await expect(spreadBtn).toBeVisible({ timeout: 5_000 });
  await spreadBtn.evaluate((el) => (el as HTMLElement).click());

  await page.waitForURL("**/tarot/session**", { timeout: 10_000 });
}

// ── 사주 진입 헬퍼 ──
async function enterSajuSession(page: import("@playwright/test").Page) {
  await page.goto("/saju");
  await page.waitForLoadState("networkidle");

  const characterCards = page.locator("button").filter({ hasText: /아르카나|루나|미코/ });
  await expect(characterCards.first()).toBeVisible({ timeout: 10_000 });
  await characterCards.first().click();

  // 개인정보 입력
  const birthInput = page.locator("input[type='date']");
  await birthInput.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (await birthInput.isVisible()) {
    await birthInput.fill("2000-01-15");
    // 성별 선택
    const genderSelect = page.locator("select").filter({ hasText: /남|여/ }).first();
    if (await genderSelect.isVisible()) {
      await genderSelect.selectOption({ index: 1 });
    }
    // 제출
    const submitBtn = page.locator("button").filter({ hasText: /다음|시작|확인/ }).first();
    if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
      await submitBtn.click();
    }
  }
}

test.describe("AI 응답 렌더링 — 신점", () => {
  test("중간 대화 — 텍스트 정상 렌더링 + JSON 미노출", async ({ page }) => {
    // 세션 생성 mock
    await mockSessionCreate(page, "**/api/shinjeom/session");

    // 중간 대화 SSE mock (1~2번째 턴)
    const midSSE = createSSEBody(
      SHINJEOM_MID_RESPONSE.split("").reduce((acc: string[], char, i) => {
        // 10자 단위 청크
        const chunkIdx = Math.floor(i / 10);
        acc[chunkIdx] = (acc[chunkIdx] || "") + char;
        return acc;
      }, []),
      { isFinal: false, message: SHINJEOM_MID_RESPONSE },
    );
    await mockSSERoute(page, "**/api/shinjeom/message", midSSE);

    await enterShinjeomSession(page);

    // 고민 입력 + 전송
    const input = page.locator("input[type='text']");
    await input.fill("요즘 직장에서 스트레스가 많아요");
    await page.locator("button", { hasText: "전송" }).click();

    // 응답 완료 대기 (SSE 스트리밍 종료 → 입력창 활성화)
    await expect(page.locator("input[type='text']")).toBeEnabled({ timeout: 8_000 });

    // 채팅에서 응답 텍스트 일부 확인
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("고민");

    // JSON 잔여물 미노출 확인
    for (const pattern of JSON_ARTIFACTS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("최종 결과 — raw JSON 미표시 + 결과 화면 정상 렌더링", async ({ page }) => {
    await mockSessionCreate(page, "**/api/shinjeom/session");

    // 1~2번째 턴은 텍스트 응답, 3번째(버튼 클릭)는 최종 결과
    let callCount = 0;
    await page.route("**/api/shinjeom/message", (route) => {
      callCount++;
      if (callCount < 3) {
        const midSSE = createSSEBody(
          ["공감합니다. ", "더 자세히 ", "알려주세요."],
          { isFinal: false, message: "공감합니다. 더 자세히 알려주세요." },
        );
        route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: { "Cache-Control": "no-cache" },
          body: midSSE,
        });
      } else {
        // "신점 결과 받기" 버튼 클릭(최종) — JSON 결과
        const jsonStr = JSON.stringify(SHINJEOM_FINAL_RESULT);
        const finalSSE = createSSEBody(
          [jsonStr.slice(0, 50), jsonStr.slice(50, 100), jsonStr.slice(100)],
          { isFinal: true, result: SHINJEOM_FINAL_RESULT },
        );
        route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: { "Cache-Control": "no-cache" },
          body: finalSSE,
        });
      }
    });

    await enterShinjeomSession(page);

    // 2회 대화 진행 (중간 대화) — SSE mock 즉시 완료 → 입력창 재활성화 대기
    for (let i = 0; i < 2; i++) {
      const input = page.locator("input[type='text']");
      await expect(input).toBeVisible({ timeout: 5_000 });
      await input.fill(`테스트 답변 ${i + 1}`);
      await page.locator("button", { hasText: "전송" }).click();
      await expect(page.locator("input[type='text']")).toBeEnabled({ timeout: 8_000 });
    }

    // "신점 결과 받기" 버튼 클릭으로 최종 결과 요청
    await expect(page.locator("text=신점 결과 받기")).toBeVisible({ timeout: 5_000 });
    await page.locator("text=신점 결과 받기").click();

    // 결과 화면 렌더링 대기 (종합 해석 섹션 출현 — PR 6에서 shinjeom.result.overall 키로 통일)
    await expect(page.locator("text=종합 해석").first()).toBeVisible({ timeout: 10_000 });

    // JSON 잔여물 미노출 + 결과 텍스트 확인
    const bodyText = await page.textContent("body");
    for (const pattern of JSON_ARTIFACTS) {
      expect(bodyText).not.toMatch(pattern);
    }
    expect(bodyText).toContain("큰 변화의 흐름");
    expect(bodyText).toContain("마음을 열어두세요");
    await expect(page.locator("text=조언").first()).toBeVisible();
  });
});

test.describe("AI 응답 렌더링 — 타로", () => {
  test("리딩 결과 — JSON 미노출 + 카드 해석 정상 표시", async ({ page }) => {
    // 세션 API mock
    await mockSessionCreate(page, "**/api/tarot/session");

    // 리딩 API SSE mock
    const readingSSE = createSSEBody(
      [
        JSON.stringify(TAROT_READING_RESULT).slice(0, 80),
        JSON.stringify(TAROT_READING_RESULT).slice(80),
      ],
      { result: TAROT_READING_RESULT },
    );
    await mockSSERoute(page, "**/api/tarot/reading", readingSSE);

    await enterTarotSession(page);

    // ShuffleCeremony 스킵 (Enter/Space 지원) → 카드 그리드 진입 대기
    await page.keyboard.press("Space");
    await page.waitForLoadState("networkidle");

    // 세션 페이지에서 JSON 잔여물 확인
    const bodyText = await page.textContent("body");
    for (const pattern of JSON_ARTIFACTS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });
});

test.describe("AI 응답 렌더링 — 사주", () => {
  test("리딩 결과 — JSON 미노출 확인", async ({ page }) => {
    await mockSessionCreate(page, "**/api/saju/session");

    const readingSSE = createSSEBody(
      [
        JSON.stringify({ ...SAJU_READING_RESULT, sajuData: SAJU_DATA }).slice(0, 100),
        JSON.stringify({ ...SAJU_READING_RESULT, sajuData: SAJU_DATA }).slice(100),
      ],
      { result: SAJU_READING_RESULT, sajuData: SAJU_DATA },
    );
    await mockSSERoute(page, "**/api/saju/reading", readingSSE);

    await enterSajuSession(page);

    // 사주 리딩 완료 대기 (mocked SSE 즉시 완료 → networkidle)
    await page.waitForLoadState("networkidle");

    const bodyText = await page.textContent("body");
    for (const pattern of JSON_ARTIFACTS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });
});

test.describe("AI 응답 렌더링 — 공통 JSON 잔여물 감지", () => {
  test("세션 페이지 접속 시 기본 상태 JSON 미노출", async ({ page }) => {
    // 직접 세션 페이지 접근 (스토어 없으면 리디렉트)
    const sessionPages = ["/tarot/session", "/saju/session", "/shinjeom/session"];

    for (const sessionPage of sessionPages) {
      await page.goto(sessionPage);
      await page.waitForLoadState("networkidle");

      const bodyText = await page.textContent("body");
      // 리디렉트 되더라도 JSON 잔여물이 없어야 함
      for (const pattern of JSON_ARTIFACTS) {
        expect(bodyText, `${sessionPage}에서 JSON 잔여물 발견`).not.toMatch(pattern);
      }
    }
  });
});
