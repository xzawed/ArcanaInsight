"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 페이지 전환 시 포커스를 초기화하고 스크롤을 최상단으로 이동 */
export function FocusReset() {
  const pathname = usePathname();

  useEffect(() => {
    // 현재 포커스된 요소에서 포커스 해제
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // 스크롤 최상단으로
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
