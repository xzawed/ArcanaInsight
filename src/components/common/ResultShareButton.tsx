"use client";

import { useState } from "react";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";

type Service = "tarot" | "saju" | "shinjeom";

const SITE = "ArcanaInsight";

const SERVICE_PATH: Record<Service, string> = {
  tarot: "/tarot/result/",
  saju: "/saju/result/",
  shinjeom: "/shinjeom/result/",
};

const SERVICE_EMOJI: Record<Service, string> = {
  tarot: "🔮",
  saju: "☯",
  shinjeom: "🔮",
};

/** locale별 서비스 결과 share title — 세션 페이지 사전 키 재사용. */
function getShareTitle(service: Service, locale: Locale): string {
  const key = `${service}.session.share.title` as
    | "tarot.session.share.title"
    | "saju.session.share.title"
    | "shinjeom.session.share.title";
  if (service === "shinjeom") return `${translate("shinjeom.result.title", locale)} - ${SITE}`;
  return `${translate(key, locale)} - ${SITE}`;
}

function getShareUrl(service: Service, shareToken: string): string {
  return `${window.location.origin}${SERVICE_PATH[service]}${shareToken}`;
}

interface ResultShareButtonProps {
  service: Service;
  shareToken: string;
  spreadName?: string;
}

export function ResultShareButton({ service, shareToken, spreadName }: ResultShareButtonProps) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = getShareUrl(service, shareToken);
    const title = getShareTitle(service, locale);
    const labelPrefix = service === "tarot" && spreadName ? `${spreadName} ` : "";
    const text = `${SERVICE_EMOJI[service]} ${labelPrefix}${title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        /* 사용자가 공유 취소 */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* 클립보드 접근 실패 */
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-8 py-3 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
    >
      {copied ? t("share.copied-button") : t("share.result-button-default")}
    </button>
  );
}
