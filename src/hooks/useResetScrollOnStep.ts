"use client";

import { useEffect } from "react";

/**
 * 스텝(페이지 단계) 변경 시 스크롤을 최상단으로 초기화한다.
 * 3중 보정: 즉시 + rAF + rAF(이중) 방식으로 다양한 렌더링 타이밍에 대응.
 */
export function useResetScrollOnStep(step: string) {
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto']").forEach((el) => { (el as HTMLElement).scrollTop = 0; });
    };
    resetScroll();
    requestAnimationFrame(() => { resetScroll(); requestAnimationFrame(resetScroll); });
  }, [step]);
}
