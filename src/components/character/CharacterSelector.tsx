"use client";

import { motion } from "framer-motion";
import { characters } from "@/data/characters";
import { CharacterConfig } from "@/types/character";

interface CharacterSelectorProps { onSelect: (character: CharacterConfig) => void; }

export function CharacterSelector({ onSelect }: CharacterSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {characters.map((character, index) => (
        <motion.button key={character.id}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => character.unlocked && onSelect(character)}
          disabled={!character.unlocked}
          className={`relative group rounded-2xl p-4 border transition-all ${
            character.unlocked ? "bg-arcana-card border-arcana-border hover:border-arcana-purple cursor-pointer"
              : "bg-arcana-surface border-arcana-border/50 cursor-not-allowed opacity-60"}`}>
          <div className="w-full aspect-[3/4] rounded-xl bg-arcana-surface mb-3 flex items-center justify-center overflow-hidden">
            {character.unlocked ? (
              <motion.div whileHover={{ scale: 1.05 }} className="text-5xl">
                {character.serviceType === "tarot" ? "🔮" : character.serviceType === "shinjeom" ? "⛩️"
                  : character.serviceType === "saju" ? "🌸" : "⭐"}
              </motion.div>
            ) : (<div className="text-arcana-muted text-4xl">?</div>)}
          </div>
          <h3 className="font-display font-bold text-sm">{character.unlocked ? character.name : "???"}</h3>
          <p className="text-arcana-muted text-xs mt-1">{character.unlocked ? character.nameJp : "Coming Soon"}</p>
          {!character.unlocked && (
            <div className="absolute inset-0 rounded-2xl bg-arcana-bg/40 flex items-center justify-center">
              <span className="text-arcana-muted text-xs bg-arcana-surface px-3 py-1 rounded-full">Coming Soon</span>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
