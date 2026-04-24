"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/effects/ScrollReveal";

export function BottomCTA() {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-arcana-purple/80 to-arcana-indigo/80" />
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <ScrollReveal>
          <h2 className="text-xl md:text-2xl font-display font-bold mb-4 text-white">
            지금 바로 첫 번째 상담을 시작해보세요
          </h2>
          <p className="text-white/70 text-sm md:text-base mb-8">
            로그인 없이도 바로 이용 가능합니다
          </p>
          <Link href="/tarot"
            className="inline-block px-10 py-4 rounded-full bg-white text-arcana-purple font-sans font-bold text-sm hover:bg-white/90 transition-colors shadow-xl shadow-arcana-purple/30">
            상담 시작하기
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
