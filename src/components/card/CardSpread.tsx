"use client";

import { useRef, useState, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // 컨테이너 너비 기반으로 카드 사이즈 결정
  // 카드 5장이 겹침 없이 들어가려면 카드폭 < 컨테이너/5 * 1.5
  const cardSize: "sm" | "md" | "lg" = containerWidth >= 500 ? "md" : "sm";
  const placeholderW = containerWidth >= 500 ? "w-24 h-36" : "w-10 h-[60px]";

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto aspect-[4/3] overflow-hidden"
    >
      {containerWidth > 0 && spread.positions.map((pos) => {
        const selectedCard = selectedCards.find((sc) => sc.position === pos.index);
        const isRevealed = revealedPositions.includes(pos.index);

        return (
          <motion.div
            key={pos.index}
            initial={{ opacity: 0, scale: 0.3, y: 40 }}
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
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <div className="relative">
                  {isRevealed && (
                    <motion.div
                      className="absolute -inset-1 md:-inset-2 rounded-xl bg-arcana-gold/20 blur-md"
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
                <span className="text-arcana-gold text-[8px] md:text-sm font-serif font-bold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)] truncate max-w-[60px] md:max-w-none">
                  {pos.labelKo}
                </span>
              </div>
            ) : (
              <div className={`${placeholderW} rounded border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5`}>
                <span className="text-arcana-gold/60 text-[8px] md:text-sm font-serif font-bold truncate">{pos.labelKo}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
