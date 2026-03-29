"use client";

import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardFace } from "./CardFace";
import { CardBack } from "./CardBack";

interface CardItemProps {
  card: TarotCard;
  isFlipped: boolean;
  isSelected: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = { sm: "w-16 h-24", md: "w-24 h-36", lg: "w-32 h-48" };

export function CardItem({ card, isFlipped, isSelected, isReversed = false, onClick, size = "md", className = "" }: CardItemProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={!isFlipped ? {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 },
      } : undefined}
      className={`relative cursor-pointer ${sizeClasses[size]} ${className}`}
      style={{ perspective: "1000px" }}
    >
      {!isFlipped && (
        <motion.div
          className="absolute -inset-1 rounded-xl opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          style={{
            background: "radial-gradient(ellipse, rgba(212,175,55,0.15), transparent 70%)",
            boxShadow: "0 0 20px rgba(212,175,55,0.2)",
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
          className={`absolute inset-0 ${isSelected ? "ring-2 ring-arcana-gold shadow-lg shadow-arcana-gold/20" : ""}`}
          style={{ backfaceVisibility: "hidden", borderRadius: "0.5rem" }}
        >
          <CardBack size={size} className="w-full h-full" />
        </div>

        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "0.5rem" }}
        >
          <CardFace card={card} isReversed={isReversed} size={size} className="w-full h-full" />
        </div>
      </motion.div>

      {isFlipped && (
        <motion.div
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.4), transparent 70%)" }}
        />
      )}
    </motion.div>
  );
}
