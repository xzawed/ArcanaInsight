"use client";

import { motion } from "framer-motion";
import { ChatMessage } from "@/types/session";

interface ChatBubbleProps { readonly message: ChatMessage; }

export function ChatBubble({ message }: ChatBubbleProps) {
  const isCharacter = message.role === "character";
  const isSystem = message.role === "system";
  if (isSystem) {
    return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-arcana-muted text-xs py-2">{message.content}</motion.div>);
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCharacter ? "justify-start" : "justify-end"} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isCharacter ? "bg-arcana-card border border-arcana-border text-arcana-text rounded-tl-sm"
          : "bg-arcana-purple/20 text-arcana-text rounded-tr-sm"}`}>
        {isCharacter && <span className="text-arcana-purple text-xs font-display font-bold block mb-1">{message.mood === "mystical" ? "✨ " : ""}캐릭터</span>}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </motion.div>
  );
}
