"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";

const THEME_COLORS: Record<string, string> = {
  arcana: "shadow-purple-500/30 hover:border-purple-400",
  miko: "shadow-red-500/30 hover:border-red-400",
  seonhwa: "shadow-pink-500/30 hover:border-pink-400",
  hoshi: "shadow-blue-500/30 hover:border-blue-400",
};

export function CharacterGallery() {
  const characters = getAvailableCharacters();

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-3">당신의 상담사를 만나보세요</h2>
          <p className="text-arcana-muted text-sm md:text-base max-w-lg mx-auto">
            각 상담사만의 특별한 리딩 스타일로 카드의 메시지를 전합니다
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {characters.map((char, index) => (
            <ScrollReveal key={char.id} delay={index * 0.15}>
              <Link href={`/tarot?character=${char.id}`}>
                <motion.div
                  whileHover={{ y: -12, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl overflow-hidden transition-all hover:shadow-xl ${THEME_COLORS[char.id] || ""}`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={`/images/characters/${char.id}/nukki/idle.png`}
                      alt={`${char.name} - ${char.personality}`}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-arcana-card to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-base">{char.name}</h3>
                    <p className="text-arcana-muted text-xs mt-0.5">{char.nameJp}</p>
                    <div className="mt-2 inline-block px-2 py-0.5 bg-arcana-purple/10 border border-arcana-purple/30 rounded-full">
                      <span className="text-arcana-purple text-[10px] font-serif">{char.speciality}</span>
                    </div>
                    <p className="text-arcana-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                      {char.description.slice(0, 50)}...
                    </p>
                  </div>
                </motion.div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
