"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { reviews } from "@/data/home/reviews";

export function ReviewCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length);
  const next = () => setCurrent((c) => (c + 1) % reviews.length);

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-3">상담 후기</h2>
          <p className="text-arcana-muted text-sm md:text-base">실제 사용자들의 리딩 경험</p>
        </ScrollReveal>

        <div className="relative">
          <button onClick={prev} type="button" aria-label="이전 후기"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 z-10 w-10 h-10 rounded-full bg-arcana-card/70 backdrop-blur-sm border border-arcana-border flex items-center justify-center text-arcana-muted hover:text-arcana-purple transition-colors">
            ‹
          </button>
          <button onClick={next} type="button" aria-label="다음 후기"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 z-10 w-10 h-10 rounded-full bg-arcana-card/70 backdrop-blur-sm border border-arcana-border flex items-center justify-center text-arcana-muted hover:text-arcana-purple transition-colors">
            ›
          </button>

          <div className="overflow-hidden px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-6 md:p-8"
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < reviews[current].rating ? "text-arcana-gold" : "text-arcana-border"}>★</span>
                  ))}
                </div>
                <p className="text-arcana-text text-sm md:text-base leading-relaxed mb-4">
                  &ldquo;{reviews[current].text}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-arcana-purple/20 flex items-center justify-center text-arcana-purple text-xs font-bold">
                      {reviews[current].name[0]}
                    </div>
                    <span className="text-arcana-muted text-sm">{reviews[current].name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-arcana-purple/10 text-arcana-purple">{reviews[current].topic}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {reviews.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} type="button" aria-label={`후기 ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-arcana-purple w-6" : "bg-arcana-border"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
