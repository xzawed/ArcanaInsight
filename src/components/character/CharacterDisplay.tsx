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
    <div className={`relative flex items-end justify-center ${className}`}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 md:w-64 md:h-64 bg-gradient-radial from-arcana-purple/20 to-transparent rounded-full blur-3xl" />
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
          onAnimationEnd={handleAnimationEnd}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
