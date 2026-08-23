"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/useT";

/**
 * 서비스 종료(2026-08-31) 안내 배너.
 *
 * `(site)` 레이아웃의 `main` 최상단에 **문서 흐름으로** 렌더한다. Header는 `fixed h-14`이고
 * 각 라우트 그룹이 `pt-14`로 그 높이를 오프셋하므로, 배너를 Header 위나 안에 넣으면
 * `pt-14`와 몰입형 스테이지(`calc(100dvh-7rem)`) 계산이 함께 어긋난다.
 *
 * ⚠️ **높이는 `h-14 md:h-11`로 고정한다(`overflow-hidden`).** `main`은 sticky-footer
 * 플렉스에서 이미 뷰포트를 채우므로, 여기에 더해지는 흐름 높이는 그대로 '유령 스크롤'이 된다.
 * 뷰포트 높이에 자신을 맞추는 `(site)` 페이지(`auth/login`)가 이 배너 높이를 빼도록 보정돼
 * 있으므로 (`calc(100dvh-10.5rem)` / `md:calc(100dvh-6.25rem)`), **높이를 바꾸면 그 계산도
 * 함께 바꿔야 한다.** 회귀는 `e2e/site-layout.spec.ts`의 유령 스크롤 가드가 잡는다.
 * 문구가 길어지면 잘리므로 짧게 유지한다(상세는 `/notice`).
 *
 * 공지 페이지(`/notice`)에서는 본문과 중복이므로 렌더하지 않는다. `usePathname()`은
 * SSR에서도 같은 값을 반환하므로 "클라이언트 전용 값으로 렌더 트리를 가르지 않는다"는
 * 렌더링 계약(docs/specs/platform/rendering-contract.md)에 저촉되지 않는다.
 */
export function ServiceClosureBanner() {
  const { t } = useT();
  const pathname = usePathname();

  if (pathname === "/notice") return null;

  return (
    <aside
      data-testid="service-closure-banner"
      aria-label={t("notice.banner.label")}
      className="h-14 md:h-11 overflow-hidden border-b border-arcana-gold/40 bg-arcana-gold/10"
    >
      <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-center gap-2 sm:gap-3">
        <p className="text-[11px] sm:text-xs md:text-sm text-arcana-text leading-tight">
          {t("notice.banner.text")}
        </p>
        <Link
          href="/notice"
          className="shrink-0 text-[11px] sm:text-xs md:text-sm font-bold text-arcana-gold underline underline-offset-2 hover:text-arcana-purple transition-colors"
        >
          {t("notice.banner.cta")}
        </Link>
      </div>
    </aside>
  );
}
