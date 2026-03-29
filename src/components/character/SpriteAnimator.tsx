"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mood } from "@/types/character";

interface SpriteConfig {
  src: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  duration: number;
  loop: boolean;
}

const SPRITE_CONFIGS: Record<Mood, SpriteConfig> = {
  default: { src: "/images/characters/arcana/sprites/idle.png", frameCount: 6, frameWidth: 512, frameHeight: 768, duration: 1200, loop: true },
  smile: { src: "/images/characters/arcana/sprites/happy.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  serious: { src: "/images/characters/arcana/sprites/serious.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  surprised: { src: "/images/characters/arcana/sprites/surprised.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 600, loop: false },
  wink: { src: "/images/characters/arcana/sprites/happy.png", frameCount: 4, frameWidth: 512, frameHeight: 768, duration: 800, loop: false },
  mystical: { src: "/images/characters/arcana/sprites/mystical.png", frameCount: 8, frameWidth: 512, frameHeight: 768, duration: 1600, loop: true },
};

interface SpriteAnimatorProps {
  mood: Mood;
  onAnimationEnd?: () => void;
  className?: string;
}

export function SpriteAnimator({ mood, onAnimationEnd, className = "" }: SpriteAnimatorProps) {
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);

  const config = SPRITE_CONFIGS[mood];

  useEffect(() => {
    frameRef.current = 0;
    lastTimeRef.current = 0;

    const frameDuration = config.duration / config.frameCount;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        frameRef.current++;
        lastTimeRef.current = timestamp;

        if (frameRef.current >= config.frameCount) {
          if (config.loop) {
            frameRef.current = 0;
          } else {
            frameRef.current = config.frameCount - 1;
            onAnimationEnd?.();
            return;
          }
        }

        if (containerRef.current) {
          const offsetX = -(frameRef.current * config.frameWidth);
          containerRef.current.style.backgroundPosition = `${offsetX}px 0`;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mood, config, onAnimationEnd]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          ref={containerRef}
          className={`${className}`}
          style={{
            width: config.frameWidth,
            height: config.frameHeight,
            backgroundImage: `url(${config.src})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 0",
            backgroundSize: `${config.frameWidth * config.frameCount}px ${config.frameHeight}px`,
            imageRendering: "auto",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
