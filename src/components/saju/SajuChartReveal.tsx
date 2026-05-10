"use client";

import { motion, useReducedMotion } from "framer-motion";

interface SajuChartRevealProps {
  readonly children: React.ReactNode;
  readonly index?: number;
  readonly className?: string;
}

/**
 * 사주 차트 섹션을 순차 등장 애니메이션으로 감싸는 래퍼.
 * index에 따라 딜레이가 달라진다 (0.15s 간격).
 */
export function SajuChartReveal({ children, index = 0, className = "" }: SajuChartRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.55,
        delay: index * 0.18,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}
