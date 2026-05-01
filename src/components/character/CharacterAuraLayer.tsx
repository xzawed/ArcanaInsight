"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mood } from "@/types/character";

interface CharacterAuraLayerProps {
  readonly mood: Mood;
  readonly isTransitioning: boolean;
}

// mood별 오라 색상
const AURA_COLOR: Record<Mood, string> = {
  default:   "rgba(139,92,246,0.5)",
  smile:     "rgba(212,175,55,0.6)",
  mystical:  "rgba(139,92,246,0.8)",
  serious:   "rgba(99,102,241,0.5)",
  surprised: "rgba(251,146,60,0.5)",
  wink:      "rgba(244,114,182,0.5)",
};

// 상시 파티클 고정 offset (SSR 안전 — Math.random 미사용)
const AMBIENT_PARTICLES = [
  { dx: -24, dy: -60, size: 3, delay: 0 },
  { dx: 0,   dy: -70, size: 2, delay: 1.2 },
  { dx: 24,  dy: -55, size: 3, delay: 2.1 },
] as const;

// burst 파티클 고정 offset
const BURST_PARTICLES = [
  { dx: -30, dy: -75, size: 4, delay: 0 },
  { dx: -12, dy: -85, size: 3, delay: 0.08 },
  { dx: 6,   dy: -80, size: 4, delay: 0.15 },
  { dx: 22,  dy: -72, size: 3, delay: 0.05 },
  { dx: 36,  dy: -65, size: 4, delay: 0.12 },
] as const;

export function CharacterAuraLayer({ mood, isTransitioning }: CharacterAuraLayerProps) {
  const shouldReduceMotion = useReducedMotion();
  const color = AURA_COLOR[mood];

  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${color} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
      {/* 오라 글로우 링 — 호흡 루프 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 50% 60%, ${color} 0%, transparent 70%)`,
          willChange: "transform, opacity",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 상시 파티클 3개 */}
      {AMBIENT_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            bottom: "35%",
            left: `calc(50% + ${p.dx}px)`,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            willChange: "transform",
          }}
          animate={{ y: [0, p.dy, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      {/* burst 파티클 5개 — isTransitioning 시 렌더 */}
      <AnimatePresence>
        {isTransitioning && BURST_PARTICLES.map((p, i) => (
          <motion.div
            key={`burst-${i}`}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              bottom: "35%",
              left: `calc(50% + ${p.dx}px)`,
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}`,
            }}
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{ y: p.dy, opacity: [0, 1, 0], scale: [0, 1.5, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
