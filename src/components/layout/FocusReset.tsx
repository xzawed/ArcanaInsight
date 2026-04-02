"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** 페이지 전환 시 포커스 해제 + 모든 스크롤 최상단 초기화 */
export function FocusReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 포커스 해제
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 메인 윈도우 스크롤 초기화
    window.scrollTo(0, 0);

    // 내부 overflow 스크롤 컨테이너도 초기화
    const scrollables = document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto'], [class*='overflow-y-scroll']");
    scrollables.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname, searchParams]);

  return null;
}
