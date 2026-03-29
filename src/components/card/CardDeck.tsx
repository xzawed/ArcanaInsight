"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";

interface CardDeckProps {
  cards: TarotCard[];
  isSpread: boolean;
  selectedIndices: number[];
  onCardSelect: (index: number) => void;
}

export function CardDeck({ cards, isSpread, selectedIndices, onCardSelect }: CardDeckProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const maxDisplay = isDesktop ? 24 : 16;
  const cardSpacing = isDesktop ? 28 : 16;
  const cardYOffset = isDesktop ? 8 : 4;
  const cardSize = isDesktop ? "md" : "sm";

  const displayCards = useMemo(() => cards.slice(0, maxDisplay), [cards, maxDisplay]);

  return (
    <div className="relative w-full flex items-center justify-center min-h-[160px] md:min-h-[300px] overflow-hidden">
      {displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const angle = isSpread ? (index - totalCards / 2) * (180 / totalCards / 3) : 0;
        const xOffset = isSpread ? (index - totalCards / 2) * cardSpacing : (index - totalCards / 2) * 2;
        const yOffset = isSpread ? Math.abs(index - totalCards / 2) * cardYOffset : index * -0.5;

        return (
          <motion.div
            key={card.id}
            initial={{ x: 0, y: 50, rotate: 0, opacity: 0 }}
            animate={{
              x: xOffset,
              y: isSelected ? -30 : yOffset,
              rotate: angle,
              opacity: isSelected ? 0.3 : 1,
              scale: isSelected ? 0.9 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 18,
              delay: isSpread ? index * 0.04 : 0,
            }}
            className="absolute"
            style={{ zIndex: isSelected ? 0 : index }}
          >
            <CardItem
              card={card}
              isFlipped={false}
              isSelected={isSelected}
              onClick={() => !isSelected && onCardSelect(index)}
              size={cardSize}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
