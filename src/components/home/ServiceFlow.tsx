"use client";

import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { Icon } from "@/components/common/Icon";

const STEPS = [
  { num: "01", iconId: "ui-person", title: "상담사 선택", desc: "12명의 개성 있는 AI 상담사 중 선택" },
  { num: "02", iconId: "ui-target", title: "주제 선택", desc: "연애, 직장, 재정, 건강, 일반 등 다양한 주제" },
  { num: "03", iconId: "nav-tarot", title: "카드 리딩", desc: "직감으로 카드를 선택하면 실시간 AI 해석" },
  { num: "04", iconId: "ui-book", title: "결과 확인", desc: "상세 해석과 조언, 저장 및 공유 가능" },
];

export function ServiceFlow() {
  return (
    <section className="py-16 md:py-24 px-4 bg-arcana-surface/30">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-3">이렇게 진행됩니다</h2>
          <p className="text-arcana-muted text-sm md:text-base">간단한 4단계로 타로 상담을 받아보세요</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative">
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-arcana-purple/50 via-arcana-indigo/50 to-arcana-gold/50" />

          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.2}>
              <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0">
                <div className="relative z-10 w-14 h-14 md:w-16 md:h-16 rounded-full bg-arcana-card border-2 border-arcana-purple/50 flex items-center justify-center flex-shrink-0 md:mb-4">
                  <Icon id={step.iconId} size={24} />
                </div>
                <div>
                  <span className="text-arcana-purple text-xs font-serif font-bold">STEP {step.num}</span>
                  <h3 className="font-serif font-bold text-sm mt-1">{step.title}</h3>
                  <p className="text-arcana-muted text-xs mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
