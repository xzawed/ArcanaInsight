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

  // 컨테이너 크기에 맞춰 카드 크기/갯수/간격을 동적 계산
  const layout = useMemo(() => {
    if (!containerWidth || !containerHeight) {
      return { maxDisplay: 16, spacing: 16, yOffset: 4, size: "sm" as const };
    }

    // 카드 비율 2:3 유지하여 컨테이너 높이의 70%를 카드 높이로
    const cardHeight = Math.min(containerHeight * 0.7, 240);
    const cardWidth = cardHeight * (2 / 3);

    // 카드 사이즈 결정 (sm/md/lg 중 가장 가까운 것)
    let size: "sm" | "md" | "lg";
    if (cardWidth >= 120) size = "md";
    else size = "sm";

    // 사용 가능한 너비의 80%를 카드 영역으로 사용
    const usableWidth = containerWidth * 0.85;

    // 카드 간격: 카드 겹침 팬 형태이므로, 간격 = 카드폭의 30~50%
    const overlap = cardWidth * 0.35;

    // 스크롤 없이 들어갈 수 있는 최대 카드 수
    const maxFit = Math.floor((usableWidth + overlap) / overlap);
    const maxDisplay = Math.min(Math.max(maxFit, 10), 24);

    return { maxDisplay, spacing: overlap, yOffset: Math.max(cardHeight * 0.04, 3), size };
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
        const angle = isSpread ? (index - totalCards / 2) * (180 / totalCards / 3) : 0;
        const xOffset = isSpread ? (index - totalCards / 2) * layout.spacing : (index - totalCards / 2) * 2;
        const yOffset = isSpread ? Math.abs(index - totalCards / 2) * layout.yOffset : index * -0.5;

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
              size={layout.size}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
