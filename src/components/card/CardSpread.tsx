"use client";

import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition } from "@/types/session";
import { CardItem } from "./CardItem";

interface CardSpreadProps { selectedCards: SelectedCard[]; spread: SpreadDefinition; revealedPositions: number[]; }

export function CardSpread({ selectedCards, spread, revealedPositions }: CardSpreadProps) {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {spread.positions.map((pos) => {
        const selectedCard = selectedCards.find((sc) => sc.position === pos.index);
        const isRevealed = revealedPositions.includes(pos.index);
        return (
          <motion.div key={pos.index}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: pos.index * 0.2, type: "spring" }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            {selectedCard ? (
              <div className="flex flex-col items-center gap-1">
                <CardItem card={selectedCard.card} isFlipped={isRevealed} isSelected={true}
                  isReversed={selectedCard.isReversed} size="md" />
                <span className="text-arcana-muted text-xs">{pos.labelKo}</span>
              </div>
            ) : (
              <div className="w-24 h-36 rounded-lg border-2 border-dashed border-arcana-border/50 flex items-center justify-center">
                <span className="text-arcana-muted text-xs">{pos.labelKo}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
