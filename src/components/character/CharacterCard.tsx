"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CharacterConfig } from "@/types/character";

interface CharacterCardProps {
  character: CharacterConfig;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function CharacterCard({ character, isSelected, onClick, index }: CharacterCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative bg-arcana-card/70 backdrop-blur-sm border-2 rounded-2xl p-4 text-center transition-all overflow-hidden group ${
        isSelected
          ? "border-arcana-purple shadow-lg shadow-arcana-purple/20"
          : "border-arcana-border hover:border-arcana-purple/50"
      }`}
    >
      <div className="relative w-full aspect-[2/3] mb-3 overflow-hidden rounded-xl">
        <Image
          src={`/images/characters/${character.id}/nukki/idle.png`}
          alt={character.name}
          fill
          className="object-cover object-top"
        />
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-arcana-card/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-arcana-card/90 to-transparent" />
        <div className="absolute top-0 bottom-0 left-0 w-1/5 bg-gradient-to-r from-arcana-card/50 to-transparent" />
        <div className="absolute top-0 bottom-0 right-0 w-1/5 bg-gradient-to-l from-arcana-card/50 to-transparent" />
      </div>

      <h3 className="font-serif font-bold text-sm md:text-base group-hover:text-arcana-purple transition-colors">
        {character.name}
      </h3>
      <p className="text-arcana-muted text-[11px] mt-0.5">{character.nameJp}</p>
      <p className="text-arcana-muted text-xs md:text-sm mt-1.5 line-clamp-2 leading-relaxed">
        {character.personality}
      </p>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_0_30px_rgba(139,92,246,0.2)]"
        />
      )}
    </motion.button>
  );
}
