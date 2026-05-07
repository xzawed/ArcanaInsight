"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import type { Locale } from "./config";

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const setLocale = useLocaleStore((s) => s.setLocale);

  useEffect(() => {
    // 이미 동일 locale이면 store 갱신 건너뜀 — 불필요한 useT 컴포넌트 재렌더 방지.
    // 초방문(쿠키 없음 → 'ko')처럼 store 초기값과 SSR initial이 일치하면 깜빡임 0.
    if (useLocaleStore.getState().locale === initial) return;
    // SSR 결정 locale을 client store에 동기화 (CLAUDE.md SSR 규칙: useEffect 내 setState는 setTimeout 래핑).
    const t = setTimeout(() => setLocale(initial), 0);
    return () => clearTimeout(t);
  }, [initial, setLocale]);

  return <>{children}</>;
}
