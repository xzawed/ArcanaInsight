"use client";

import { useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardSwiperProps { cards: TarotCard[]; selectedIndices: number[]; onCardSelect: (index: number) => void; }

export function CardSwiper({ cards, selectedIndices, onCardSelect }: CardSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 50 && currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else if (info.offset.x < -50 && currentIndex < cards.length - 1) setCurrentIndex(currentIndex + 1);
  };
  return (
    <div className="relative w-full overflow-hidden py-8">
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd}
        animate={{ x: -currentIndex * 120 + 60 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }} className="flex gap-4 pl-4">
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          const isCurrent = index === currentIndex;
          return (
            <motion.div key={card.id} animate={{ scale: isCurrent ? 1.1 : 0.9, opacity: isSelected ? 0.3 : 1 }}
              className="flex-shrink-0">
              <CardItem card={card} isFlipped={false} isSelected={isSelected}
                onClick={() => !isSelected && onCardSelect(index)} size="lg" />
            </motion.div>
          );
        })}
      </motion.div>
      <div className="flex justify-center gap-1 mt-4">
        {cards.slice(0, 20).map((_, index) => (
          <div key={index} className={`w-1.5 h-1.5 rounded-full transition-colors ${
            index === currentIndex ? "bg-arcana-purple" : "bg-arcana-border"}`} />
        ))}
      </div>
    </div>
  );
}
