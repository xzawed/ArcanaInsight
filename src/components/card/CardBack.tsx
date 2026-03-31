"use client";

import { useState } from "react";
import Image from "next/image";
import { getCardBackUrl } from "@/lib/supabase/storage";

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
  className?: string;
  skinId?: string;
}

const sizeDimensions = {
  sm: { w: 40, h: 60 },
  md: { w: 96, h: 144 },
  lg: { w: 128, h: 192 },
};

export function CardBack({ size = "md", width, height, className = "", skinId }: CardBackProps) {
  const [imageError, setImageError] = useState(false);
  const preset = sizeDimensions[size];
  const w = width ?? preset.w;
  const h = height ?? preset.h;
  const cx = w / 2;
  const cy = h / 2;
  const r1 = Math.min(w, h) * 0.3;
  const r2 = r1 * 0.65;
  const r3 = r1 * 0.35;
  const starSize = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const cornerStarSize = size === "sm" ? 4 : size === "md" ? 5 : 6;
  const inset = size === "sm" ? 4 : size === "md" ? 6 : 8;

  if (skinId && !imageError) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ width: w, height: h }}>
        <Image
          src={getCardBackUrl(skinId)}
          alt="카드 뒷면"
          fill
          sizes={`${Math.max(w, h)}px`}
          unoptimized
          onError={() => setImageError(true)}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
        <defs>
          <linearGradient id="cardBackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0a3e" />
            <stop offset="50%" stopColor="#0f0520" />
            <stop offset="100%" stopColor="#1a0a3e" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="url(#cardBackGrad)" />
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="6" fill="none" stroke="#d4af37" strokeWidth="1.5" />
        <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} rx="4" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="0.75" />
        <circle cx={cx} cy={cy} r={r3} fill="rgba(139,92,246,0.15)" stroke="rgba(212,175,55,0.4)" strokeWidth="0.5" />
        <line x1={cx} y1={cy - r1} x2={cx} y2={cy + r1} stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
        <line x1={cx - r1} y1={cy} x2={cx + r1} y2={cy} stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
        <line x1={cx - r1 * 0.707} y1={cy - r1 * 0.707} x2={cx + r1 * 0.707} y2={cy + r1 * 0.707} stroke="rgba(139,92,246,0.25)" strokeWidth="0.5" />
        <line x1={cx + r1 * 0.707} y1={cy - r1 * 0.707} x2={cx - r1 * 0.707} y2={cy + r1 * 0.707} stroke="rgba(139,92,246,0.25)" strokeWidth="0.5" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize={starSize}>✦</text>
        <text x={inset + 4} y={inset + 8} fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={w - inset - 4} y={inset + 8} textAnchor="end" fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={inset + 4} y={h - inset - 4} fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
        <text x={w - inset - 4} y={h - inset - 4} textAnchor="end" fill="rgba(212,175,55,0.5)" fontSize={cornerStarSize}>✧</text>
      </svg>
    </div>
  );
}
