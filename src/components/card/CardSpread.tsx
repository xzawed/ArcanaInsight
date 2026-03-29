"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition } from "@/types/session";
import { CardItem } from "./CardItem";

interface CardSpreadProps {
  selectedCards: SelectedCard[];
  spread: SpreadDefinition;
  revealedPositions: number[];
}

export function CardSpread({ selectedCards, spread, revealedPositions }: CardSpreadProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cardSize = isDesktop ? "md" : "sm";
  const placeholderClass = isDesktop
    ? "w-24 h-36 rounded-lg border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5"
    : "w-12 h-[72px] rounded border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5";

  return (
    <div className="relative w-full max-w-[280px] md:max-w-lg mx-auto aspect-[4/3]">
      {spread.positions.map((pos) => {
        const selectedCard = selectedCards.find((sc) => sc.position === pos.index);
        const isRevealed = revealedPositions.includes(pos.index);

        return (
          <motion.div
            key={pos.index}
            initial={{ opacity: 0, scale: 0.3, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: pos.index * 0.25,
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {selectedCard ? (
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  {isRevealed && (
                    <motion.div
                      className="absolute -inset-2 rounded-xl bg-arcana-gold/20 blur-md"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 1] }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  )}
                  <CardItem
                    card={selectedCard.card}
                    isFlipped={isRevealed}
                    isSelected={true}
                    isReversed={selectedCard.isReversed}
                    size={cardSize}
                  />
                </div>
                <span className="text-arcana-gold text-[10px] md:text-sm font-serif font-bold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]">
                  {pos.labelKo}
                </span>
              </div>
            ) : (
              <div className={placeholderClass}>
                <span className="text-arcana-gold/60 text-[9px] md:text-sm font-serif font-bold">{pos.labelKo}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
