"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** 페이지 전환 시 포커스 해제 + 모든 스크롤 최상단 초기화 (3중 보정) */
export function FocusReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const resetScroll = () => {
      // 포커스 해제
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // 메인 윈도우 스크롤 초기화 (instant로 즉각 이동)
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

      // 내부 overflow 스크롤 컨테이너도 초기화
      document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto'], [class*='overflow-y-scroll']")
        .forEach((el) => { el.scrollTop = 0; });
    };

    // 즉시 1회
    resetScroll();
    // 다음 프레임: 렌더 후 레이아웃 시프트 보정
    requestAnimationFrame(() => {
      resetScroll();
      // 한 프레임 더: AnimatePresence 애니메이션 완료 후 최종 보정
      requestAnimationFrame(resetScroll);
    });
  }, [pathname, searchParams]);

  return null;
}
