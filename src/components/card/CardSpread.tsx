"use client";

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
  return (
    <div className="relative w-full max-w-sm md:max-w-lg mx-auto aspect-[4/3]">
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
              <div className="flex flex-col items-center gap-1.5">
                {/* 카드 공개 시 글로우 펄스 애니메이션 */}
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
                    size="sm"
                  />
                </div>
                <span className="text-arcana-gold text-xs md:text-sm font-serif font-bold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]">
                  {pos.labelKo}
                </span>
              </div>
            ) : (
              <div className="w-16 h-24 md:w-24 md:h-36 rounded-lg border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5">
                <span className="text-arcana-gold/60 text-xs md:text-sm font-serif font-bold">{pos.labelKo}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
