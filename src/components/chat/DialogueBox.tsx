"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types/session";

interface DialogueBoxProps {
  messages: ChatMessage[];
  characterName?: string;
  isTyping?: boolean;
  className?: string;
}

export function DialogueBox({ messages, characterName = "아르카나", isTyping = false, className = "" }: DialogueBoxProps) {
  const lastMessage = messages.filter((m) => m.role === "character").at(-1);
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const prevContentRef = useRef("");

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.content === prevContentRef.current) return;
    prevContentRef.current = lastMessage.content;
    setDisplayedText("");
    setIsComplete(false);

    let index = 0;
    const interval = setInterval(() => {
      if (index < lastMessage.content.length) {
        setDisplayedText(lastMessage.content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [lastMessage]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-arcana-card/85 backdrop-blur-md border-t-2 border-arcana-purple/60 rounded-t-xl" />
      <div className="relative z-10 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="px-3 py-0.5 bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full">
            <span className="text-white text-xs font-serif font-bold">{characterName}</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-arcana-purple/40 to-transparent" />
        </div>
        <div className="min-h-[3.5rem] md:min-h-[4rem]">
          <AnimatePresence mode="wait">
            {isTyping ? (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 py-2"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-arcana-purple"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            ) : lastMessage ? (
              <motion.p
                key={lastMessage.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-arcana-text text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans"
              >
                {displayedText}
                {!isComplete && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-arcana-purple font-bold"
                  >
                    |
                  </motion.span>
                )}
              </motion.p>
            ) : (
              <p className="text-arcana-muted text-sm italic">카드를 선택하면 상담이 시작됩니다...</p>
            )}
          </AnimatePresence>
        </div>
        {isComplete && lastMessage && (
          <div className="flex justify-end mt-1">
            <motion.span
              animate={{ y: [0, 4, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-arcana-purple text-xs"
            >
              ▼
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}
