"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { t as translate } from "@/i18n/translations";

const STORAGE_KEY = "arcana-locale-confirm-shown";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const lang = navigator.language?.toLowerCase().split("-")[0];
  return isLocale(lang) ? lang : null;
}

export function LocaleConfirmModal() {
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [suggested, setSuggested] = useState<Locale | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let alreadyShown = false;
    try {
      alreadyShown = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // localStorage 비활성 환경에서는 매번 1회 표시 (무해)
    }
    if (alreadyShown) return;

    const cookieLocale = readCookie(LOCALE_COOKIE);
    if (isLocale(cookieLocale) && cookieLocale !== "ko") return;

    const browser = detectBrowserLocale();
    if (!browser || browser === "ko") return;

    // CLAUDE.md SSR 규칙: useEffect 내 setState는 setTimeout 래핑
    const timer = setTimeout(() => setSuggested(browser), 0);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 무시
    }
    setSuggested(null);
  };

  const accept = async () => {
    if (!suggested) return;
    setLocale(suggested);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: suggested }),
      });
    } catch {
      // 쿠키는 클라이언트에서 이미 설정됨
    }
    dismiss();
  };

  if (!suggested) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="locale-confirm-title"
      data-testid="locale-confirm-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div className="bg-arcana-card rounded-2xl border border-arcana-border shadow-2xl max-w-sm w-full p-6">
        <h2 id="locale-confirm-title" className="text-lg font-serif font-bold mb-2">
          {translate("locale.modal.title", suggested)}
        </h2>
        <p className="text-sm text-arcana-muted mb-5">
          {translate("locale.modal.description", suggested)}
        </p>
        <div className="flex gap-2">
          <button
            data-testid="locale-confirm-keep"
            onClick={dismiss}
            className="flex-1 px-4 py-2 rounded-lg border border-arcana-border text-arcana-muted hover:text-arcana-text transition-colors text-sm"
          >
            {translate("locale.modal.keep-korean", "ko")}
          </button>
          <button
            data-testid="locale-confirm-accept"
            onClick={accept}
            className="flex-1 px-4 py-2 rounded-lg bg-arcana-purple text-white hover:opacity-90 transition-opacity text-sm font-bold"
          >
            {translate("locale.modal.confirm", suggested)}
          </button>
        </div>
      </div>
    </div>
  );
}
