"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

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
      return { cardW: 40, cardH: 60, maxDisplay: 12, overlap: 16, yOffset: 3 };
    }

    // 카드 크기: 컨테이너 높이의 65%, 2:3 비율 유지
    let cardH = Math.min(containerHeight * 0.65, 200);
    let cardW = cardH / 1.5;

    // 너비 상한: 컨테이너 너비의 25%를 초과하지 않도록
    if (cardW > containerWidth * 0.25) {
      cardW = containerWidth * 0.25;
      cardH = cardW * 1.5;
    }

    // 클램프
    cardW = Math.max(Math.min(Math.round(cardW), 100), 32);
    cardH = Math.round(cardW * 1.5);

    // 겹침 간격: 카드 너비의 35%
    const overlap = Math.round(cardW * 0.35);

    // 팬이 컨테이너 안에 들어가는 최대 카드 수
    // 팬 너비 = (N-1) * overlap + cardW <= containerWidth * 0.92
    const usableWidth = containerWidth * 0.92;
    const maxFromWidth = Math.floor((usableWidth - cardW) / overlap) + 1;
    const maxDisplay = Math.min(Math.max(maxFromWidth, 8), 24);

    const yOffset = Math.max(cardH * 0.03, 2);

    return { cardW, cardH, maxDisplay, overlap, yOffset };
  }, [containerWidth, containerHeight]);

  const displayCards = useMemo(() => cards.slice(0, layout.maxDisplay), [cards, layout.maxDisplay]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center min-h-[160px] md:min-h-[280px] h-full overflow-hidden"
    >
      {containerWidth > 0 && displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const half = totalCards / 2;
        const angle = isSpread ? (index - half) * (180 / totalCards / 3) : 0;
        const xOffset = isSpread ? (index - half) * layout.overlap : (index - half) * 2;
        const yOffset = isSpread ? Math.abs(index - half) * layout.yOffset : index * -0.5;

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
              width={layout.cardW}
              height={layout.cardH}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
