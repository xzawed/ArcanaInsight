"use client";

import { useState, useEffect } from "react";

interface ParticleOverlayProps {
  density?: "low" | "medium" | "high";
  className?: string;
}

interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
}

const DENSITY_COUNT = { low: 12, medium: 20, high: 32 };

const COLORS = [
  "rgba(212, 175, 55, 0.5)",
  "rgba(139, 92, 246, 0.4)",
  "rgba(255, 255, 255, 0.3)",
  "rgba(99, 102, 241, 0.3)",
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 3,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 4}s`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

export function ParticleOverlay({ density = "medium", className = "" }: ParticleOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>(() => generateParticles(DENSITY_COUNT[density]));

  useEffect(() => {
    setParticles(generateParticles(DENSITY_COUNT[density]));
  }, [density]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-[particle-float_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            "--delay": p.delay,
            "--dur": p.duration,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
