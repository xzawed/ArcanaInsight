"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import type { CardSkin } from "@/data/skins";
import { getSkinName, getSkinDescription } from "@/data/skins";
import { getCardThumbnailUrl } from "@/lib/storage";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";

interface SkinSelectorProps {
  readonly skin: CardSkin;
  readonly isSelected: boolean;
  readonly onSelect: (skinId: string) => void;
}

// 카드 팬 배치: 3장 회전 오프셋
const FAN_CONFIGS = [
  { rotate: -12, translateX: -22, translateY: 8, zIndex: 1 },
  { rotate: 0, translateX: 0, translateY: 0, zIndex: 3 },
  { rotate: 12, translateX: 22, translateY: 8, zIndex: 2 },
];

export function SkinSelector({ skin, isSelected, onSelect }: SkinSelectorProps) {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const skinName = getSkinName(skin, locale);
  const skinDesc = getSkinDescription(skin, locale);
  const previewAlt = t("common.skin.preview-alt").replace("{name}", skinName);
  // 썸네일 이미지 에러 상태 (카드 ID별)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const sampleCards = skin.sampleCards.slice(0, 3);

  const handleImgError = (cardId: string) => {
    setImgErrors((prev) => ({ ...prev, [cardId]: true }));
  };

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(skin.id)}
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
      {/* 선택 체크마크 */}
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
        {sampleCards.map((cardId, index) => {
          const config = FAN_CONFIGS[index];
          const thumbUrl = getCardThumbnailUrl(skin.id, cardId, 64, 100);
          const hasError = imgErrors[cardId];

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
                // 에러 시 팔레트 컬러 플레이스홀더
                <div
                  className="w-full h-full rounded-lg border border-white/10 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${skin.palette.secondary}, ${skin.palette.background})` }}
                >
                  <div
                    className="w-6 h-6 rounded-full opacity-60"
                    style={{ background: skin.palette.primary }}
                  />
                </div>
              ) : (
                <Image
                  src={thumbUrl}
                  alt={previewAlt}
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

      {/* 스킨 이름 & 설명 */}
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-1">
          {/* 팔레트 컬러 도트 */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
            style={{ background: skin.palette.primary }}
          />
          <h3 className="font-serif font-bold text-sm text-arcana-text truncate">{skinName}</h3>
        </div>
        <p className="text-arcana-muted text-xs leading-relaxed line-clamp-2">{skinDesc}</p>
      </div>
    </motion.button>
  );
}
