"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { Mood, IdleAnimationType } from "@/types/character";

interface MoodConfig {
  loop: boolean;
  displayDuration: number;
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  default: { loop: true, displayDuration: 0 },
  smile: { loop: false, displayDuration: 2000 },
  serious: { loop: false, displayDuration: 2000 },
  surprised: { loop: false, displayDuration: 1500 },
  wink: { loop: false, displayDuration: 1500 },
  mystical: { loop: true, displayDuration: 0 },
};

const MOOD_TO_FILE: Record<Mood, string> = {
  default: "idle",
  smile: "smile",
  serious: "serious",
  surprised: "surprised",
  wink: "wink",
  mystical: "mystical",
};

const LOOP_MOTION: Record<string, Record<string, number[] | string[]>> = {
  // idle animation 타입별 (mood === "default"일 때 적용)
  float: {
    y: [0, -6, 0],
    scale: [1, 1.01, 1],
  },
  "float-strong": {
    y: [0, -8, 0],
    scale: [1, 1.015, 1],
  },
  bounce: {
    y: [0, -12, 0],
    scale: [1, 1.02, 1],
  },
  breathe: {
    y: [0, -2, 0, -1, 0],
    scale: [1, 1.005, 1, 1.003, 1],
    opacity: [1, 1, 1, 0.88, 1],
  },
  // mood 전용 오버라이드
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

const LOOP_TRANSITIONS: Record<string, { duration: number; repeat: number; ease: Easing }> = {
  float: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  "float-strong": { duration: 3, repeat: Infinity, ease: "easeInOut" },
  bounce: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  breathe: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  mystical: { duration: 4, repeat: Infinity, ease: "easeInOut" },
};

const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.95, 1.03, 1], y: [5, -3, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.9, 1.05, 1], y: [10, -5, 0] },
  wink: { scale: [0.95, 1.02, 1], y: [3, -2, 0] },
};

interface SpriteAnimatorProps {
  readonly characterId: string;
  readonly mood: Mood;
  readonly idleAnimation?: IdleAnimationType;
  readonly onAnimationEnd?: () => void;
  readonly className?: string;
}

export function SpriteAnimator({ characterId, mood, idleAnimation = "float", onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];
  const fileName = MOOD_TO_FILE[mood];
  const imageSrc = `/images/characters/${characterId}/nukki/${fileName}.png`;

  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;
    const timer = setTimeout(() => { onAnimationEnd(); }, config.displayDuration);
    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const activeLoopKey = mood === "default" ? idleAnimation : mood;
  const loopAnim = LOOP_MOTION[activeLoopKey] ?? LOOP_MOTION.float;
  const loopTransition = LOOP_TRANSITIONS[activeLoopKey] ?? LOOP_TRANSITIONS.float;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <div className={`relative ${className}`}>
    <AnimatePresence mode="sync">
      <motion.div
        key={`${characterId}-${mood}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        {!isLooping && enterAnim ? (
          <motion.div animate={enterAnim} transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full h-full">
            <Image src={imageSrc} alt="character" fill sizes="50vw"
              className="object-contain object-center" priority />
          </motion.div>
        ) : (
          <motion.div
            animate={loopAnim}
            transition={loopTransition}
            className="relative w-full h-full"
          >
            <Image src={imageSrc} alt="character" fill sizes="50vw"
              className="object-contain object-center" priority />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
    </div>
  );
}
