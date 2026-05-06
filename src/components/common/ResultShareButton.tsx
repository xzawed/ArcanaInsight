"use client";

import { useState } from "react";

type Service = "tarot" | "saju" | "shinjeom";

const SERVICE_CONFIG: Record<Service, { path: string; text: string; title: string }> = {
  tarot: {
    path: "/tarot/result",
    text: "🔮 {label} 타로 리딩 결과를 확인해보세요!\n\n- ArcanaInsight",
    title: "타로 리딩 결과 - ArcanaInsight",
  },
  saju: {
    path: "/saju/result",
    text: "☯ 사주 분석 결과를 확인해보세요!\n\n- ArcanaInsight",
    title: "사주 분석 결과 - ArcanaInsight",
  },
  shinjeom: {
    path: "/shinjeom/result",
    text: "🔮 신점 결과를 확인해보세요!\n\n- ArcanaInsight",
    title: "신점 결과 - ArcanaInsight",
  },
};

interface ResultShareButtonProps {
  service: Service;
  shareToken: string;
  spreadName?: string;
}

export function ResultShareButton({ service, shareToken, spreadName }: ResultShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const config = SERVICE_CONFIG[service];

  const handleShare = async () => {
    const url = `${window.location.origin}${config.path}/${shareToken}`;
    const text = service === "tarot" && spreadName
      ? config.text.replace("{label}", spreadName)
      : config.text;

    if (navigator.share) {
      try {
        await navigator.share({ title: config.title, text, url });
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
      {copied ? "링크 복사됨!" : "결과 공유하기"}
    </button>
  );
}
