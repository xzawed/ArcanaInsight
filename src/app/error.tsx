"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import type { Locale } from "@/i18n/config";

const COPY: Record<Locale, { title: string; description: string; cta: string }> = {
  ko: { title: "문제가 발생했어요", description: "잠시 후 다시 시도해주세요.", cta: "다시 시도" },
  en: { title: "Something went wrong", description: "Please try again in a moment.", cta: "Try again" },
  ja: { title: "問題が発生しました", description: "しばらくしてからもう一度お試しください。", cta: "再試行" },
};

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  const copy = COPY[locale];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="text-3xl font-serif mb-3">{copy.title}</h1>
      <p className="text-arcana-muted mb-6">{copy.description}</p>
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-arcana-purple text-white">
        {copy.cta}
      </button>
    </div>
  );
}
