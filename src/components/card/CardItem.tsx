"use client";

import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";

interface CardItemProps {
  card: TarotCard; isFlipped: boolean; isSelected: boolean;
  isReversed?: boolean; onClick?: () => void;
  size?: "sm" | "md" | "lg"; className?: string;
}

const sizeClasses = { sm: "w-16 h-24", md: "w-24 h-36", lg: "w-32 h-48" };

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", className = "" }: CardItemProps) {
  return (
    <motion.div onClick={onClick} whileHover={!isFlipped ? { y: -8, scale: 1.02 } : undefined}
      className={`relative cursor-pointer ${sizeClasses[size]} ${className}`}
      style={{ perspective: "1000px" }}>
      <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }} className="w-full h-full relative">
        {/* Card Back */}
        <div className={`absolute inset-0 rounded-lg border-2 ${
          isSelected ? "border-arcana-gold shadow-lg shadow-arcana-gold/20" : "border-arcana-border hover:border-arcana-purple"
        } bg-gradient-to-br from-arcana-purple/30 to-arcana-indigo/30 flex items-center justify-center`}
          style={{ backfaceVisibility: "hidden" }}>
          <div className="text-arcana-purple/50 text-2xl">✦</div>
        </div>
        {/* Card Front */}
        <div className={`absolute inset-0 rounded-lg border-2 border-arcana-gold bg-arcana-card flex flex-col items-center justify-center p-2 ${isReversed ? "rotate-180" : ""}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <p className="text-arcana-gold text-xs font-display font-bold text-center">{card.nameKo}</p>
          <p className="text-arcana-muted text-[10px] text-center mt-1">{card.name}</p>
          {isReversed && <span className="absolute top-1 right-1 text-[8px] text-red-400">역</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}
