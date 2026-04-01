"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { getCharacterById } from "@/data/characters";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";

const services = [
  { id: "tarot", label: "타로 리딩", icon: "🃏", desc: "카드로 운명을 읽어요" },
  { id: "saju", label: "사주 상담", icon: "☯", desc: "사주팔자로 인생을 봐요" },
  { id: "shinjeom", label: "신점", icon: "🔮", desc: "신의 뜻을 전해드려요", disabled: true },
  { id: "fortune", label: "오늘의 운세", icon: "⭐", desc: "오늘 하루를 미리 봐요", disabled: true },
];

export default function CharacterPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const character = getCharacterById(id);

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-arcana-muted">캐릭터를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>
      <ParticleOverlay density="low" className="z-10" />

      <div className="relative z-20 min-h-[calc(100vh-7rem)] md:min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row">
        {/* 좌측: 캐릭터 이미지 */}
        <div className="h-[40vh] md:h-auto md:w-[50%] md:flex-shrink-0 relative overflow-hidden">
          <Image
            src={`/images/characters/${character.id}/nukki/idle.png`}
            alt={character.name}
            fill
            className="object-cover object-top"
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-arcana-bg/80 to-transparent pointer-events-none" />
        </div>

        {/* 우측: 캐릭터 정보 + 서비스 선택 */}
        <div className="flex-1 md:w-[50%] flex flex-col justify-center px-6 md:px-10 py-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.back()}
              className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-4"
            >
              ← 뒤로
            </button>

            <div className="mb-6">
              <h1 className="font-serif font-bold text-2xl md:text-3xl mb-1">{character.name}</h1>
              <p className="text-arcana-muted text-sm">{character.nameJp}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-arcana-purple/10 border border-arcana-purple/30 rounded-full">
                <span className="text-arcana-purple text-xs font-serif">{character.speciality}</span>
              </div>
              <p className="text-arcana-text text-sm leading-relaxed mt-3">{character.description}</p>
            </div>

            <h2 className="font-serif font-bold text-sm text-arcana-muted mb-3">서비스 선택</h2>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => {
                    if (!service.disabled) {
                      router.push(`/${service.id}?character=${character.id}`);
                    }
                  }}
                  disabled={service.disabled}
                  className={`group bg-arcana-card/70 backdrop-blur-sm border rounded-xl p-4 text-left transition-all ${
                    service.disabled
                      ? "border-arcana-border/50 opacity-40 cursor-not-allowed"
                      : "border-arcana-border hover:border-arcana-purple hover:shadow-lg hover:shadow-arcana-purple/10"
                  }`}
                >
                  <span className="text-2xl block mb-2">{service.icon}</span>
                  <h3 className={`font-serif font-bold text-sm transition-colors ${!service.disabled ? "group-hover:text-arcana-purple" : ""}`}>
                    {service.label}
                  </h3>
                  <p className="text-arcana-muted text-xs mt-0.5">{service.desc}</p>
                  {service.disabled && (
                    <span className="text-arcana-muted text-[10px] mt-1 block">준비 중</span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
