"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CharacterConfig, Mood } from "@/types/character";

interface CharacterDisplayProps {
  character: CharacterConfig;
  mood: Mood;
  className?: string;
}

export function CharacterDisplay({ character, mood, className = "" }: CharacterDisplayProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-gradient-radial from-arcana-purple/10 to-transparent rounded-full blur-3xl" />
      <AnimatePresence mode="wait">
        <motion.div key={`${character.id}-${mood}`}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="relative">
          <motion.div animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-48 h-64 md:w-64 md:h-80 rounded-2xl bg-arcana-card border border-arcana-border flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-2">
                {mood === "smile" ? "😊" : mood === "serious" ? "🔮" : mood === "surprised" ? "😲"
                  : mood === "wink" ? "😉" : mood === "mystical" ? "✨" : "🌙"}
              </p>
              <p className="text-arcana-purple font-display font-bold">{character.name}</p>
              <p className="text-arcana-muted text-xs">{character.nameJp}</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
