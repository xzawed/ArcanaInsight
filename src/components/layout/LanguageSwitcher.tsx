"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { LOCALES, type Locale } from "@/i18n/config";
import { showToast } from "@/components/common/Toast";
import { t as translate } from "@/i18n/translations";

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

const LOCALE_FLAGS: Record<Locale, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
  ja: "🇯🇵",
};

interface Props {
  variant: "desktop" | "mobile";
  onSelect?: (locale: Locale) => void;
}

export function LanguageSwitcher({ variant, onSelect }: Readonly<Props>) {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (next: Locale) => {
    // 동일 locale 클릭 시 no-op — 불필요한 router.refresh + 토스트 발사 방지
    if (next === locale) {
      setOpen(false);
      return;
    }
    setLocale(next);
    setOpen(false);
    showToast(translate("common.language.changed", next));
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // 쿠키는 클라이언트에서 이미 설정됨
    }
    onSelect?.(next);
    // 서버 컴포넌트(layout, mypage 등)가 새 locale 쿠키로 재요청되도록 router.refresh().
    // window.location.reload()와 달리 SPA 입력 상태(폼·스크롤·진행 중 세션)를 보존.
    router.refresh();
  };

  const testidPrefix = variant === "desktop" ? "lang-option" : "mobile-lang-option";
  const buttonTestid = variant === "desktop" ? "lang-switcher" : "mobile-lang-switcher";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        data-testid={buttonTestid}
        className="text-arcana-muted hover:text-arcana-text transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-base"
        aria-label={t("common.language")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 bg-arcana-card/90 backdrop-blur-md rounded-xl border border-arcana-border shadow-xl shadow-black/30 overflow-hidden z-50"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              data-testid={`${testidPrefix}-${l}`}
              role="option"
              aria-selected={locale === l}
              onClick={() => handleSelect(l)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                locale === l
                  ? "bg-arcana-purple/15 text-arcana-purple"
                  : "text-arcana-text hover:bg-arcana-purple/10"
              }`}
            >
              <span aria-hidden="true">{LOCALE_FLAGS[l]}</span>
              <span className="font-serif">{LOCALE_LABELS[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
