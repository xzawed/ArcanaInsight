"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TarotCard } from "@/types/card";
import { CardItem } from "./CardItem";
import { useSkinStore } from "@/hooks/useSkinStore";

interface CardDeckProps {
  cards: TarotCard[];
  isSpread: boolean;
  selectedIndices: number[];
  onCardSelect: (index: number) => void;
}

export function CardDeck({ cards, isSpread, selectedIndices, onCardSelect }: CardDeckProps) {
  const { selectedSkinId } = useSkinStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

    // 카드 크기: 컨테이너 높이의 45%, 2:3 비율 (아크 Y offset 공간 확보)
    let cardH = Math.min(containerHeight * 0.45, 140);
    let cardW = cardH / 1.5;

    // 클램프
    cardW = Math.max(Math.min(Math.round(cardW), 90), 28);
    cardH = Math.round(cardW * 1.5);

    // 사용 가능 너비 (양쪽 약간 여유)
    const usableWidth = containerWidth * 0.94;

    // 모바일(768px 미만)에서는 최대 20장, 데스크탑은 전체
    const isMobile = containerWidth < 768;
    const totalCards = isMobile ? Math.min(cards.length, 20) : cards.length;

    // 전체 카드를 넣을 수 있는 겹침 간격 계산
    const idealOverlap = totalCards > 1
      ? (usableWidth - cardW) / (totalCards - 1)
      : 0;

    // 최소 겹침: 카드 사이 3px 이상은 보여야 터치/클릭 가능
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

    const yOffset = Math.max(cardH * 0.02, 1);

    return { cardW, cardH, maxDisplay, overlap, yOffset };
  }, [containerWidth, containerHeight, cards.length]);

  const displayCards = useMemo(() => cards.slice(0, layout.maxDisplay), [cards, layout.maxDisplay]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center min-h-[160px] md:min-h-[280px] h-full"
    >
      {containerWidth > 0 && displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const half = totalCards / 2;
        const maxArc = Math.min(totalCards * 0.9, 40);
        const angle = isSpread ? (index - half) * (maxArc / totalCards) : 0;
        const xOffset = isSpread ? (index - half) * layout.overlap : (index - half) * 1.5;
        const yOffset = isSpread
          ? Math.pow(Math.abs(index - half) / half, 2) * layout.cardH * 0.15
          : index * -0.3;

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
              delay: isSpread ? index * 0.015 : 0,
            }}
            className="absolute cursor-pointer"
            style={{ zIndex: isSelected ? 0 : hoveredIndex === index ? 200 : index }}
            onClick={() => { if (!isSelected) onCardSelect(index); }}
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
}
