"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useThemeEffectVars } from "./ThemeEffectEngine";

// 클릭 파티클 고정 오프셋 — SSR 안전, Math.random 미사용
const CLICK_PARTICLE_OFFSETS = [
  { dx: 0,   dy: -36, size: 5 },
  { dx: 34,  dy: -18, size: 4 },
  { dx: 34,  dy: 18,  size: 3 },
  { dx: 0,   dy: 36,  size: 5 },
  { dx: -34, dy: 18,  size: 4 },
  { dx: -34, dy: -18, size: 3 },
] as const;

interface ClickParticle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

let particleIdCounter = 0;

/** 클릭 위치 기준으로 테마 색상 파티클 6개를 방사하는 오버레이 */
export function InteractionClickParticles() {
  const [particles, setParticles] = useState<ClickParticle[]>([]);
  const effectVars = useThemeEffectVars();
  const shouldReduceMotion = useReducedMotion();

  const removeParticle = useCallback(
    (id: number) => setParticles((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handleClick = (e: MouseEvent) => {
      const id = particleIdCounter++;
      setParticles((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(removeParticle, 900, id);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [shouldReduceMotion, removeParticle]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden
      data-testid="interaction-click-particles"
    >
      <AnimatePresence>
        {particles.map((particle) =>
          CLICK_PARTICLE_OFFSETS.map((offset, i) => (
            <motion.div
              key={`${particle.id}-${i}`}
              className="absolute rounded-full"
              style={{
                left: particle.x,
                top: particle.y,
                width: offset.size,
                height: offset.size,
                background: effectVars["--theme-particle-color"],
                boxShadow: `0 0 ${offset.size * 3}px ${effectVars["--theme-glow-color"]}`,
                translateX: "-50%",
                translateY: "-50%",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: offset.dx, y: offset.dy, opacity: 0, scale: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )),
        )}
      </AnimatePresence>
    </div>
  );
}

