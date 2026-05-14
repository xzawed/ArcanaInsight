"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardFace } from "./CardFace";
import { CardBack } from "./CardBack";
import { hexToRgbBase } from "@/lib/color-utils";
import type { CardStyleId } from "@/data/cardStyles";

interface CardItemProps {
  readonly card: TarotCard;
  readonly isFlipped: boolean;
  readonly isSelected: boolean;
  readonly isReversed?: boolean;
  readonly onClick?: () => void;
  readonly size?: "sm" | "md" | "lg";
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly skinId?: string;
  readonly styleId?: CardStyleId;
  readonly glowColor?: string;
  /** false이면 카드 하단 텍스트를 숨긴다 (CardFace에 전달). 기본값: true */
  readonly showLabel?: boolean;
}

const sizeClasses = { sm: "w-10 h-[60px]", md: "w-24 h-36", lg: "w-32 h-48" };

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId, styleId, glowColor, showLabel = true }: CardItemProps) {
  const useCustomSize = width !== undefined && height !== undefined;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const rgb = glowColor ? hexToRgbBase(glowColor) : "212, 175, 55";

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${useCustomSize ? "" : sizeClasses[size]} ${className}`}
      style={{
        perspective: "1000px",
        rotateX: isFlipped ? undefined : rotateX,
        rotateY: isFlipped ? undefined : rotateY,
        ...(useCustomSize ? { width, height } : {}),
      }}
    >
      {!isFlipped && (
        <motion.div
          className="absolute -inset-1 rounded-xl opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          style={{
            background: `radial-gradient(ellipse, rgba(${rgb},0.15), transparent 70%)`,
            boxShadow: `0 0 20px rgba(${rgb},0.2)`,
          }}
        />
      )}

      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative"
      >
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            borderRadius: "0.5rem",
            ...(isSelected ? {
              boxShadow: `0 0 0 2px rgba(${rgb},0.9), 0 4px 16px rgba(${rgb},0.3)`,
            } : {}),
          }}
        >
          <CardBack size={size} width={width} height={height} className="w-full h-full" skinId={skinId} styleId={styleId} />
        </div>

        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "0.5rem" }}
        >
          <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} className="w-full h-full" skinId={skinId} styleId={styleId} showLabel={showLabel} />
        </div>
      </motion.div>

      {isFlipped && (
        <motion.div
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: `radial-gradient(ellipse, rgba(${rgb},0.5), transparent 70%)` }}
        />
      )}
    </motion.div>
  );
}
