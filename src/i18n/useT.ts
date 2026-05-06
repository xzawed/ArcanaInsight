"use client";

import { useCallback } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { t as translate } from "./translations";

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useCallback((key: string) => translate(key, locale), [locale]);
  return { t, locale };
}
