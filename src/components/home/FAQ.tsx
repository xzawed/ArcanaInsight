"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { faqItems } from "@/data/home/faq";

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ScrollReveal delay={index * 0.1}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="w-full bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 md:p-5 text-left hover:border-arcana-purple/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-sans font-bold text-sm md:text-base">{question}</h3>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-arcana-purple flex-shrink-0"
          >
            ▼
          </motion.span>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <p className="text-arcana-muted text-xs md:text-sm leading-relaxed mt-3 pt-3 border-t border-arcana-border/50">
                {answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </ScrollReveal>
  );
}

export function FAQ() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-3">자주 묻는 질문</h2>
        </ScrollReveal>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.question} answer={item.answer} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
