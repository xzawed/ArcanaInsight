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
  /** 스프레드 내 위치 인덱스 — 지정 시 애니메이션 글로우 이펙트 활성화 (위치별 페이즈 오프셋) */
  readonly positionIndex?: number;
}

const sizeClasses = { sm: "w-10 h-[60px]", md: "w-24 h-36", lg: "w-32 h-48" };

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", width, height, className = "", skinId, styleId, glowColor, showLabel = true, positionIndex }: CardItemProps) {
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
  const pIdx = positionIndex ?? 0;
  // positionIndex가 있을 때만 스프레드 선택 글로우 표시 (CardDeck 선택 카드는 제외)
  const showSelectionGlow = isSelected && positionIndex !== undefined;

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={isFlipped ? undefined : {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
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

      {/* 스프레드 선택 카드 글로우: 펄스 링 */}
      {showSelectionGlow && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 0 1.5px rgba(${rgb},0.65), 0 0 8px rgba(${rgb},0.25), 0 0 18px rgba(${rgb},0.1)`,
              `0 0 0 2.5px rgba(${rgb},1), 0 0 16px rgba(${rgb},0.55), 0 0 32px rgba(${rgb},0.22)`,
              `0 0 0 1.5px rgba(${rgb},0.65), 0 0 8px rgba(${rgb},0.25), 0 0 18px rgba(${rgb},0.1)`,
            ],
          }}
          transition={{
            duration: 1.8 + pIdx * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: pIdx * 0.55,
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
