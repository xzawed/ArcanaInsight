"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ThemeId } from "@/hooks/useTheme";
import { THEME_ATMOSPHERES } from "./themeAtmosphere";
import { particleStyle, particleMotion } from "./mysticUtils";

type Service = "home" | "tarot" | "saju" | "shinjeom";

interface MysticBackgroundProps {
  readonly service: Service;
}

interface ThemeAtmosphereProps {
  readonly theme: ThemeId;
  readonly intensity?: "hero" | "service" | "ambient";
  readonly className?: string;
  readonly testId?: string;
}

const MIST_COLOR: Record<Service, string> = {
  home:     "rgba(88,28,135,0.12)",
  tarot:    "rgba(88,28,135,0.18)",
  saju:     "rgba(146,64,14,0.15)",
  shinjeom: "rgba(30,58,138,0.15)",
};

// 별 위치 (고정값 — SSR 안전, Math.random 미사용)
const STAR_POINTS = [
  { cx: 8,  cy: 12, r: 0.8 },
  { cx: 23, cy: 8,  r: 0.5 },
  { cx: 45, cy: 15, r: 0.8 },
  { cx: 72, cy: 7,  r: 0.5 },
  { cx: 88, cy: 18, r: 0.8 },
  { cx: 5,  cy: 75, r: 0.5 },
  { cx: 92, cy: 65, r: 0.8 },
  { cx: 60, cy: 85, r: 0.5 },
];

// 별자리 연결선
const CONSTELLATION_LINES = [
  { x1: 8,  y1: 12, x2: 23, y2: 8  },
  { x1: 23, y1: 8,  x2: 45, y2: 15 },
  { x1: 45, y1: 15, x2: 72, y2: 7  },
  { x1: 72, y1: 7,  x2: 88, y2: 18 },
];

// 서비스별 룬 심볼 텍스트
const RUNE_SYMBOLS: Record<Service, string[]> = {
  home:     [],
  tarot:    ["✦", "✧", "✦"],
  saju:     ["☰", "☱", "☲", "☳"],
  shinjeom: ["☯", "✦", "◯"],
};

// 룬 위치 (고정 — SSR 안전)
const RUNE_POSITIONS = [
  { top: "20%", left: "8%",  fontSize: 14, opacity: 0.15 },
  { top: "60%", left: "5%",  fontSize: 12, opacity: 0.12 },
  { top: "30%", left: "87%", fontSize: 14, opacity: 0.15 },
  { top: "70%", left: "89%", fontSize: 12, opacity: 0.12 },
];

const INTENSITY_OPACITY: Record<NonNullable<ThemeAtmosphereProps["intensity"]>, number> = {
  hero: 1,
  service: 0.74,
  ambient: 0.46,
};

export function ThemeAtmosphere({ theme, intensity = "hero", className = "", testId }: ThemeAtmosphereProps) {
  const shouldReduceMotion = useReducedMotion();
  const config = THEME_ATMOSPHERES[theme];
  const opacity = INTENSITY_OPACITY[intensity];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden
      data-testid={testId ?? `theme-atmosphere-${theme}`}
      data-theme-atmosphere={theme}
      data-theme-atmosphere-intensity={intensity}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: config.baseGlow }}
        animate={shouldReduceMotion ? { opacity: 0.82 } : { opacity: [0.72, 1, 0.76] }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {config.texture ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: config.texture,
            backgroundSize: theme === "summer" ? "96px 96px" : "auto",
            opacity: 0.62,
          }}
        />
      ) : null}

      {config.rays?.map((ray) => (
        <motion.div
          key={ray.id}
          className="absolute -top-[12%] h-[86%] origin-top"
          style={{
            left: `${ray.left}%`,
            width: `${ray.width}%`,
            transform: `rotate(${ray.rotate}deg)`,
            background: `linear-gradient(180deg, ${ray.color}, transparent 78%)`,
            filter: "blur(10px)",
            opacity: ray.opacity,
          }}
          animate={shouldReduceMotion ? { opacity: ray.opacity } : { opacity: [ray.opacity * 0.55, ray.opacity, ray.opacity * 0.62] }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: "easeInOut", delay: ray.delay }}
        />
      ))}

      {config.ribbons ? (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {config.ribbons.map((ribbon) => (
            <motion.path
              key={ribbon.id}
              d={ribbon.path}
              fill="none"
              stroke={ribbon.color}
              strokeLinecap="round"
              strokeWidth="9"
              opacity={ribbon.opacity}
              filter="blur(5px)"
              animate={shouldReduceMotion ? { pathLength: 1 } : { pathLength: [0.82, 1, 0.86], opacity: [ribbon.opacity * 0.55, ribbon.opacity, ribbon.opacity * 0.6] }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: ribbon.duration, repeat: Infinity, ease: "easeInOut", delay: ribbon.delay }}
            />
          ))}
        </svg>
      ) : null}

      {config.lines ? (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {config.lines.map((line) => (
            <motion.line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(226, 232, 240, 0.72)"
              strokeWidth="0.18"
              opacity={line.opacity}
              initial={shouldReduceMotion ? false : { pathLength: 0 }}
              animate={shouldReduceMotion ? { opacity: line.opacity } : { pathLength: 1, opacity: [line.opacity * 0.45, line.opacity, line.opacity * 0.52] }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </svg>
      ) : null}

      {config.particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute block"
          style={particleStyle(particle)}
          animate={particleMotion(particle, Boolean(shouldReduceMotion))}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: particle.duration, repeat: Infinity, ease: "easeInOut", delay: particle.delay }
          }
        >{particle.text ?? ""}</motion.span>
      ))}
    </div>
  );
}

export function MysticBackground({ service }: MysticBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  const reactId = useId();
  const mistColor = MIST_COLOR[service];
  const runes = RUNE_SYMBOLS[service];
  const filterId = `turbulence-${service}-${reactId.replaceAll(":", "")}`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden" aria-hidden>
      {/* SVG feTurbulence 안개 필터 정의 */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.008"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* 안개 레이어 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2/5"
        style={{ filter: `url(#${filterId})` }}
        animate={shouldReduceMotion ? { opacity: 0.7 } : { opacity: [0.6, 1, 0.6] }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${mistColor} 60%, ${mistColor} 100%)`,
            filter: "blur(12px)",
          }}
        />
      </motion.div>

      {/* 별자리 SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {STAR_POINTS.map((s, i) => (
          <motion.circle
            key={`star-${s.cx}-${s.cy}`}
            cx={s.cx} cy={s.cy} r={s.r}
            fill="rgba(212,175,55,0.5)"
            animate={shouldReduceMotion ? { opacity: 0.4 } : { opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}
        {CONSTELLATION_LINES.map((l, i) => (
          <motion.path
            key={`cline-${l.x1}-${l.y1}-${l.x2}-${l.y2}`}
            d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
            stroke="rgba(167,139,250,0.2)"
            strokeWidth="0.3"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { pathLength: 1, opacity: 0.6 } : { pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 + i * 0.4, ease: "easeOut" }}
          />
        ))}
      </svg>

      {/* 서비스별 룬 심볼 */}
      {runes.map((rune, i) => {
        const pos = RUNE_POSITIONS[i];
        if (!pos) return null;
        return shouldReduceMotion ? (
          <div
            key={`rune-${pos.top}-${pos.left}`}
            className="absolute select-none"
            style={{ top: pos.top, left: pos.left, fontSize: pos.fontSize, color: `rgba(167,139,250,${pos.opacity})` }}
          >
            {rune}
          </div>
        ) : (
          <motion.div
            key={`rune-${pos.top}-${pos.left}`}
            className="absolute select-none"
            style={{ top: pos.top, left: pos.left, fontSize: pos.fontSize, color: `rgba(167,139,250,${pos.opacity})` }}
            animate={{ opacity: [pos.opacity * 0.6, pos.opacity, pos.opacity * 0.6], rotate: [0, 3, 0, -3, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            {rune}
          </motion.div>
        );
      })}
    </div>
  );
}
