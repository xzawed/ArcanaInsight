"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Easing, type TargetAndTransition, type Transition } from "framer-motion";
import { Mood, IdleAnimationType, CharacterId } from "@/types/character";
import { hexToRgba } from "@/lib/color-utils";

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

function buildLoopMotion(primary: string): Record<string, Record<string, number[] | string[]>> {
  const sh = (blur: number, alpha: number) => `drop-shadow(0 0 ${blur}px ${hexToRgba(primary, alpha)})`;
  return {
    float: {
      y: [0, -6, 0],
      scale: [1, 1.01, 1],
      filter: [sh(6, 0.25), sh(16, 0.6), sh(6, 0.25)],
    },
    "float-strong": {
      y: [0, -8, 0],
      scale: [1, 1.015, 1],
      filter: [sh(8, 0.3), sh(22, 0.7), sh(8, 0.3)],
    },
    bounce: {
      y: [0, -12, 0],
      scale: [1, 1.02, 1],
      filter: [sh(6, 0.2), sh(18, 0.55), sh(6, 0.2)],
    },
    breathe: {
      y: [0, -2, 0, -1, 0],
      scale: [1, 1.005, 1, 1.003, 1],
      opacity: [1, 1, 1, 0.88, 1],
      filter: [sh(4, 0.2), sh(12, 0.5), sh(4, 0.2), sh(8, 0.35), sh(4, 0.2)],
    },
    mystical: {
      y: [0, -10, 0],
      scale: [1, 1.02, 1],
      filter: [sh(8, 0.3), sh(20, 0.6), sh(8, 0.3)],
    },
  };
}

const LOOP_TRANSITIONS: Record<string, { duration: number; repeat: number; ease: Easing }> = {
  float: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  "float-strong": { duration: 3, repeat: Infinity, ease: "easeInOut" },
  bounce: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  breathe: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  mystical: { duration: 4, repeat: Infinity, ease: "easeInOut" },
};

const ENTER_MOTION: Record<string, Record<string, number[]>> = {
  smile: { scale: [0.97, 1.01, 1], y: [3, -1, 0] },
  serious: { scale: [1, 0.98, 1], y: [0, 2, 0] },
  surprised: { scale: [0.97, 1.02, 1], y: [4, -2, 0] },
  wink: { scale: [0.97, 1.01, 1], y: [3, -2, 0] },
};

// 캐릭터별 입장 시그니처 애니메이션 (처음 등장 시 1회만 재생)
interface EntranceConfig {
  initial: TargetAndTransition;
  transition: Transition;
}

const CHAR_ENTRANCE: Record<CharacterId, EntranceConfig> = {
  arcana:  { initial: { y: 60, opacity: 0 },                transition: { duration: 0.85, ease: "easeOut" } },
  miko:    { initial: { opacity: 0, scale: 0.95 },           transition: { duration: 1.1, ease: "easeOut" } },
  seonhwa: { initial: { x: -35, opacity: 0 },               transition: { duration: 0.75, ease: "easeOut" } },
  hoshi:   { initial: { x: 65, opacity: 0, scale: 0.82 },   transition: { type: "spring", stiffness: 180, damping: 12 } },
  luna:    { initial: { y: -25, opacity: 0 },               transition: { duration: 0.95, ease: "easeOut" } },
  rei:     { initial: { opacity: 0 },                        transition: { duration: 1.3, ease: "easeInOut" } },
  cairn:   { initial: { y: 35, opacity: 0, scale: 0.94 },   transition: { duration: 0.85, ease: "easeOut" } },
  zero:    { initial: { opacity: 0, rotate: -3 },            transition: { duration: 1.5, ease: "easeOut" } },
  haru:    { initial: { y: 45, opacity: 0 },                transition: { type: "spring", stiffness: 200, damping: 16 } },
  ren:     { initial: { x: -25, opacity: 0, scale: 0.97 },  transition: { duration: 1.05, ease: "easeOut" } },
  lix:     { initial: { rotate: -9, scale: 0.8, opacity: 0 }, transition: { duration: 0.5, ease: "backOut" } },
  ethan:   { initial: { y: 18, opacity: 0 },                transition: { duration: 0.95, ease: "easeOut" } },
};

// 이미 입장 애니메이션을 재생한 캐릭터 ID 추적 (모듈 레벨 — SSR 비간섭, 클라이언트 세션 유지)
const enteredChars = new Set<CharacterId>();

interface SpriteAnimatorProps {
  readonly characterId: CharacterId;
  readonly mood: Mood;
  readonly idleAnimation?: IdleAnimationType;
  readonly primaryColor?: string;
  readonly onAnimationEnd?: () => void;
  readonly className?: string;
}

export const SpriteAnimator = React.memo(function SpriteAnimator({ characterId, mood, idleAnimation = "float", primaryColor, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const config = MOOD_CONFIGS[mood];
  const fileName = MOOD_TO_FILE[mood];
  const imageSrc = `/images/characters/${characterId}/nukki/${fileName}.png`;

  // 첫 등장이면 입장 시그니처, 이후 무드 전환은 표준 페이드
  const entrance = CHAR_ENTRANCE[characterId];
  const isFirstEntrance = !enteredChars.has(characterId);
  const motionInitial: TargetAndTransition = isFirstEntrance && entrance ? entrance.initial : { opacity: 0 };
  const mountTransition: Transition = isFirstEntrance && entrance ? entrance.transition : { duration: 0.55, ease: "easeInOut" };

  useEffect(() => {
    enteredChars.add(characterId);
  }, [characterId]);

  useEffect(() => {
    if (config.loop || !onAnimationEnd) return;
    const timer = setTimeout(() => { onAnimationEnd(); }, config.displayDuration);
    return () => clearTimeout(timer);
  }, [mood, config, onAnimationEnd]);

  const isLooping = config.loop;
  const activeLoopKey = mood === "default" ? idleAnimation : mood;
  const loopMotion = useMemo(() => buildLoopMotion(primaryColor ?? "#a78bfa"), [primaryColor]);
  const loopAnim = loopMotion[activeLoopKey] ?? loopMotion.float;
  const loopTransition = LOOP_TRANSITIONS[activeLoopKey] ?? LOOP_TRANSITIONS.float;
  const enterAnim = ENTER_MOTION[mood];

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="sync">
        <motion.div
          key={`${characterId}-${mood}`}
          initial={motionInitial}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          exit={{ opacity: 0 }}
          transition={mountTransition}
          className="absolute inset-0"
        >
          {!isLooping && enterAnim ? (
            <motion.div animate={enterAnim} transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-full h-full">
              <Image src={imageSrc} alt="" fill sizes="50vw"
                className="object-contain object-center" priority />
            </motion.div>
          ) : (
            <motion.div
              animate={loopAnim}
              transition={loopTransition}
              className="relative w-full h-full"
            >
              <Image src={imageSrc} alt="" fill sizes="50vw"
                className="object-contain object-center" priority />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
SpriteAnimator.displayName = "SpriteAnimator";
