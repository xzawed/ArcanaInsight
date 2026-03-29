"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

interface MoodConfig {
  src: string;
  loop: boolean;
  /** 1회 재생 동작의 표시 시간 (ms) — loop 동작은 무시 */
  displayDuration: number;
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  default: { src: "/images/characters/arcana/sprites/idle.png", loop: true, displayDuration: 0 },
  smile: { src: "/images/characters/arcana/sprites/happy.png", loop: false, displayDuration: 2000 },
  serious: { src: "/images/characters/arcana/sprites/serious.png", loop: false, displayDuration: 2000 },
  surprised: { src: "/images/characters/arcana/sprites/surprised.png", loop: false, displayDuration: 1500 },
  wink: { src: "/images/characters/arcana/sprites/happy.png", loop: false, displayDuration: 1500 },
  mystical: { src: "/images/characters/arcana/sprites/mystical.png", loop: true, displayDuration: 0 },
};

// 루프 동작별 미세 모션 정의
const LOOP_MOTION: Record<string, Record<string, number[] | string[]>> = {
  default: {
    y: [0, -6, 0],
    scale: [1, 1.01, 1],
  },
  mystical: {
    y: [0, -10, 0],
    scale: [1, 1.02, 1],
    filter: [
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
      "drop-shadow(0 0 20px rgba(139,92,246,0.6))",
      "drop-shadow(0 0 8px rgba(139,92,246,0.3))",
    ],
  },
};

// 1회 재생 동작 진입 모션
const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.95, 1.03, 1], y: [5, -3, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.9, 1.05, 1], y: [10, -5, 0] },
  wink: { scale: [0.95, 1.02, 1], y: [3, -2, 0] },
};

interface SpriteAnimatorProps {
  mood: Mood;
  onAnimationEnd?: () => void;
  className?: string;
}

export function SpriteAnimator({ mood, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];

  // 1회 재생 동작 → displayDuration 후 onAnimationEnd 호출
  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;

    const timer = setTimeout(() => {
      onAnimationEnd();
    }, config.displayDuration);

    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const loopAnim = LOOP_MOTION[mood] ?? LOOP_MOTION.default;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {/* 1회 재생 동작 진입 모션 */}
        {!isLooping && enterAnim ? (
          <motion.div
            animate={enterAnim}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Image
              src={config.src}
              alt="character"
              width={512}
              height={768}
              className="w-full h-auto object-contain"
              priority
            />
          </motion.div>
        ) : (
          /* 루프 동작 — 호흡/부유 미세 모션 */
          <motion.div
            animate={loopAnim}
            transition={{
              duration: mood === "mystical" ? 4 : 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src={config.src}
              alt="character"
              width={512}
              height={768}
              className="w-full h-auto object-contain"
              priority
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
