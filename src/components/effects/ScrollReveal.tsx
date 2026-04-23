"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollRevealProps {
  readonly children: React.ReactNode;
  readonly delay?: number;
  readonly direction?: "up" | "left" | "right" | "none";
  readonly className?: string;
}

export function ScrollReveal({ children, delay = 0, direction = "up", className = "" }: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const xOffsetMap: Record<string, number> = { left: -30, right: 30 };
  const xOffset = xOffsetMap[direction] ?? 0;
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 30 : 0,
      x: xOffset,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
