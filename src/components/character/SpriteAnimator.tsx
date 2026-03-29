"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

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
  smile: "happy",
  serious: "serious",
  surprised: "surprised",
  wink: "happy",
  mystical: "mystical",
};

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

const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.95, 1.03, 1], y: [5, -3, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.9, 1.05, 1], y: [10, -5, 0] },
  wink: { scale: [0.95, 1.02, 1], y: [3, -2, 0] },
};

interface SpriteAnimatorProps {
  characterId: string;
  mood: Mood;
  onAnimationEnd?: () => void;
  className?: string;
}

export function SpriteAnimator({ characterId, mood, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];
  const fileName = MOOD_TO_FILE[mood];
  const imageSrc = `/images/characters/${characterId}/nukki/${fileName}.png`;

  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;
    const timer = setTimeout(() => { onAnimationEnd(); }, config.displayDuration);
    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const loopAnim = LOOP_MOTION[mood] ?? LOOP_MOTION.default;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${characterId}-${mood}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {!isLooping && enterAnim ? (
          <motion.div animate={enterAnim} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Image src={imageSrc} alt="character" width={512} height={768}
              className="w-full h-auto object-contain" priority />
          </motion.div>
        ) : (
          <motion.div
            animate={loopAnim}
            transition={{ duration: mood === "mystical" ? 4 : 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src={imageSrc} alt="character" width={512} height={768}
              className="w-full h-auto object-contain" priority />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
