"use client";

import { motion } from "framer-motion";
import { ReadingText } from "@/components/common/ReadingText";

const COLOR = {
  purple: { bg: "bg-arcana-purple/10", border: "border-arcana-purple/30", text: "text-arcana-purple" },
  gold:   { bg: "bg-arcana-gold/5",    border: "border-arcana-gold/30",   text: "text-arcana-gold" },
  card:   { bg: "bg-arcana-card/70",   border: "border-arcana-border",    text: "text-arcana-gold" },
} as const;

interface ResultTextCardProps {
  text: string;
  emoji: string;
  label: string;
  delay?: number;
  colorScheme?: keyof typeof COLOR;
  className?: string;
}

export function ResultTextCard({ text, emoji, label, delay = 0, colorScheme = "purple", className }: ResultTextCardProps) {
  const c = COLOR[colorScheme];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`${c.bg} backdrop-blur-sm ${c.border} rounded-2xl p-4 md:p-5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <span className={`${c.text} font-serif font-bold text-base md:text-lg`}>{label}</span>
      </div>
      <ReadingText text={text} />
    </motion.div>
  );
}
