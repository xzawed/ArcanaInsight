"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { useT } from "@/i18n/useT";

export function BottomCTA() {
  const { t } = useT();
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-arcana-purple/80 to-arcana-indigo/80" />
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <ScrollReveal>
          <h2 className="text-xl md:text-2xl font-display font-bold mb-4 text-white">
            {t("home.bottom-cta.title")}
          </h2>
          <p className="text-white/70 text-sm md:text-base mb-8">
            {t("home.bottom-cta.desc")}
          </p>
          <Link href="/tarot"
            className="inline-block px-10 py-4 rounded-full bg-white text-arcana-purple font-sans font-bold text-sm hover:bg-white/90 transition-colors shadow-xl shadow-arcana-purple/30">
            {t("home.bottom-cta.cta")}
          </Link>

          <div className="flex justify-center gap-3 mt-8">
            {["arcana", "miko", "seonhwa", "hoshi"].map((id) => (
              <div key={id} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                <Image src={`/images/characters/${id}/nukki/idle.png`} alt="" width={40} height={40} className="object-cover" />
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
