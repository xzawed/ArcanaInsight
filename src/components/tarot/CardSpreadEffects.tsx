"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CardSpreadEffectsProps {
  readonly isActive: boolean;
  readonly color?: string;
  readonly size?: number;
}

const RING_DELAYS = [0, 0.12, 0.24] as const;
const RUNE_MARKS = ["✦", "◈", "⊕", "❋", "✦", "◈", "⊕", "❋"] as const;

/**
 * 카드 reveal 시 나타나는 매직 서클 오버레이.
 * isActive=true 로 바꾸면 1.6초 동안 애니메이션 후 자연스럽게 사라진다.
 */
export function CardSpreadEffects({ isActive, color = "rgba(167,139,250,0.7)", size = 200 }: CardSpreadEffectsProps) {
  const cx = size / 2;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ zIndex: 20 }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ position: "absolute" }}
          >
            {/* Concentric expanding rings */}
            {RING_DELAYS.map((delay, i) => {
              const r = cx * (0.4 + i * 0.24);
              return (
                <motion.circle
                  key={i}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2 - i * 0.3}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: [0.3, 1.2, 1], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.4, delay, ease: "easeOut" }}
                  style={{ transformOrigin: `${cx}px ${cx}px` }}
                />
              );
            })}

            {/* Inner rotating star polygon */}
            <motion.polygon
              points={`${cx},${cx * 0.22} ${cx * 1.14},${cx * 0.74} ${cx * 0.57},${cx * 1.54} ${cx * 1.43},${cx * 1.54} ${cx * 1.86},${cx * 0.74}`}
              fill="none"
              stroke={color}
              strokeWidth={0.8}
              opacity={0.5}
              initial={{ rotate: 0, scale: 0, opacity: 0 }}
              animate={{ rotate: 180, scale: [0, 0.85, 0.7], opacity: [0, 0.5, 0] }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              style={{ transformOrigin: `${cx}px ${cx}px` }}
            />

            {/* Rune marks around the outer ring */}
            {RUNE_MARKS.map((mark, i) => {
              const angle = (i / RUNE_MARKS.length) * Math.PI * 2 - Math.PI / 2;
              const r2 = cx * 0.78;
              const mx = cx + r2 * Math.cos(angle);
              const my = cx + r2 * Math.sin(angle);
              return (
                <motion.text
                  key={i}
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cx * 0.14}
                  fill={color}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0, 1, 0.6] }}
                  transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                  style={{ transformOrigin: `${mx}px ${my}px` }}
                >
                  {mark}
                </motion.text>
              );
            })}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
