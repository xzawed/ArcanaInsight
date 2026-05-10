"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import type { CardStyle, CardStyleId } from "@/data/cardStyles";
import { getStyleName, getStyleDescription } from "@/data/cardStyles";
import { getCardStyleImageUrl } from "@/lib/storage/card-style";
import { useLocaleStore } from "@/hooks/useLocaleStore";

interface StyleSelectorProps {
  readonly style: CardStyle;
  readonly isSelected: boolean;
  readonly onSelect: (styleId: CardStyleId) => void;
}

const STYLE_COLORS: Record<string, string> = {
  "dark-fantasy": "linear-gradient(135deg, #1a0a2e, #6b21a8)",
  "art-nouveau": "linear-gradient(135deg, #7c5c1e, #d4af37)",
  "anime-mystical": "linear-gradient(135deg, #1e3a8a, #60a5fa)",
  "modern-digital": "linear-gradient(135deg, #0f2944, #00b4d8)",
};

const FAN_CONFIGS = [
  { rotate: -12, translateX: -22, translateY: 8, zIndex: 1 },
  { rotate: 0, translateX: 0, translateY: 0, zIndex: 3 },
  { rotate: 12, translateX: 22, translateY: 8, zIndex: 2 },
];

export function StyleSelector({ style, isSelected, onSelect }: StyleSelectorProps) {
  const locale = useLocaleStore((s) => s.locale);
  const styleName = getStyleName(style, locale);
  const styleDesc = getStyleDescription(style, locale);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const previewCards = style.previewCards.slice(0, 3);
  const gradientColor = STYLE_COLORS[style.id] ?? "linear-gradient(135deg, #1a0a2e, #6b21a8)";

  const handleImgError = (cardId: string) => {
    setImgErrors((prev) => ({ ...prev, [cardId]: true }));
  };

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(style.id)}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative w-full rounded-2xl p-4 text-left transition-colors focus:outline-none ${
        isSelected
          ? "bg-arcana-card border-2 border-arcana-gold shadow-lg shadow-arcana-gold/20"
          : "bg-arcana-card/70 border border-arcana-border hover:border-arcana-purple/50"
      }`}
      aria-pressed={isSelected}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-arcana-gold flex items-center justify-center z-10"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="#08081a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}

      {/* 카드 팬 미리보기 */}
      <div className="relative h-28 flex items-end justify-center mb-3">
        {previewCards.map((cardId, index) => {
          const config = FAN_CONFIGS[index];
          const hasError = imgErrors[cardId];
          const imgUrl = getCardStyleImageUrl(style.id, cardId);

          return (
            <div
              key={cardId}
              className="absolute w-16 h-24 rounded-lg overflow-hidden shadow-md"
              style={{
                transform: `rotate(${config.rotate}deg) translateX(${config.translateX}px) translateY(${config.translateY}px)`,
                zIndex: config.zIndex,
              }}
            >
              {hasError ? (
                <div
                  className="w-full h-full rounded-lg border border-white/10"
                  style={{ background: gradientColor }}
                />
              ) : (
                <Image
                  src={imgUrl}
                  alt={styleName}
                  width={64}
                  height={100}
                  unoptimized
                  className="w-full h-full object-cover"
                  onError={() => handleImgError(cardId)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 스타일 이름 & 설명 */}
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
            style={{ background: gradientColor }}
          />
          <h3 className="font-serif font-bold text-sm text-arcana-text truncate">{styleName}</h3>
        </div>
        <p className="text-arcana-muted text-xs leading-relaxed line-clamp-2">{styleDesc}</p>
      </div>
    </motion.button>
  );
}
