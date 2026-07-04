"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useThemeStore } from "@/hooks/useTheme";
import {
  THEME_EFFECTS,
  createParticle,
  stepParticle,
  drawParticle,
  type Particle,
  type ThemeIdForParticle,
} from "@/lib/particle-engine";

type Density = "low" | "medium" | "high";

interface CanvasParticleLayerProps {
  readonly density?: Density;
  readonly className?: string;
}

const DENSITY_TOTAL: Record<Density, number> = {
  low:    30,
  medium: 60,
  high:  100,
};

const VALID_THEMES = new Set<string>([
  "midnight", "dawn", "sunset", "spring", "summer", "autumn", "winter",
]);

function buildPool(theme: string, density: Density, w: number, h: number): Particle[] {
  const themeId = (VALID_THEMES.has(theme) ? theme : "midnight") as ThemeIdForParticle;
  const specs = THEME_EFFECTS[themeId];
  const totalFrac = specs.reduce((sum, s) => sum + s.frac, 0);
  const total = DENSITY_TOTAL[density];

  return specs.flatMap(spec => {
    const count = Math.max(2, Math.round(total * (spec.frac / totalFrac)));
    return Array.from({ length: count }, () => createParticle(spec, w, h));
  });
}

export function CanvasParticleLayer({ density = "medium", className = "" }: CanvasParticleLayerProps) {
  const { activeTheme } = useThemeStore();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  // Canvas DPR resize — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Rebuild particle pool when theme or density changes
  useEffect(() => {
    if (shouldReduceMotion) return;
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;
    particlesRef.current = buildPool(activeTheme, density, w, h);
  }, [activeTheme, density, shouldReduceMotion]);

  // RAF animation loop
  useEffect(() => {
    if (shouldReduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    mountedRef.current = true;

    const tick = () => {
      if (!mountedRef.current) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const ps = particlesRef.current;
      for (const p of ps) {
        stepParticle(p, w, h);
        drawParticle(ctx, p);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      role="presentation"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
