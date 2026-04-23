"use client";

import { useState, useEffect } from "react";
import { ParticleStyle } from "@/types/character";

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

interface ParticleOverlayProps {
  readonly density?: "low" | "medium" | "high";
  readonly colorScheme?: ColorScheme;
  readonly particleStyle?: ParticleStyle;
  readonly className?: string;
}

interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
  rotation: number;
}

const DENSITY_COUNT = { low: 12, medium: 20, high: 32 };

const DEFAULT_COLORS = [
  "rgba(212, 175, 55, 0.5)",
  "rgba(139, 92, 246, 0.4)",
  "rgba(255, 255, 255, 0.3)",
  "rgba(99, 102, 241, 0.3)",
];

function hexToRgba(hex: string, alpha: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return `rgba(212,175,55,${alpha})`;
  return `rgba(${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}, ${alpha})`;
}

function buildColors(colorScheme?: ColorScheme): string[] {
  if (!colorScheme) return DEFAULT_COLORS;
  return [
    hexToRgba(colorScheme.primary, 0.6),
    hexToRgba(colorScheme.secondary, 0.5),
    hexToRgba(colorScheme.accent, 0.5),
    hexToRgba(colorScheme.primary, 0.35),
  ];
}

function generateParticles(count: number, colors: string[]): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 3,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 4}s`,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.floor(Math.random() * 360),
  }));
}

function getAnimationClass(style: ParticleStyle | undefined): string {
  switch (style) {
    case "flame":     return "animate-[particle-flame_var(--dur)_ease-in_var(--delay)_infinite]";
    case "petal":     return "animate-[particle-petal_var(--dur)_ease-in-out_var(--delay)_infinite]";
    case "snowflake": return "animate-[particle-snowflake_var(--dur)_linear_var(--delay)_infinite]";
    case "lightning": return "animate-[particle-lightning_var(--dur)_ease-in-out_var(--delay)_infinite]";
    case "bubble":    return "animate-[particle-bubble_var(--dur)_ease-out_var(--delay)_infinite]";
    default:          return "animate-[particle-float_var(--dur)_ease-in-out_var(--delay)_infinite]";
  }
}

function getParticleInlineStyle(style: ParticleStyle | undefined, p: Particle): React.CSSProperties {
  const base = {
    left: p.left, top: p.top,
    "--delay": p.delay, "--dur": p.duration,
  } as React.CSSProperties;

  switch (style) {
    case "flame":
      return { ...base, width: p.size * 0.8, height: p.size * 2.5,
        borderRadius: "40% 40% 60% 60%", backgroundColor: p.color,
        boxShadow: `0 0 ${p.size * 3}px ${p.color}` };
    case "petal":
      return { ...base, width: p.size * 2.5, height: p.size,
        borderRadius: "50%", backgroundColor: p.color,
        transform: `rotate(${p.rotation}deg)`,
        boxShadow: `0 0 ${p.size}px ${p.color}` };
    case "star":
      return { ...base, width: p.size * 1.5, height: p.size * 1.5,
        borderRadius: "0", backgroundColor: p.color,
        transform: `rotate(45deg)`,
        boxShadow: `0 0 ${p.size * 3}px ${p.color}` };
    case "snowflake":
      return { ...base, width: p.size, height: p.size,
        borderRadius: "50%", backgroundColor: p.color,
        boxShadow: `0 0 ${p.size * 2}px ${p.color}` };
    case "lightning":
      return { ...base, width: Math.max(p.size * 0.5, 1), height: p.size * 5,
        borderRadius: "2px", backgroundColor: p.color,
        boxShadow: `0 0 ${p.size * 4}px ${p.color}` };
    case "bubble":
      return { ...base, width: p.size * 5, height: p.size * 5,
        borderRadius: "50%", backgroundColor: "transparent",
        border: `1px solid ${p.color}`,
        boxShadow: `0 0 ${p.size * 2}px ${p.color} inset` };
    case "rune":
      return { ...base, width: p.size * 1.5, height: p.size * 1.5,
        borderRadius: "50%", backgroundColor: p.color,
        boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color}` };
    default: // sparkle
      return { ...base, width: p.size, height: p.size,
        borderRadius: "50%", backgroundColor: p.color,
        boxShadow: `0 0 ${p.size * 2}px ${p.color}` };
  }
}

export function ParticleOverlay({ density = "medium", colorScheme, particleStyle, className = "" }: ParticleOverlayProps) {
  const primaryColor = colorScheme?.primary;
  const secondaryColor = colorScheme?.secondary;
  const accentColor = colorScheme?.accent;

  const [particles, setParticles] = useState<Particle[]>(() =>
    generateParticles(DENSITY_COUNT[density], buildColors(colorScheme))
  );

  useEffect(() => {
    setParticles(generateParticles(DENSITY_COUNT[density], buildColors(colorScheme)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, primaryColor, secondaryColor, accentColor, particleStyle]); // NOSONAR

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${getAnimationClass(particleStyle)}`}
          style={getParticleInlineStyle(particleStyle, p)}
        />
      ))}
    </div>
  );
}
