"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// 오행 색상: 木(청) 火(적) 土(황) 金(백) 水(흑/남)
const OHAENG = [
  { color: "rgba(34,197,94,0.82)",   shadow: "rgba(34,197,94,0.5)",  label: "木", angle: -90 },
  { color: "rgba(239,68,68,0.82)",   shadow: "rgba(239,68,68,0.5)",  label: "火", angle: -18 },
  { color: "rgba(234,179,8,0.82)",   shadow: "rgba(234,179,8,0.5)",  label: "土", angle: 54 },
  { color: "rgba(226,232,240,0.82)", shadow: "rgba(226,232,240,0.5)", label: "金", angle: 126 },
  { color: "rgba(59,130,246,0.82)",  shadow: "rgba(59,130,246,0.5)", label: "水", angle: 198 },
] as const;

const DURATION_MS = 2200;

interface ShinjeomEnergyEffectProps {
  readonly onComplete?: () => void;
}

/**
 * 신점 세션 시작 시 오행 에너지가 수렴-폭발하는 1회성 인트로 이펙트.
 * 2.2초 후 onComplete 콜백을 호출하고 자동으로 사라진다.
 */
export function ShinjeomEnergyEffect({ onComplete }: ShinjeomEnergyEffectProps) {
  const shouldReduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tid = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, shouldReduceMotion ? 100 : DURATION_MS);
    return () => clearTimeout(tid);
  }, [onComplete, shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 50 }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* 다크 오버레이 배경 */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(5,0,20,0.65)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.65, 0.65, 0] }}
            transition={{ duration: 2.2, times: [0, 0.15, 0.75, 1] }}
          />

          {/* 오행 에너지 구체들 */}
          {OHAENG.map((elem, i) => {
            const rad = (elem.angle * Math.PI) / 180;
            const startX = Math.cos(rad) * 48;
            const startY = Math.sin(rad) * 48;

            return (
              <motion.div
                key={elem.label}
                className="absolute rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  left: "calc(50% - 16px)",
                  top: "calc(50% - 16px)",
                  background: `radial-gradient(circle at 40% 35%, ${elem.color}, transparent 80%)`,
                  boxShadow: `0 0 18px ${elem.shadow}, 0 0 40px ${elem.shadow}`,
                }}
                initial={{ x: `${startX}vw`, y: `${startY}vh`, scale: 0.4, opacity: 0 }}
                animate={{
                  x: [
                    `${startX}vw`,
                    `${startX * 0.15}vw`,
                    "0vw",
                    `${startX * 0.6}vw`,
                    `${startX * 2.4}vw`,
                  ],
                  y: [
                    `${startY}vh`,
                    `${startY * 0.15}vh`,
                    "0vh",
                    `${startY * 0.6}vh`,
                    `${startY * 2.4}vh`,
                  ],
                  scale: [0.4, 1.2, 1.6, 0.9, 0],
                  opacity: [0, 0.9, 1, 0.6, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.06,
                  times: [0, 0.28, 0.5, 0.72, 1],
                  ease: "easeInOut",
                }}
              />
            );
          })}

          {/* 중앙 수렴 폭발 링 */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid rgba(220,180,255,0.9)",
              boxShadow: "0 0 30px rgba(167,139,250,0.6)",
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: ["0px", "20px", "160px", "300px"],
              height: ["0px", "20px", "160px", "300px"],
              opacity: [0, 1, 0.8, 0],
            }}
            transition={{
              duration: 0.9,
              delay: 0.88,
              times: [0, 0.06, 0.55, 1],
              ease: "easeOut",
            }}
          />

          {/* 오행 라벨 */}
          {OHAENG.map((elem, i) => {
            const rad = (elem.angle * Math.PI) / 180;
            const lx = 50 + Math.cos(rad) * 32;
            const ly = 50 + Math.sin(rad) * 32;
            return (
              <motion.span
                key={elem.label}
                className="absolute font-serif font-bold select-none"
                style={{
                  left: `${lx}%`,
                  top: `${ly}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: 18,
                  color: elem.color,
                  textShadow: `0 0 12px ${elem.shadow}`,
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.4] }}
                transition={{
                  duration: 1.8,
                  delay: 0.1 + i * 0.06,
                  times: [0, 0.18, 0.65, 1],
                }}
              >
                {elem.label}
              </motion.span>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
