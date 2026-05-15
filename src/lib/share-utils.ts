"use client";

import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";

export async function shareWithUrl(title: string, text: string, url: string, locale: Locale): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert(translate("common.share.link-copied", locale));
    } catch (e) { console.warn("clipboard write failed:", e); }
  }
}

export async function shareWithText(title: string, text: string, locale: Locale): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch { /* 사용자가 공유를 취소함 */ } // NOSONAR
  } else {
    try {
      await navigator.clipboard.writeText(text);
      alert(translate("common.share.text-copied", locale));
    } catch (e) { console.warn("clipboard write failed:", e); }
  }
}
