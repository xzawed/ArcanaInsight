"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TypingDialogueProps {
  readonly text: string; speed?: number; onComplete?: () => void;
  readonly className?: string; isStreaming?: boolean;
}

export function TypingDialogue({ text, speed = 30, onComplete, className = "", isStreaming = false }: TypingDialogueProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (isStreaming) { setDisplayedText(text); return; }
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;
    setDisplayedText(""); setIsComplete(false);
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) { setDisplayedText(text.slice(0, index + 1)); index++; }
      else { clearInterval(interval); setIsComplete(true); onComplete?.(); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete, isStreaming]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`relative ${className}`}>
      <p className="leading-relaxed whitespace-pre-wrap">
        {displayedText}
        {!isComplete && !isStreaming && (
          <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}
            className="text-arcana-purple">|</motion.span>
        )}
      </p>
    </motion.div>
  );
}
