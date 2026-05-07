"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { SelectedCard } from "@/types/card";
import { SpreadDefinition, SpreadPosition } from "@/types/session";
import { CardItem } from "./CardItem";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { hexToRgbBase } from "@/lib/color-utils";
import { getPositionLabel } from "@/data/spreads";

interface CardSpreadProps {
  readonly selectedCards: SelectedCard[];
  readonly spread: SpreadDefinition;
  readonly revealedPositions: number[];
  readonly glowColor?: string;
}

/**
 * 카드 크기 + 포지션을 동시에 계산하여 컨테이너에 꽉 맞게 배치.
 *
 * 핵심 공식 (각 축):
 *   maxDim = (minGap × containerDim) / (origRange × (1 + gapRatio) + minGap)
 *
 * 이 공식은 "원본 레이아웃 비율을 유지하면서, 카드+간격이 컨테이너 안에
 * 겹침 없이 들어가는 최대 카드 크기"를 정확히 구합니다.
 */
function computeLayout(
  positions: SpreadPosition[],
  containerW: number,
  containerH: number,
) {
  const GAP_RATIO = 0.12; // 카드 크기의 12%를 간격으로

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);

  const uniqueX = [...new Set(xs)].sort((a, b) => a - b);
  const uniqueY = [...new Set(ys)].sort((a, b) => a - b);

  const origRangeX = (uniqueX[uniqueX.length - 1] ?? 0) - (uniqueX[0] ?? 0);
  const origRangeY = (uniqueY[uniqueY.length - 1] ?? 0) - (uniqueY[0] ?? 0);

  const minXGap = uniqueX.length > 1
    ? Math.min(...uniqueX.slice(1).map((x, i) => x - uniqueX[i]))
    : 0;
  const minYGap = uniqueY.length > 1
    ? Math.min(...uniqueY.slice(1).map((y, i) => y - uniqueY[i]))
    : 0;

  // 각 축의 최대 카드 크기 계산
  const maxW = minXGap > 0 && origRangeX > 0
    ? (minXGap * containerW) / (origRangeX * (1 + GAP_RATIO) + minXGap)
    : containerW * 0.30; // 단일 열이면 넉넉하게

  const maxH = minYGap > 0 && origRangeY > 0
    ? (minYGap * containerH) / (origRangeY * (1 + GAP_RATIO) + minYGap)
    : containerH * 0.40; // 단일 행이면 넉넉하게

  // 2:3 비율 유지하며 양쪽 제한 충족
  let cardW = maxW;
  let cardH = cardW * 1.5;
  if (cardH > maxH) {
    cardH = maxH;
    cardW = cardH / 1.5;
  }

  // 클램프
  cardW = Math.max(Math.min(Math.round(cardW), 120), 30);
  cardH = Math.round(cardW * 1.5);

  // 포지션 매핑: 카드 중심이 [margin, containerDim - margin] 범위에 들어오도록
  const marginX = cardW / 2;
  const marginY = cardH / 2 + cardH * 0.15; // 상단 여유 15% 추가 (라벨 공간 + 캐릭터 겹침 방지)
  const marginYBottom = cardH / 2 + cardH * 0.15; // 하단 여유 (라벨 공간)
  const availX = containerW - cardW;
  const availY = containerH - marginY - marginYBottom;

  const origMinX = uniqueX[0] ?? 50;
  const origMinY = uniqueY[0] ?? 50;

  const adjusted: SpreadPosition[] = positions.map((p) => {
    const px = origRangeX > 0
      ? marginX + ((p.x - origMinX) / origRangeX) * availX
      : containerW / 2; // 단일 열이면 중앙

    const py = origRangeY > 0
      ? marginY + ((p.y - origMinY) / origRangeY) * availY
      : containerH / 2; // 단일 행이면 중앙

    return { ...p, x: (px / containerW) * 100, y: (py / containerH) * 100 };
  });

  return { cardW, cardH, positions: adjusted };
}

export const CardSpread = React.memo(
  function CardSpread({ selectedCards, spread, revealedPositions, glowColor }: CardSpreadProps) {
  const { selectedSkinId } = useSkinStore();
  const locale = useLocaleStore((s) => s.locale);
  const rgb = glowColor ? hexToRgbBase(glowColor) : "212, 175, 55";
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
      return { cardW: 40, cardH: 60, positions: spread.positions };
    }
    return computeLayout(spread.positions, containerWidth, containerHeight);
  }, [containerWidth, containerHeight, spread.positions]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
    >
      {containerWidth > 0 && containerHeight > 0 && layout.positions.map((pos) => {
        const selectedCard = selectedCards.find((sc) => sc.position === pos.index);
        const isRevealed = revealedPositions.includes(pos.index);

        return (
          <motion.div
            key={pos.index}
            initial={{ opacity: 0, scale: 0.3, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: Math.min(pos.index * 0.4, 1.6),
              type: "spring",
              stiffness: 70,
              damping: 22,
            }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {selectedCard ? (
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <div
                  className="relative"
                  style={pos.rotation ? { transform: `rotate(${pos.rotation}deg)` } : undefined}
                >
                  {isRevealed && (
                    <motion.div
                      className="absolute -inset-1 md:-inset-2 rounded-xl blur-md"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 1] }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      style={{ background: `rgba(${rgb}, 0.25)` }}
                    />
                  )}
                  <CardItem
                    card={selectedCard.card}
                    isFlipped={isRevealed}
                    isSelected={true}
                    isReversed={selectedCard.isReversed}
                    width={layout.cardW}
                    height={layout.cardH}
                    skinId={selectedSkinId}
                    glowColor={glowColor}
                  />
                </div>
                <span
                  className="text-arcana-gold font-serif font-bold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)] truncate text-center"
                  style={{ fontSize: Math.max(layout.cardW * 0.18, 8), maxWidth: layout.cardW * 1.5 }}
                >
                  {getPositionLabel(pos, locale)}
                </span>
              </div>
            ) : (
              <div
                className="rounded border border-dashed border-arcana-purple/30 flex items-center justify-center bg-arcana-purple/5"
                style={{ width: layout.cardW, height: layout.cardH }}
              >
                <span
                  className="text-arcana-gold/60 font-serif font-bold truncate"
                  style={{ fontSize: Math.max(layout.cardW * 0.18, 8) }}
                >
                  {getPositionLabel(pos, locale)}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
  },
  (prev, next) =>
    prev.spread === next.spread &&
    prev.glowColor === next.glowColor &&
    prev.selectedCards === next.selectedCards &&
    prev.revealedPositions.length === next.revealedPositions.length &&
    prev.revealedPositions.every((v, i) => v === next.revealedPositions[i]),
);
CardSpread.displayName = "CardSpread";
