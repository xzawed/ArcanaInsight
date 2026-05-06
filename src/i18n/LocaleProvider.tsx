"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import type { Locale } from "./config";

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const setLocale = useLocaleStore((s) => s.setLocale);

  useEffect(() => {
    // SSR 결정 locale을 client store에 동기화 (CLAUDE.md SSR 규칙: useEffect 내 setState는 setTimeout 래핑)
    const t = setTimeout(() => setLocale(initial), 0);
    return () => clearTimeout(t);
  }, [initial, setLocale]);

  return <>{children}</>;
}
