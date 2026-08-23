"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/useT";

/**
 * 서비스 종료(2026-08-31) 안내 배너.
 *
 * `(site)` 레이아웃의 `main` 최상단에 **문서 흐름으로** 렌더한다. Header는 `fixed h-14`이고
 * 각 라우트 그룹이 `pt-14`로 그 높이를 오프셋하므로, 배너를 Header 위나 안에 넣으면
 * `pt-14`와 몰입형 스테이지(`calc(100dvh-7rem)`) 계산이 함께 어긋나 이중 스크롤이 생긴다.
 * 흐름 안에 두면 기존 높이 계약을 전혀 건드리지 않는다.
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
      className="border-b border-arcana-gold/40 bg-arcana-gold/10"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
        <p className="text-xs sm:text-sm text-arcana-text leading-relaxed">
          {t("notice.banner.text")}
        </p>
        <Link
          href="/notice"
          className="shrink-0 self-start sm:self-auto text-xs sm:text-sm font-bold text-arcana-gold underline underline-offset-2 hover:text-arcana-purple transition-colors"
        >
          {t("notice.banner.cta")}
        </Link>
      </div>
    </aside>
  );
}
