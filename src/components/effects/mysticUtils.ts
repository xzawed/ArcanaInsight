import type { CSSProperties } from "react";
import type { AtmosphereParticle } from "./themeAtmosphere";

export function particleStyle(particle: AtmosphereParticle): CSSProperties {
  const base: CSSProperties = {
    left: `${particle.x}%`,
    top: `${particle.y}%`,
    width: particle.size,
    height: particle.size,
    opacity: particle.opacity,
  };

  if (particle.kind === "mist") {
    return {
      ...base,
      background: particle.color ?? "rgba(255, 255, 255, 0.22)",
      borderRadius: "999px",
      filter: "blur(18px)",
    };
  }

  if (particle.kind === "petal") {
    return {
      ...base,
      height: particle.size * 0.62,
      background: "linear-gradient(135deg, rgba(252,231,243,0.82), rgba(244,114,182,0.5))",
      borderRadius: "78% 22% 76% 24%",
      transform: `rotate(${particle.rotate ?? 0}deg)`,
      boxShadow: "0 0 12px rgba(249,168,212,0.18)",
    };
  }

  if (particle.kind === "leaf") {
    return {
      ...base,
      height: particle.size * 0.55,
      background: particle.color ?? "rgba(217, 119, 6, 0.62)",
      borderRadius: "90% 8% 86% 12%",
      transform: `rotate(${particle.rotate ?? 0}deg)`,
      boxShadow: "0 0 14px rgba(245,158,11,0.12)",
    };
  }

  if (particle.kind === "firefly") {
    return {
      ...base,
      background: "rgba(253, 224, 71, 0.92)",
      borderRadius: "999px",
      boxShadow: "0 0 10px rgba(253,224,71,0.85), 0 0 24px rgba(56,189,248,0.26)",
    };
  }

  if (particle.kind === "ember") {
    return {
      ...base,
      background: "rgba(251, 146, 60, 0.9)",
      borderRadius: "999px",
      boxShadow: "0 0 12px rgba(251,146,60,0.75)",
    };
  }

  if (particle.kind === "snow") {
    return {
      ...base,
      background: "rgba(240, 249, 255, 0.88)",
      borderRadius: "999px",
      boxShadow: "0 0 8px rgba(191,219,254,0.42)",
    };
  }

  if (particle.kind === "dust") {
    return {
      ...base,
      background: "rgba(253, 224, 171, 0.78)",
      borderRadius: "999px",
      boxShadow: "0 0 10px rgba(251,146,60,0.32)",
    };
  }

  if (particle.kind === "rune") {
    return {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: "auto",
      height: "auto",
      opacity: particle.opacity,
      background: "transparent",
      fontSize: particle.size,
      color: "var(--theme-glow-color, rgba(167,139,250,0.6))",
      textShadow: "0 0 10px var(--theme-glow-color, rgba(167,139,250,0.4))",
      userSelect: "none",
      lineHeight: 1,
    };
  }

  if (particle.kind === "meteor") {
    return {
      ...base,
      width: particle.size * 6,
      height: particle.size * 0.35,
      background: `linear-gradient(90deg, transparent, ${particle.color ?? "rgba(200,200,255,0.85)"})`,
      borderRadius: "999px",
      transform: `rotate(${particle.rotate ?? 45}deg)`,
      transformOrigin: "left center",
      filter: `blur(${Math.round(particle.size * 0.2)}px)`,
    };
  }

  if (particle.kind === "butterfly") {
    return {
      ...base,
      width: particle.size * 2.4,
      height: particle.size * 1.1,
      background: particle.color ?? "linear-gradient(135deg, rgba(240,171,252,0.65), rgba(251,191,36,0.4))",
      borderRadius: "0 100% 0 100% / 100% 0 100% 0",
      transform: `rotate(${particle.rotate ?? 0}deg)`,
      filter: `blur(${Math.round(particle.size * 0.08)}px)`,
    };
  }

  if (particle.kind === "hexagon") {
    return {
      ...base,
      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      background: particle.color ?? "rgba(56,189,248,0.36)",
      filter: `blur(${Math.round(particle.size * 0.06)}px)`,
    };
  }

  if (particle.kind === "sparkle") {
    return {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: "auto",
      height: "auto",
      opacity: particle.opacity,
      background: "transparent",
      fontSize: particle.size,
      color: particle.color ?? "rgba(255,255,255,0.88)",
      textShadow: `0 0 8px ${particle.color ?? "rgba(255,255,255,0.5)"}`,
      userSelect: "none",
      lineHeight: 1,
    };
  }

  if (particle.kind === "lantern") {
    return {
      ...base,
      width: particle.size * 0.65,
      height: particle.size * 1.3,
      background: particle.color ?? "rgba(251,146,60,0.65)",
      borderRadius: "40% 40% 50% 50% / 30% 30% 50% 50%",
      boxShadow: `0 0 ${particle.size * 2}px ${particle.color ?? "rgba(251,146,60,0.55)"}, 0 0 ${particle.size * 4}px ${particle.color ?? "rgba(251,146,60,0.3)"}`,
      filter: `blur(${Math.round(particle.size * 0.04)}px)`,
    };
  }

  if (particle.kind === "snowflake") {
    return {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: "auto",
      height: "auto",
      opacity: particle.opacity,
      background: "transparent",
      fontSize: particle.size,
      color: "rgba(191,219,254,0.82)",
      textShadow: "0 0 10px rgba(147,197,253,0.6)",
      userSelect: "none",
      lineHeight: 1,
    };
  }

  return {
    ...base,
    background: "rgba(255, 255, 255, 0.88)",
    borderRadius: "999px",
    boxShadow: "0 0 10px rgba(245,158,11,0.48)",
  };
}

export function particleMotion(particle: AtmosphereParticle, shouldReduceMotion: boolean) {
  if (shouldReduceMotion) return { opacity: particle.opacity };

  if (particle.kind === "petal" || particle.kind === "leaf") {
    return {
      x: [0, particle.kind === "petal" ? 18 : 24, 4],
      y: [0, 28, 56],
      rotate: [particle.rotate ?? 0, (particle.rotate ?? 0) + 18, (particle.rotate ?? 0) - 8],
      opacity: [particle.opacity * 0.25, particle.opacity, particle.opacity * 0.2],
    };
  }

  if (particle.kind === "snow") {
    return {
      x: [0, 10, -6, 8],
      y: [0, 34, 68],
      opacity: [particle.opacity * 0.35, particle.opacity, particle.opacity * 0.35],
    };
  }

  if (particle.kind === "mist") {
    return {
      x: [0, 18, -10, 0],
      scale: [0.96, 1.08, 1],
      opacity: [particle.opacity * 0.65, particle.opacity, particle.opacity * 0.75],
    };
  }

  if (particle.kind === "firefly") {
    return {
      x: [0, 10, -8, 6, 0],
      y: [0, -12, 5, -8, 0],
      opacity: [particle.opacity * 0.22, particle.opacity, particle.opacity * 0.36],
      scale: [0.8, 1.25, 0.9],
    };
  }

  if (particle.kind === "ember") {
    return {
      y: [0, -24, -54],
      x: [0, 6, -4],
      opacity: [particle.opacity * 0.2, particle.opacity, 0],
    };
  }

  if (particle.kind === "rune") {
    return {
      y: [0, -20, -5],
      rotate: [0, 15, -8],
      opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.4],
      scale: [0.85, 1.1, 0.9],
    };
  }

  if (particle.kind === "meteor") {
    return {
      x: [0, particle.size * 5],
      y: [0, particle.size * 5],
      opacity: [particle.opacity, particle.opacity * 0.8, 0],
      scaleX: [1, 1.4, 0.6],
    };
  }

  if (particle.kind === "butterfly") {
    return {
      x: [0, 12, -8, 6, 0],
      y: [0, -10, 5, -8, 0],
      rotate: [
        particle.rotate ?? 0,
        (particle.rotate ?? 0) + 12,
        (particle.rotate ?? 0) - 8,
        (particle.rotate ?? 0) + 4,
        particle.rotate ?? 0,
      ],
      scaleX: [1, -1, 1, -1, 1],
      opacity: [particle.opacity * 0.6, particle.opacity, particle.opacity * 0.8],
    };
  }

  if (particle.kind === "hexagon") {
    return {
      rotate: [0, 180, 360],
      scale: [0.88, 1.12, 0.88],
      opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
    };
  }

  if (particle.kind === "sparkle") {
    return {
      scale: [0, 1.3, 0.8, 1.5, 0],
      opacity: [0, particle.opacity, particle.opacity * 0.6, particle.opacity, 0],
      rotate: [0, 45, 90, 135, 180],
    };
  }

  if (particle.kind === "lantern") {
    return {
      y: [0, -18, 0, -12, 0],
      x: [0, 5, -4, 6, 0],
      opacity: [
        particle.opacity * 0.7,
        particle.opacity,
        particle.opacity * 0.8,
        particle.opacity * 0.9,
        particle.opacity * 0.7,
      ],
      scale: [0.95, 1, 0.97, 1.02, 0.95],
    };
  }

  if (particle.kind === "snowflake") {
    return {
      x: [0, 8, -6, 10, -4, 0],
      y: [0, 28, 56, 84],
      rotate: [0, 90, 180, 270],
      opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.9, 0],
    };
  }

  return {
    opacity: [particle.opacity * 0.35, particle.opacity, particle.opacity * 0.45],
    scale: [0.82, 1.18, 0.9],
  };
}
