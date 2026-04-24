"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterById } from "@/data/characters";

export function HeroSection() {
  const arcana = getCharacterById("arcana")!;

  const scrollToDaily = () => {
    document.getElementById("daily-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-[100dvh] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover" priority  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      <ParticleOverlay density="medium" className="z-10" />

      <div className="flex-1 flex flex-col md:flex-row items-center z-20 px-4 md:px-8">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-[40%] md:h-full w-full md:w-[50%] relative"
        >
          <CharacterDisplay character={arcana} mood="smile" className="w-full h-full" />
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-full md:w-[50%] flex flex-col items-center md:items-start justify-center px-4 md:px-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-center md:text-left leading-tight">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent">
              카드가 속삭이는
            </span>
            <br />
            <span className="text-arcana-text">당신의 이야기</span>
          </h1>
          <p className="text-arcana-muted text-sm md:text-base mb-8 text-center md:text-left max-w-md">
            AI 타로 상담사와 함께하는 신비로운 운세 체험. 4명의 개성 있는 캐릭터가 카드의 메시지를 전합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/tarot"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-sans font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20 text-center">
              타로 상담 시작하기
            </Link>
            <button onClick={scrollToDaily} type="button"
              className="px-8 py-3 rounded-full border border-arcana-purple text-arcana-purple font-sans font-bold text-sm hover:bg-arcana-purple/10 transition-colors text-center">
              오늘의 카드 뽑기
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-arcana-muted text-xs flex flex-col items-center gap-1"
      >
        <span>스크롤하여 더 알아보기</span>
        <span>▼</span>
      </motion.div>
    </section>
  );
}
