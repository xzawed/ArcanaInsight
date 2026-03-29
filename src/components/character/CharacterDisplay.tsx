"use client";

import { useCallback } from "react";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  size?: "normal" | "large";
  className?: string;
}

export function CharacterDisplay({ character, mood, size = "normal", className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();

  const handleAnimationEnd = useCallback(() => {
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  const sizeClasses = size === "large"
    ? "max-w-[500px] max-h-[70vh]"
    : "max-w-[280px] max-h-[420px]";

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />
      <div className={`relative z-10 ${sizeClasses} overflow-hidden`}
        style={{ mask: "linear-gradient(to bottom, transparent 0%, black 10%, black 70%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)", maskComposite: "intersect", WebkitMask: "linear-gradient(to bottom, transparent 0%, black 10%, black 70%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)", WebkitMaskComposite: "destination-in" }}
      >
        <SpriteAnimator
          characterId={character.id}
          mood={mood}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full scale-100 origin-bottom"
        />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-center">
        <span className="text-arcana-purple font-serif font-bold text-sm drop-shadow-lg">
          {character.name}
        </span>
        <span className="text-arcana-muted text-xs ml-1">{character.nameJp}</span>
      </div>
    </div>
  );
}
