"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { stats } from "@/data/home/stats";

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const start = Date.now();
    const isDecimal = value % 1 !== 0;

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(isDecimal ? parseFloat((value * eased).toFixed(1)) : Math.floor(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-3xl md:text-4xl font-display font-bold text-arcana-purple">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsCounter() {
  return (
    <section className="py-16 md:py-20 px-4 bg-arcana-surface/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                <p className="text-arcana-muted text-xs mt-1">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
