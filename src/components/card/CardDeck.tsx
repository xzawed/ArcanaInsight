"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

    // 카드 크기: 컨테이너 높이의 55%, 2:3 비율
    let cardH = Math.min(containerHeight * 0.55, 160);
    let cardW = cardH / 1.5;

    // 클램프
    cardW = Math.max(Math.min(Math.round(cardW), 100), 28);
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

  /** 컨테이너 클릭 → 클릭 좌표에 있는 가장 위(z-index 높은) 카드를 선택 */
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;

    // z-index가 높은 카드(인덱스 큰 카드)부터 역순으로 검사 → 첫 히트가 시각적 최상단
    for (let i = displayCards.length - 1; i >= 0; i--) {
      const el = cardRefs.current.get(i);
      if (!el || selectedIndices.includes(i)) continue;

      const rect = el.getBoundingClientRect();
      const inX = clickX >= rect.left - containerRect.left && clickX <= rect.right - containerRect.left;
      const inY = clickY >= rect.top - containerRect.top && clickY <= rect.bottom - containerRect.top;

      if (inX && inY) {
        onCardSelect(i);
        return;
      }
    }
  }, [displayCards.length, selectedIndices, onCardSelect]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center min-h-[160px] md:min-h-[280px] h-full overflow-hidden cursor-pointer"
      onClick={handleContainerClick}
    >
      {containerWidth > 0 && displayCards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const totalCards = displayCards.length;
        const half = totalCards / 2;
        // 아크 각도: 카드 수에 따라 조절 (많으면 총 각도 넓게, 개별 각도는 좁게)
        const maxArc = Math.min(totalCards * 1.2, 60); // 최대 60도 범위
        const angle = isSpread ? (index - half) * (maxArc / totalCards) : 0;
        const xOffset = isSpread ? (index - half) * layout.overlap : (index - half) * 1.5;
        const yOffset = isSpread
          ? Math.pow(Math.abs(index - half) / half, 2) * layout.cardH * 0.25
          : index * -0.3;

        return (
          <motion.div
            key={card.id}
            ref={(el) => { if (el) cardRefs.current.set(index, el); }}
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
            className="absolute pointer-events-none"
            style={{ zIndex: isSelected ? 0 : hoveredIndex === index ? 200 : index }}
            onPointerEnter={() => setHoveredIndex(index)}
            onPointerLeave={() => setHoveredIndex(null)}
          >
            <CardItem
              card={card}
              isFlipped={false}
              isSelected={isSelected}
              width={layout.cardW}
              height={layout.cardH}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
