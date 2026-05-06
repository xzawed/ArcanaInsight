"use client";

import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { Icon } from "@/components/common/Icon";
import { useT } from "@/i18n/useT";

export function ServiceFlow() {
  const { t } = useT();
  const STEPS = [
    { num: "01", iconId: "ui-person", title: t("home.service-flow.step1.title"), desc: t("home.service-flow.step1.desc") },
    { num: "02", iconId: "ui-target", title: t("home.service-flow.step2.title"), desc: t("home.service-flow.step2.desc") },
    { num: "03", iconId: "nav-tarot", title: t("home.service-flow.step3.title"), desc: t("home.service-flow.step3.desc") },
    { num: "04", iconId: "ui-book", title: t("home.service-flow.step4.title"), desc: t("home.service-flow.step4.desc") },
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-arcana-surface/30">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-3">{t("home.service-flow.title")}</h2>
          <p className="text-arcana-muted text-sm md:text-base">{t("home.service-flow.desc")}</p>
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
                  <span className="text-arcana-purple text-xs font-display font-bold">STEP {step.num}</span>
                  <h3 className="font-sans font-bold text-sm mt-1">{step.title}</h3>
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
