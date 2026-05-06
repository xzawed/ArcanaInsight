"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground } from "@/components/effects/MysticBackground";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterById } from "@/data/characters";
import { useThemeStore, type ThemeId } from "@/hooks/useTheme";
import { getDailyCharacterId } from "@/lib/daily-character";
import { useT } from "@/i18n/useT";

// 시간대별 분위기 오버레이 (hero-bg.jpg 위에 합성)
const THEME_OVERLAY: Record<ThemeId, string> = {
  midnight: "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(88,28,135,0.55) 0%, rgba(10,10,26,0.88) 100%)",
  dawn:     "linear-gradient(180deg, rgba(244,114,182,0.35) 0%, rgba(99,102,241,0.25) 40%, rgba(26,15,30,0.88) 100%)",
  sunset:   "linear-gradient(0deg, rgba(251,146,60,0.50) 0%, rgba(139,92,246,0.40) 55%, rgba(26,15,10,0.88) 100%)",
  spring:   "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(244,114,182,0.28) 0%, rgba(20,15,24,0.88) 100%)",
  summer:   "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(56,189,248,0.22) 0%, rgba(10,22,40,0.88) 100%)",
  autumn:   "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(217,119,6,0.28) 0%, rgba(26,16,10,0.88) 100%)",
  winter:   "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(147,197,253,0.22) 0%, rgba(12,18,32,0.88) 100%)",
};

export function HeroSection() {
  const { activeTheme } = useThemeStore();
  const { t } = useT();

  const [characterId, setCharacterId] = useState<string>("arcana");

  useEffect(() => {
    const t = setTimeout(() => setCharacterId(getDailyCharacterId()), 0);
    return () => clearTimeout(t);
  }, []);

  const character = getCharacterById(characterId)!;
  const particleDensity = activeTheme === "midnight" ? "high" : "medium";

  const scrollToDaily = () => {
    document.getElementById("daily-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-[100dvh] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/hero-bg.jpg" alt="" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        {/* 시간대별 분위기 오버레이 */}
        <motion.div
          key={activeTheme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ background: THEME_OVERLAY[activeTheme] }}
        />
      </div>

      <ParticleOverlay density={particleDensity} className="z-10" />
      <MysticBackground service="home" />

      <div className="flex-1 flex flex-col md:flex-row items-center z-20 px-4 md:px-8">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-[40%] md:h-full w-full md:w-[50%] relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={characterId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full"
            >
              <CharacterDisplay character={character} mood="smile" className="w-full h-full" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-full md:w-[50%] flex flex-col items-center md:items-start justify-center px-4 md:px-12"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={characterId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-arcana-purple/10 border border-arcana-purple/25"
            >
              <span className="text-arcana-muted text-xs">{`✨ ${t("home.hero.today-character")}`}</span>
              <span className="text-arcana-purple font-serif font-bold text-sm">{character.name}</span>
            </motion.div>
          </AnimatePresence>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-center md:text-left leading-tight">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent">
              {t("home.hero.title-line1")}
            </span>
            <br />
            <span className="text-arcana-text">{t("home.hero.title-line2")}</span>
          </h1>
          <p className="text-arcana-muted text-sm md:text-base mb-8 text-center md:text-left max-w-md">
            {t("home.hero.desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/tarot"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-sans font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20 text-center">
              {t("home.hero.cta-tarot")}
            </Link>
            <button onClick={scrollToDaily} type="button"
              className="px-8 py-3 rounded-full border border-arcana-purple text-arcana-purple font-sans font-bold text-sm hover:bg-arcana-purple/10 transition-colors text-center">
              {t("home.hero.cta-daily")}
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-arcana-muted text-xs flex flex-col items-center gap-1"
      >
        <span>{t("home.hero.scroll-hint")}</span>
        <span>▼</span>
      </motion.div>
    </section>
  );
}
