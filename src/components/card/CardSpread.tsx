"use client";

import { useRef, useState, useEffect, useMemo } from "react";
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

  // 컨테이너 크기 + 스프레드 포지션 기반으로 카드 크기 동적 계산
  const cardDimensions = useMemo(() => {
    if (!containerWidth || !containerHeight) return { w: 40, h: 60 };

    const positions = spread.positions;

    // X/Y 좌표에서 최소 여백과 최소 간격 계산
    const xValues = positions.map((p) => p.x);
    const yValues = positions.map((p) => p.y);

    const minEdgeX = Math.min(...xValues.map((x) => Math.min(x, 100 - x)));
    const minEdgeY = Math.min(...yValues.map((y) => Math.min(y, 100 - y)));

    const uniqueX = [...new Set(xValues)].sort((a, b) => a - b);
    const uniqueY = [...new Set(yValues)].sort((a, b) => a - b);

    const minGapX = uniqueX.length > 1
      ? Math.min(...uniqueX.slice(1).map((x, i) => x - uniqueX[i]))
      : 100;
    const minGapY = uniqueY.length > 1
      ? Math.min(...uniqueY.slice(1).map((y, i) => y - uniqueY[i]))
      : 100;

    // 카드가 넘치지 않도록: 카드 반폭 < 최소 여백, 카드 전폭 < 최소 간격
    const maxWFromEdge = (minEdgeX * 2) * containerWidth / 100;
    const maxWFromGap = minGapX * containerWidth / 100;
    const maxHFromEdge = (minEdgeY * 2) * containerHeight / 100;
    const maxHFromGap = minGapY * containerHeight / 100;

    // 가로/세로 각각의 제한치 (간격의 80%까지 사용)
    const maxW = Math.min(maxWFromEdge, maxWFromGap) * 0.8;
    const maxH = Math.min(maxHFromEdge, maxHFromGap) * 0.8;

    // 2:3 비율 유지하며 양쪽 제한 모두 충족
    let cardW = maxW;
    let cardH = cardW * 1.5;
    if (cardH > maxH) {
      cardH = maxH;
      cardW = cardH / 1.5;
    }

    // 최소/최대 클램프
    cardW = Math.max(Math.min(cardW, 96), 32);
    cardH = cardW * 1.5;

    return { w: Math.round(cardW), h: Math.round(cardH) };
  }, [containerWidth, containerHeight, spread.positions]);

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto aspect-[4/3] overflow-hidden"
    >
      {containerWidth > 0 && containerHeight > 0 && spread.positions.map((pos) => {
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
                    width={cardDimensions.w}
                    height={cardDimensions.h}
                  />
                </div>
                <span
                  className="text-arcana-gold font-serif font-bold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)] truncate text-center"
                  style={{ fontSize: Math.max(cardDimensions.w * 0.18, 8), maxWidth: cardDimensions.w * 1.5 }}
                >
                  {pos.labelKo}
                </span>
              </div>
            ) : (
              <div
                className="rounded border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5"
                style={{ width: cardDimensions.w, height: cardDimensions.h }}
              >
                <span
                  className="text-arcana-gold/60 font-serif font-bold truncate"
                  style={{ fontSize: Math.max(cardDimensions.w * 0.18, 8) }}
                >
                  {pos.labelKo}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
