"use client";

import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardFace } from "./CardFace";
import { CardBack } from "./CardBack";

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
  readonly glowColor?: string;
}

const sizeClasses = { sm: "w-10 h-[60px]", md: "w-24 h-36", lg: "w-32 h-48" };

function hexToRgbBase(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "212, 175, 55";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
}

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId, glowColor }: CardItemProps) {
  const useCustomSize = width !== undefined && height !== undefined;
  const rgb = glowColor ? hexToRgbBase(glowColor) : "212, 175, 55";

  return (
    <motion.div
      onClick={onClick}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${useCustomSize ? "" : sizeClasses[size]} ${className}`}
      style={{ perspective: "1000px", ...(useCustomSize ? { width, height } : {}) }}
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
          <CardBack size={size} width={width} height={height} className="w-full h-full" skinId={skinId} />
        </div>

        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "0.5rem" }}
        >
          <CardFace card={card} isReversed={isReversed} size={size} width={width} height={height} className="w-full h-full" skinId={skinId} />
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
