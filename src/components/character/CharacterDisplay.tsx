"use client";

import { useCallback } from "react";
import { CharacterConfig, Mood } from "@/types/character";
import { SpriteAnimator } from "./SpriteAnimator";
import { useCharacterStore } from "@/hooks/useCharacter";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  className?: string;
}

export function CharacterDisplay({ character, mood, className = "" }: CharacterDisplayProps) {
  const { setMood } = useCharacterStore();

  const handleAnimationEnd = useCallback(() => {
    if (mood !== "default" && mood !== "mystical") {
      setMood("default");
    }
  }, [mood, setMood]);

  return (
    <div className={`relative flex items-end justify-start ${className}`}>
      <div className="absolute bottom-0 left-1/4 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />
      <div className="relative z-10 max-w-[280px] max-h-[420px] overflow-hidden">
        <SpriteAnimator
          mood={mood}
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full scale-100 origin-bottom"
        />
      </div>
      <div className="absolute bottom-2 left-2 z-20">
        <span className="text-arcana-purple font-serif font-bold text-sm drop-shadow-lg">
          {character.name}
        </span>
        <span className="text-arcana-muted text-xs ml-1">{character.nameJp}</span>
      </div>
    </div>
  );
}
