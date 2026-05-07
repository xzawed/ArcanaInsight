"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";
import { useSkinStore } from "@/hooks/useSkinStore";

interface CardDeckProps {
  readonly cards: TarotCard[];
  readonly isSpread: boolean;
  readonly selectedIndices: number[];
  readonly onCardSelect: (index: number) => void;
}

interface CardTransformInput {
  index: number;
  totalCards: number;
  overlap: number;
  cardH: number;
  effectivelySpread: boolean;
  isSelected: boolean;
  isHovered: boolean;
  ritualDone: boolean;
}

function getCardTransform({ index, totalCards, overlap, cardH, effectivelySpread, isSelected, isHovered, ritualDone }: CardTransformInput) {
  const half = totalCards / 2;
  const maxArc = Math.min(totalCards * 0.9, 40);

  const angle = effectivelySpread ? (index - half) * (maxArc / totalCards) : 0;
  const xOffset = effectivelySpread ? (index - half) * overlap : (index - half) * 1.5;
  const baseY = effectivelySpread
    ? Math.pow(Math.abs(index - half) / half, 2) * cardH * 0.15
    : index * -0.3;
  const hoverLift = ritualDone && isHovered && !isSelected ? -8 : 0;

  let scale = 1;
  if (isSelected) scale = 0.9;
  else if (ritualDone && isHovered) scale = 1.04;

  return { angle, xOffset, y: isSelected ? -30 : baseY + hoverLift, scale };
}

export const CardDeck = React.memo(function CardDeck({ cards, isSpread, selectedIndices, onCardSelect }: CardDeckProps) {
  const { selectedSkinId } = useSkinStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 셔플 의식: spread(350ms) → ritualDone(600ms)
  const [ritualDone, setRitualDone] = useState(false);
  const [ritualSpread, setRitualSpread] = useState(false);

  useEffect(() => {
    if (!isSpread) return;
    const t1 = setTimeout(() => setRitualSpread(true), 350);
    const t2 = setTimeout(() => setRitualDone(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isSpread]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = useMemo(() => {
    if (!containerWidth || !containerHeight) {
      return { cardW: 40, cardH: 60, maxDisplay: 12, overlap: 5, yOffset: 2 };
    }

    let cardH = Math.min(containerHeight * 0.45, 140);
    let cardW = cardH / 1.5;

    cardW = Math.max(Math.min(Math.round(cardW), 90), 28);
    cardH = Math.round(cardW * 1.5);

    const usableWidth = containerWidth * 0.94;
    const isMobile = containerWidth < 768;
    const totalCards = isMobile ? Math.min(cards.length, 20) : cards.length;
    const idealOverlap = totalCards > 1 ? (usableWidth - cardW) / (totalCards - 1) : 0;
    const MIN_OVERLAP = 3;

    let overlap: number;
    let maxDisplay: number;

    if (idealOverlap >= MIN_OVERLAP) {
      overlap = Math.round(idealOverlap);
      maxDisplay = totalCards;
    } else {
      overlap = MIN_OVERLAP;
      maxDisplay = Math.floor((usableWidth - cardW) / overlap) + 1;
    }

    return { cardW, cardH, maxDisplay, overlap, yOffset: Math.max(cardH * 0.02, 1) };
  }, [containerWidth, containerHeight, cards.length]);

  const displayCards = useMemo(() => cards.slice(0, layout.maxDisplay), [cards, layout.maxDisplay]);

  // 의식 완료 전에는 ritualSpread, 완료 후에는 isSpread가 기준
  const effectivelySpread = ritualDone ? isSpread : ritualSpread;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center min-h-[160px] md:min-h-[280px] h-full"
    >
      {containerWidth > 0 && displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const { angle, xOffset, y, scale } = getCardTransform({
          index,
          totalCards: displayCards.length,
          overlap: layout.overlap,
          cardH: layout.cardH,
          effectivelySpread,
          isSelected,
          isHovered: hoveredIndex === index,
          ritualDone,
        });

        return (
          <motion.div
            key={card.id}
            data-testid={`card-back-${index}`}
            data-card-name={card.id}
            initial={{ x: 0, y: 50, rotate: 0, opacity: 0 }}
            animate={{ x: xOffset, y, rotate: angle, opacity: isSelected ? 0.3 : 1, scale }}
            transition={{
              type: "spring",
              stiffness: ritualDone ? 120 : 200,
              damping: ritualDone ? 18 : 26,
              delay: ritualDone && isSpread ? index * 0.015 : 0,
            }}
            className={`absolute ${ritualDone && !isSelected ? "cursor-pointer" : "cursor-default"}`}
            style={{ zIndex: isSelected ? 0 : hoveredIndex === index ? 200 : index }}
            onClick={() => { if (!isSelected && ritualDone) onCardSelect(index); }}
            onPointerEnter={() => setHoveredIndex(index)}
            onPointerLeave={() => setHoveredIndex(null)}
          >
            <CardItem
              card={card}
              isFlipped={false}
              isSelected={isSelected}
              width={layout.cardW}
              height={layout.cardH}
              skinId={selectedSkinId}
            />
          </motion.div>
        );
      })}
    </div>
  );
});
CardDeck.displayName = "CardDeck";
