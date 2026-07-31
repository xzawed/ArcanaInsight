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

  // 호스트 요소를 분기하지 않는다(div ↔ motion.div). 서버는 동작 줄이기 여부를 알 수 없어
  // 분기하면 SSR 결과와 첫 클라이언트 렌더가 어긋난다 — 등장 애니메이션만 건너뛴다.
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.55, delay: index * 0.18, ease: [0.25, 0.46, 0.45, 0.94] }
      }
    >
      {children}
    </motion.div>
  );
}
