"use client";

import { motion } from "framer-motion";

type ServiceType = "tarot" | "saju" | "shinjeom";

interface ServiceBackgroundProps {
  readonly service: ServiceType;
}

// 타로 별자리: 황금비 배치 — SSR 안전 정적 배열 (Math.random 미사용)
const STAR_POSITIONS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,
  y: (i * 97.317) % 100,
  size: 1 + (i % 3) * 0.5,
  duration: 2 + (i % 5),
  delay: (i % 7) * 0.4,
}));

// 신점 오방색 레이어 (청·적·황·흑·백)
const OBANGSAEK_LAYERS = [
  { color: "#1E3A8A", angle: 135, delay: 0 },
  { color: "#991B1B", angle: 225, delay: 1.2 },
  { color: "#92400E", angle: 315, delay: 2.4 },
  { color: "#1C1917", angle: 45, delay: 3.6 },
  { color: "#D1D5DB", angle: 180, delay: 4.8 },
];

function TarotBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: "#0F0A2E" }} />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(88,28,135,0.4) 0%, transparent 70%)" }}
      />
      {STAR_POSITIONS.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: star.duration, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
        />
      ))}
    </>
  );
}

function SajuBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: "#1A1209" }} />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 90%, rgba(217,119,6,0.35) 0%, transparent 65%)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 40% 30% at 50% 10%, rgba(6,95,70,0.2) 0%, transparent 60%)" }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </>
  );
}

function ShinjeomBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: "#120A18" }} />
      {OBANGSAEK_LAYERS.map((layer) => (
        <motion.div
          key={layer.color}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${layer.angle}deg, ${layer.color}28 0%, transparent 55%)`,
          }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: layer.delay }}
        />
      ))}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 60%)" }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export function ServiceBackground({ service }: ServiceBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {service === "tarot" && <TarotBackground />}
      {service === "saju" && <SajuBackground />}
      {service === "shinjeom" && <ShinjeomBackground />}
    </div>
  );
}
