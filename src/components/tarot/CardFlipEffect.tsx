"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

const BURST_RAYS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

interface CardFlipEffectProps {
  readonly isFlipped: boolean;
  readonly front: React.ReactNode;
  readonly back: React.ReactNode;
  readonly width: number;
  readonly height: number;
  readonly glowColor?: string;
  readonly onFlipComplete?: () => void;
}

/**
 * 카드 3D Y축 플립 + 완료 시 광선 버스트 파티클.
 * front = 카드 뒷면(뒤집기 전), back = 카드 앞면(뒤집은 후).
 */
export function CardFlipEffect({
  isFlipped,
  front,
  back,
  width,
  height,
  glowColor = "rgba(167,139,250,0.8)",
  onFlipComplete,
}: CardFlipEffectProps) {
  const shouldReduceMotion = useReducedMotion();
  const prevFlipped = useRef(isFlipped);
  const onFlipCompleteRef = useRef(onFlipComplete);

  useLayoutEffect(() => {
    onFlipCompleteRef.current = onFlipComplete;
  });

  useEffect(() => {
    if (!prevFlipped.current && isFlipped) {
      const tid = setTimeout(() => onFlipCompleteRef.current?.(), shouldReduceMotion ? 0 : 320);
      prevFlipped.current = true;
      return () => clearTimeout(tid);
    }
  }, [isFlipped, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <div style={{ width, height, position: "relative" }}>
        {isFlipped ? back : front}
      </div>
    );
  }

  return (
    <div style={{ width, height, perspective: width * 5, position: "relative" }}>
      {/* burst rays — appear once at flip moment */}
      {isFlipped && BURST_RAYS.map((angle) => (
        <motion.div
          key={angle}
          className="absolute pointer-events-none"
          style={{
            width: 2,
            height: height * 0.6,
            top: "20%",
            left: "50%",
            transformOrigin: "top center",
            background: `linear-gradient(180deg, ${glowColor}, transparent)`,
            transform: `rotate(${angle}deg)`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      ))}

      {/* flip card */}
      <motion.div
        style={{
          width,
          height,
          position: "relative",
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={
          isFlipped
            ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
            : { duration: 0 }
        }
      >
        {/* front face (card back image) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {front}
        </div>

        {/* back face (card art) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
