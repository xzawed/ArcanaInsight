"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { CharacterAuraLayer } from "./CharacterAuraLayer";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  readonly character: CharacterConfig;
  readonly mood: Mood;
  readonly className?: string;
}

// mood별 버스트 링 색상
const BURST_COLOR: Record<Mood, string> = {
  default:   "rgba(139,92,246,0.7)",
  smile:     "rgba(212,175,55,0.8)",
  mystical:  "rgba(139,92,246,0.9)",
  serious:   "rgba(99,102,241,0.7)",
  surprised: "rgba(251,146,60,0.8)",
  wink:      "rgba(244,114,182,0.8)",
};

function GlowBurstRing({ mood }: { readonly mood: Mood }) {
  const color = BURST_COLOR[mood];
  return (
    <motion.div
      className="absolute pointer-events-none z-20"
      style={{
        inset: "-5%",
        borderRadius: "45%",
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 16px ${color}, 0 0 32px ${color}`,
      }}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 2.5, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
  );
}

export function CharacterDisplay({ character, mood, className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isMountedRef = useRef(false);

  // mood 변경 시 isTransitioning true → 500ms 후 false (첫 마운트 스킵)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const t1 = setTimeout(() => setIsTransitioning(true), 0);
    const t2 = setTimeout(() => setIsTransitioning(false), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [mood]);

  const handleAnimationEnd = useCallback(() => {
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* 기존 하단 ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 md:w-64 md:h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />

      {/* CharacterAuraLayer — overflow-hidden 밖 */}
      <CharacterAuraLayer mood={mood} isTransitioning={isTransitioning} />

      {/* GlowBurstRing — mood 전환 시 1회 재생, overflow-hidden 밖 */}
      <AnimatePresence>
        {isTransitioning && (
          <GlowBurstRing key={`burst-${mood}`} mood={mood} />
        )}
      </AnimatePresence>

      {/* 마스크 div (기존 유지) */}
      <div
        className="relative z-10 w-full h-full overflow-hidden"
        style={{
          WebkitMaskImage: [
            "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
            "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
            "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
            "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
          ].join(", "),
          WebkitMaskComposite: "destination-in, destination-in, destination-in" as string,
          maskImage: [
            "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
            "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
            "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
            "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
          ].join(", "),
          maskComposite: "intersect, intersect, intersect",
        }}
      >
        <SpriteAnimator
          characterId={character.id}
          mood={mood}
          idleAnimation={character.idleAnimation}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
