"use client";

import React, { useEffect, useRef } from "react";
import { motion, useAnimation, type TargetAndTransition, type Transition } from "framer-motion";
import { Mood, EffectTheme } from "@/types/character";

interface CharacterAnimationLayerProps {
  mood: Mood;
  effectTheme: EffectTheme;
  children: React.ReactNode;
}

// ─── A. EyeBlinkLayer ────────────────────────────────────────────────────────
function EyeBlinkLayer({ mood }: { readonly mood: Mood }) {
  const controls = useAnimation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (mood !== "default" && mood !== "mystical") return;

    mountedRef.current = true;

    async function scheduleBlink() {
      if (!mountedRef.current) return;
      // Math.random() inside effect — SSR safe
      const delay = 4000 + Math.random() * 3000; // 4000~7000ms
      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        // opacity 0 → 0.15 → 0 in 150ms total
        await controls.start({ opacity: 0.15, transition: { duration: 0.07 } });
        if (!mountedRef.current) return;
        await controls.start({ opacity: 0, transition: { duration: 0.08 } });
        if (mountedRef.current) scheduleBlink();
      }, delay);
    }

    scheduleBlink();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mood, controls]);

  if (mood !== "default" && mood !== "mystical") return null;

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#000000",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ─── B. MoodAnimLayer ────────────────────────────────────────────────────────
interface MoodAnimConfig {
  animate: TargetAndTransition;
  transition: Transition;
}

const MOOD_ANIM_MAP: Partial<Record<Mood, MoodAnimConfig>> = {
  smile: {
    animate: { scale: [1, 1.02, 1] },
    transition: { duration: 0.6, ease: "easeInOut", times: [0, 0.5, 1] },
  },
  serious: {
    animate: { y: -3 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  surprised: {
    animate: { scale: [1, 1.05, 0.98, 1] },
    transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.35, 0.7, 1] },
  },
  wink: {
    animate: { scale: [1, 1.02, 1] },
    transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.5, 1] },
  },
};

function CharacterMotionLayer({
  mood,
  children,
}: {
  readonly mood: Mood;
  readonly children: React.ReactNode;
}) {
  const config = MOOD_ANIM_MAP[mood];

  return (
    <motion.div
      key={`character-motion-${mood}`}
      animate={config?.animate}
      transition={config?.transition}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        zIndex: 2,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── C. GlowOverlay ──────────────────────────────────────────────────────────
function GlowOverlay({ mood, effectTheme }: { readonly mood: Mood; readonly effectTheme: EffectTheme }) {
  if (mood !== "default" && mood !== "mystical") return null;

  const duration = mood === "mystical" ? 2 : 4;

  return (
    <motion.div
      animate={{ opacity: [0.08, 0.18, 0.08] }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at center, ${effectTheme.primary}55 0%, ${effectTheme.primary}22 50%, transparent 75%)`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function CharacterAnimationLayer({ mood, effectTheme, children }: Readonly<CharacterAnimationLayerProps>) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GlowOverlay mood={mood} effectTheme={effectTheme} />
      <CharacterMotionLayer mood={mood}>{children}</CharacterMotionLayer>
      <EyeBlinkLayer mood={mood} />
    </div>
  );
}
