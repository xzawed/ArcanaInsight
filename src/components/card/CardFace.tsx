"use client";

import { useState } from "react";
import Image from "next/image";
import { TarotCard } from "@/types/card";
import { majorSymbols, suitSymbols } from "@/data/cards/symbols";
import { getCardImageUrl } from "@/lib/storage";

interface CardFaceProps {
  readonly card: TarotCard;
  readonly isReversed: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
}

const sizeDimensions = {
  sm: { w: 40, h: 60 },
  md: { w: 96, h: 144 },
  lg: { w: 128, h: 192 },
};

export function CardFace({ card, isReversed, size = "md", width, height, className = "", skinId }: CardFaceProps) {
  const [imageError, setImageError] = useState(false);
  const preset = sizeDimensions[size];
  const w = width ?? preset.w;
  const h = height ?? preset.h;
  const symbol = card.type === "major"
    ? majorSymbols[card.id]
    : card.suit ? suitSymbols[card.suit] : null;

  const fontSizeMap = { sm: 6, md: 8, lg: 10 };
  const numberSizeMap = { sm: 7, md: 10, lg: 12 };
  const fontSize = fontSizeMap[size];
  const numberSize = numberSizeMap[size];

  const cx = w / 2;
  const cy = h * 0.42;
  const symbolRadius = Math.min(w, h) * 0.22;

  const romanNumerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  const numeral = card.type === "major" ? romanNumerals[card.number] : `${card.number}`;

  if (skinId && !imageError) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${isReversed ? "rotate-180" : ""} ${className}`}
        style={{ width: w, height: h }}
      >
        <Image
          src={getCardImageUrl(skinId, card.id)}
          alt={card.nameKo}
          fill
          sizes={`${Math.max(w, h)}px`}
          unoptimized
          onError={() => setImageError(true)}
          className="object-cover"
        />
        {isReversed && (
          <span className="absolute top-1 right-1 text-[8px] text-red-400 bg-red-900/40 px-1 rounded rotate-180">
            역
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${isReversed ? "rotate-180" : ""} ${className}`}
      style={{ width: w, height: h }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0">
        <defs>
          <linearGradient id={`cardFaceGrad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="50%" stopColor="#1a0a3e" />
            <stop offset="100%" stopColor="#0a0a1a" />
          </linearGradient>
          <linearGradient id={`borderGrad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>

        <rect width={w} height={h} fill={`url(#cardFaceGrad-${card.id})`} />
        <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="6" fill="none"
          stroke={`url(#borderGrad-${card.id})`} strokeWidth="1.5" />

        <text x={cx} y={h * 0.1} textAnchor="middle" dominantBaseline="central"
          fill="#d4af37" fontSize={numberSize} fontFamily="serif" fontWeight="bold">
          {numeral}
        </text>

        <circle cx={cx} cy={cy} r={symbolRadius} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.75" />

        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + (symbolRadius + 2) * Math.cos(rad);
          const y1 = cy + (symbolRadius + 2) * Math.sin(rad);
          const x2 = cx + (symbolRadius + 6) * Math.cos(rad);
          const y2 = cy + (symbolRadius + 6) * Math.sin(rad);
          return (
            <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
          );
        })}

        {symbol && (
          <g transform={`translate(${cx - 24}, ${cy - 24}) scale(${symbolRadius / 24})`}>
            {symbol.paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#d4af37" strokeWidth={symbol.strokeWidth ?? 1.5}
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
        )}

        <text x={cx} y={h * 0.82} textAnchor="middle" dominantBaseline="central"
          fill="#e2e8f0" fontSize={fontSize} fontFamily="serif" letterSpacing="1">
          {card.name.toUpperCase()}
        </text>

        <text x={cx} y={h * 0.92} textAnchor="middle" dominantBaseline="central"
          fill="#94a3b8" fontSize={fontSize - 2}>
          {card.nameKo}
        </text>
      </svg>

      {isReversed && (
        <span className="absolute top-1 right-1 text-[8px] text-red-400 bg-red-900/40 px-1 rounded rotate-180">
          역
        </span>
      )}
    </div>
  );
}
