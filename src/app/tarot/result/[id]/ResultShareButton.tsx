"use client";

import { useState } from "react";

interface ResultShareButtonProps {
  shareToken: string;
  spreadName: string;
}

export function ResultShareButton({ shareToken, spreadName }: ResultShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/tarot/result/${shareToken}`;
    const text = `🔮 ${spreadName} 타로 리딩 결과를 확인해보세요!\n\n- ArcanaInsight`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "타로 리딩 결과 - ArcanaInsight", text, url });
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
