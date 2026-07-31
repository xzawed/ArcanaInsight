"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useThemeStore } from "@/hooks/useTheme";
import type { ThemeId } from "@/hooks/useTheme";

interface ThemeAtmosphereLayerProps {
  readonly intensity?: "low" | "medium" | "high";
  readonly className?: string;
}

// midnight: 오로라 보레알리스 스트립 (정적 위치)
const AURORA_STRIPS = [
  { id: "au-1", top: 5,  height: 18, colors: "rgba(167,139,250,0.18), rgba(99,102,241,0.12), transparent", delay: 0 },
  { id: "au-2", top: 14, height: 12, colors: "rgba(245,158,11,0.1), rgba(167,139,250,0.14), transparent", delay: 3 },
  { id: "au-3", top: 22, height: 14, colors: "rgba(99,102,241,0.12), rgba(167,139,250,0.1), transparent",  delay: 6 },
] as const;

// dawn: 빛 기둥 (정적 위치)
const LIGHT_PILLARS = [
  { id: "lp-1", left: 15, width: 4, delay: 0   },
  { id: "lp-2", left: 48, width: 6, delay: 2.5 },
  { id: "lp-3", left: 78, width: 3, delay: 5   },
] as const;

// winter: 오로라 (녹색+파랑+보라)
const WINTER_AURORA_STRIPS = [
  { id: "wi-au-1", top: 8,  height: 16, colors: "rgba(52,211,153,0.12), rgba(147,197,253,0.1), transparent",  delay: 0 },
  { id: "wi-au-2", top: 18, height: 10, colors: "rgba(147,197,253,0.14), rgba(196,181,253,0.1), transparent", delay: 4 },
  { id: "wi-au-3", top: 26, height: 14, colors: "rgba(196,181,253,0.1), rgba(52,211,153,0.08), transparent",  delay: 8 },
] as const;

function MidnightLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {AURORA_STRIPS.map((strip) => (
        <motion.div
          key={strip.id}
          className="absolute left-0 right-0"
          style={{
            top: `${strip.top}%`,
            height: `${strip.height}%`,
            background: `linear-gradient(180deg, ${strip.colors})`,
            backgroundSize: "200% 100%",
            filter: "blur(22px)",
            willChange: "opacity, background-position",
            opacity: 0.4,
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.6 }
              : { opacity: [0.4, 0.8, 0.4], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 12, repeat: Infinity, ease: "easeInOut", delay: strip.delay }
          }
        />
      ))}
    </>
  );
}

function DawnLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {LIGHT_PILLARS.map((pillar) => (
        <motion.div
          key={pillar.id}
          className="absolute top-0 h-full"
          style={{
            left: `${pillar.left}%`,
            width: `${pillar.width}%`,
            background:
              "linear-gradient(180deg, rgba(251,191,36,0.22) 0%, rgba(240,171,252,0.12) 40%, transparent 72%)",
            filter: "blur(14px)",
            willChange: "opacity",
            opacity: 0.2,
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.2, 0.7, 0.2] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 8, repeat: Infinity, ease: "easeInOut", delay: pillar.delay }
          }
        />
      ))}
    </>
  );
}

function SunsetLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  if (shouldReduceMotion) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,146,60,0.04) 2px, rgba(251,146,60,0.04) 4px)",
        opacity: 0.4,
      }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function WinterLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  return (
    <>
      {WINTER_AURORA_STRIPS.map((strip) => (
        <motion.div
          key={strip.id}
          className="absolute left-0 right-0"
          style={{
            top: `${strip.top}%`,
            height: `${strip.height}%`,
            background: `linear-gradient(180deg, ${strip.colors})`,
            backgroundSize: "200% 100%",
            filter: "blur(24px)",
            willChange: "opacity, background-position",
            opacity: 0.3,
          }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.3, 0.7, 0.3], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 15, repeat: Infinity, ease: "easeInOut", delay: strip.delay }
          }
        />
      ))}
    </>
  );
}

function SummerLayer({ shouldReduceMotion }: { readonly shouldReduceMotion: boolean }) {
  if (shouldReduceMotion) return null;
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-[20%]"
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(56,189,248,0.06) 60%, rgba(251,191,36,0.04))",
        filter: "blur(8px)",
        willChange: "transform",
      }}
      animate={{ scaleY: [1, 1.02, 1], skewX: ["0deg", "0.5deg", "0deg"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const LAYER_MAP: Record<ThemeId, React.FC<{ shouldReduceMotion: boolean }> | null> = {
  midnight: MidnightLayer,
  dawn:     DawnLayer,
  sunset:   SunsetLayer,
  spring:   null,
  summer:   SummerLayer,
  autumn:   null,
  winter:   WinterLayer,
};

export function ThemeAtmosphereLayer({ intensity = "high", className = "" }: ThemeAtmosphereLayerProps) {
  const { activeTheme } = useThemeStore();
  // SunsetLayer·SummerLayer의 렌더 유무를 가르므로 hydration 안전 훅을 쓴다.
  const shouldReduceMotion = useReducedMotionSafe();

  if (intensity === "low") return null;

  const LayerComponent = LAYER_MAP[activeTheme];
  if (!LayerComponent) return null;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden
      data-testid={`theme-atmosphere-layer-${activeTheme}`}
    >
      <LayerComponent shouldReduceMotion={shouldReduceMotion} />
    </div>
  );
}
