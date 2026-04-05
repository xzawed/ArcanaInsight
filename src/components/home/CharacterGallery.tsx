"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { GenderFilterToggle } from "@/components/home/GenderFilter";
import { useGenderStore } from "@/hooks/useGenderStore";
import { getCharactersByGender } from "@/data/characters";

export function CharacterGallery() {
  const { genderFilter } = useGenderStore();
  const characters = getCharactersByGender(genderFilter);

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-3">당신의 상담사를 만나보세요</h2>
          <p className="text-arcana-muted text-sm md:text-base max-w-lg mx-auto">
            각 상담사만의 특별한 리딩 스타일로 카드의 메시지를 전합니다
          </p>
        </ScrollReveal>

        <GenderFilterToggle />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {characters.map((char, index) => (
            <ScrollReveal key={char.id} delay={index * 0.08}>
              <Link href={`/character/${char.id}`}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:border-arcana-purple/50"
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
                  <div className="p-3">
                    <h3 className="font-display font-bold text-sm truncate">{char.name}</h3>
                    <p className="text-arcana-muted text-xs mt-0.5 truncate">{char.nameJp}</p>
                    <div className="mt-1.5 inline-block max-w-full px-2 py-0.5 bg-arcana-purple/10 border border-arcana-purple/30 rounded-full">
                      <span className="text-arcana-purple text-xs font-sans truncate block">{char.speciality}</span>
                    </div>
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
