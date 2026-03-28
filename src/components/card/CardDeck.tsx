"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardDeckProps {
  cards: TarotCard[]; isSpread: boolean; selectedIndices: number[];
  onCardSelect: (index: number) => void; maxDisplay?: number;
}

export function CardDeck({ cards, isSpread, selectedIndices, onCardSelect, maxDisplay = 12 }: CardDeckProps) {
  const displayCards = useMemo(() => cards.slice(0, maxDisplay), [cards, maxDisplay]);
  return (
    <div className="relative w-full flex items-center justify-center min-h-[200px]">
      {displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const angle = isSpread ? (index - totalCards / 2) * (180 / totalCards / 2) : 0;
        const xOffset = isSpread ? (index - totalCards / 2) * 40 : (index - totalCards / 2) * 2;
        const yOffset = isSpread ? Math.abs(index - totalCards / 2) * 8 : index * -0.5;
        return (
          <motion.div key={card.id}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            animate={{ x: xOffset, y: yOffset, rotate: angle, opacity: isSelected ? 0.3 : 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: isSpread ? index * 0.05 : 0 }}
            className="absolute" style={{ zIndex: index }}>
            <CardItem card={card} isFlipped={false} isSelected={isSelected}
              onClick={() => !isSelected && onCardSelect(index)} size="md" />
          </motion.div>
        );
      })}
    </div>
  );
}
