import { test, expect } from "@playwright/test";

/**
 * 모바일 (site) 레이아웃 회귀 가드 — Footer 빈영역/스크롤 콘텐츠 가림 수정.
 *
 * 버그(수정 전): (site) 페이지 래퍼의 min-h-screen(=100vh) + main 패딩(pt-14 pb-14 = 112px)
 *   합산으로 콘텐츠 길이와 무관하게 document가 항상 가시 뷰포트를 초과 → '빈 스크롤'(false bottom).
 *   또한 흐름상 마지막 요소인 Footer 하단 행(© / Powered by)이 fixed MobileNav 뒤로 가려졌다.
 * 수정: body min-h-dvh(sticky-footer 컨테이너) + (site) 콘텐츠 래퍼의 중복 min-h-screen 제거 +
 *   Footer에 모바일 네비 회피 클리어런스(pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0).
 *
 * 측정 전략: 스크롤/지연 로딩 레이스를 피하기 위해 '클리어런스 불변식'으로 단언한다 —
 *   Footer 하단 패딩(= footer.bottom - 마지막행.bottom)이 고정 네비 높이 이상이면, 문서 끝까지
 *   스크롤해도 마지막 행이 네비 위로 노출됨이 보장된다.
 */
const MOBILE = { width: 390, height: 844 };
const SITE_FOOTER_PAGES = ["/", "/terms", "/privacy"];

test.describe("(site) 레이아웃 — Footer 가림 / 유령 스크롤 (모바일)", () => {
  test.use({ viewport: MOBILE });

  test("Footer 하단 행이 모바일 네비 높이 이상 클리어런스를 확보한다", async ({ page }) => {
    for (const url of SITE_FOOTER_PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("footer")).toHaveCount(1);

      const m = await page.evaluate(() => {
        const footer = document.querySelector("footer");
        const lastRow = footer?.lastElementChild as HTMLElement | null;
        const fixedNav = [...document.querySelectorAll("nav")].find(
          (n) => getComputedStyle(n).position === "fixed" && getComputedStyle(n).display !== "none",
        );
        if (!footer || !lastRow) return { ok: false as const };
        const footerBottom = footer.getBoundingClientRect().bottom;
        const lastRowBottom = lastRow.getBoundingClientRect().bottom;
        return {
          ok: true as const,
          navPresent: !!fixedNav,
          navHeight: fixedNav ? Math.round(fixedNav.getBoundingClientRect().height) : 0,
          footerBottomGap: Math.round(footerBottom - lastRowBottom),
        };
      });

      expect(m.ok, `${url}: footer/마지막 행 존재`).toBe(true);
      if (!m.ok) continue;
      expect(m.navPresent, `${url}: 모바일 고정 네비 렌더`).toBe(true);
      // Footer 하단 클리어런스가 네비 높이 이상이어야 마지막 행이 네비 위로 노출된다.
      expect(
        m.footerBottomGap,
        `${url}: Footer 하단 패딩(${m.footerBottomGap}px) ≥ 네비 높이(${m.navHeight}px)`,
      ).toBeGreaterThanOrEqual(m.navHeight);
    }
  });

  test("짧은 (site) 페이지는 Footer 외 유령 스크롤이 없다", async ({ page }) => {
    // 로그인은 중앙정렬 단일 화면(콘텐츠 < 뷰포트)이라 유령 스크롤을 격리 측정하기 좋다.
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("footer")).toHaveCount(1);

    const m = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      return {
        overflow: document.documentElement.scrollHeight - window.innerHeight,
        footerHeight: footer ? Math.round(footer.getBoundingClientRect().height) : 0,
      };
    });
    // document 초과분(스크롤 가능 영역)은 Footer 높이뿐이어야 한다.
    // 콘텐츠 래퍼의 min-h-screen이 남아 있으면 여기에 ~112px(main 패딩) 유령 스크롤이 더해진다.
    const phantom = m.overflow - m.footerHeight;
    expect(phantom, `유령 스크롤 ${phantom}px (Footer 외 빈 스크롤)`).toBeLessThanOrEqual(40);
  });
});

test.describe("(site) 레이아웃 — 데스크탑 회귀 가드", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("데스크탑은 고정 네비가 없고 Footer 하단 여백(모바일 회피 패딩)이 제거된다", async ({ page }) => {
    await page.goto("/terms", { waitUntil: "domcontentloaded" });
    const m = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      const fixedNavVisible = [...document.querySelectorAll("nav")].some(
        (n) => getComputedStyle(n).position === "fixed" && getComputedStyle(n).display !== "none",
      );
      return {
        footerPadBottom: footer ? parseFloat(getComputedStyle(footer).paddingBottom) : null,
        fixedNavVisible,
      };
    });
    expect(m.fixedNavVisible, "데스크탑(md+)에서 모바일 네비는 숨김").toBe(false);
    expect(m.footerPadBottom ?? 0, "데스크탑 Footer는 md:pb-0").toBeLessThanOrEqual(1);
  });
});
