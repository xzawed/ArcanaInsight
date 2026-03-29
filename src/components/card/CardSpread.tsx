"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition, SpreadPosition } from "@/types/session";
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

  // 1단계: 컨테이너 비율 기반 카드 크기 계산
  const cardDimensions = useMemo(() => {
    if (!containerWidth || !containerHeight) return { w: 40, h: 60 };

    const count = spread.positions.length;

    // 카드 수가 많을수록 작게, 적을수록 크게
    // 1장: 컨테이너의 28%, 3장: 20%, 5장: 16%
    const ratio = count <= 1 ? 0.28 : count <= 3 ? 0.20 : 0.16;

    let cardW = containerWidth * ratio;
    let cardH = cardW * 1.5;

    // 세로도 넘치지 않도록 제한
    const maxH = containerHeight * ratio * 1.2;
    if (cardH > maxH) {
      cardH = maxH;
      cardW = cardH / 1.5;
    }

    // 최소/최대 클램프
    cardW = Math.max(Math.min(cardW, 110), 30);
    cardH = cardW * 1.5;

    return { w: Math.round(cardW), h: Math.round(cardH) };
  }, [containerWidth, containerHeight, spread.positions.length]);

  // 2단계: 카드 크기 기반으로 포지션을 동적 재계산
  const adjustedPositions = useMemo((): SpreadPosition[] => {
    if (!containerWidth || !containerHeight) return spread.positions;

    const positions = spread.positions;
    if (positions.length <= 1) return positions;

    // 카드 크기를 컨테이너 비율(%)로 변환
    const cardWPct = (cardDimensions.w / containerWidth) * 100;
    const cardHPct = (cardDimensions.h / containerHeight) * 100;

    // 카드 간격 = 카드 크기의 30% (반응형 — 카드가 크면 간격도 커짐)
    const gapXPct = cardWPct * 0.30;
    const gapYPct = cardHPct * 0.30;

    // 필요한 최소 중심-중심 거리
    const requiredDistX = cardWPct + gapXPct;
    const requiredDistY = cardHPct + gapYPct;

    // 원본 레이아웃의 중심점
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    // 원본 레이아웃의 최소 인접 거리
    const uniqueX = [...new Set(xs)].sort((a, b) => a - b);
    const uniqueY = [...new Set(ys)].sort((a, b) => a - b);
    const origMinDistX = uniqueX.length > 1
      ? Math.min(...uniqueX.slice(1).map((x, i) => x - uniqueX[i]))
      : 100;
    const origMinDistY = uniqueY.length > 1
      ? Math.min(...uniqueY.slice(1).map((y, i) => y - uniqueY[i]))
      : 100;

    // 스케일 팩터: 필요 거리 / 원본 거리 (카드+간격이 확보되도록)
    const scaleX = origMinDistX > 0 ? requiredDistX / origMinDistX : 1;
    const scaleY = origMinDistY > 0 ? requiredDistY / origMinDistY : 1;

    // 카드 가장자리가 컨테이너 안에 들어오도록 패딩
    const padX = cardWPct / 2 + 2;
    const padY = cardHPct / 2 + 2;

    return positions.map((p) => ({
      ...p,
      x: Math.max(padX, Math.min(100 - padX, centerX + (p.x - centerX) * scaleX)),
      y: Math.max(padY, Math.min(100 - padY, centerY + (p.y - centerY) * scaleY)),
    }));
  }, [containerWidth, containerHeight, cardDimensions, spread.positions]);

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto aspect-[4/3] overflow-hidden"
    >
      {containerWidth > 0 && containerHeight > 0 && adjustedPositions.map((pos) => {
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
