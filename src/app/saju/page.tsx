"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { getCharactersByGender } from "@/data/characters";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { ChatMessage, Topic } from "@/types/session";
import { UserInfo } from "@/types/user-info";

const sajuTopics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "general", label: "종합 상담", icon: "✨", desc: "사주 전체를 종합적으로 해석" },
  { id: "love", label: "연애/관계", icon: "💝", desc: "인연과 관계에 대한 사주 분석" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "적성과 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "재물운과 재정 흐름" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강 관련 사주 분석" },
  { id: "fortune-3y", label: "3년 운세", icon: "📅", desc: "향후 3년 단기 전망" },
  { id: "fortune-5y", label: "5년 운세", icon: "🗓️", desc: "향후 5년 중기 흐름" },
  { id: "fortune-full", label: "전체 운세", icon: "🌟", desc: "전체 대운 인생 로드맵" },
];


type PageStep = "character-select" | "info-input" | "topic-select";

export default function SajuPage() {
  const router = useRouter();
  const { setTopic, setCharacterId, setUserInfo, setPhase } = useSajuSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const sajuCharacters = getCharactersByGender(genderFilter);

  const [step, setStep] = useState<PageStep>("character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);


  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setDialogueMessages([{
      id: crypto.randomUUID(), role: "character",
      content: character.greeting, mood: "smile", timestamp: new Date(),
    }]);
    setStep("info-input");
  };

  const handleInfoSubmit = (info: UserInfo) => {
    setUserInfo(info);
    setDialogueMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "character",
      content: `${info.name || ""}님의 사주를 준비했어요. 어떤 주제로 상담받으실 건가요?`,
      mood: "smile", timestamp: new Date(),
    }]);
    setStep("topic-select");
  };

  const handleTopicSelect = (topic: Topic) => {
    setTopic(topic);
    setPhase("reading");
    router.push("/saju/session");
  };

  const handleBack = () => {
    if (step === "topic-select") setStep("info-input");
    else if (step === "info-input") { setStep("character-select"); setSelectedCharacter(null); setDialogueMessages([]); }
    else { setStep("character-select"); setSelectedCharacter(null); }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density="low" className="z-10" />

      <AnimatePresence mode="wait">
        {step === "character-select" ? (
          <motion.div key="char-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto px-4 py-8 relative z-20">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-serif font-bold mb-2">사주 상담사를 선택해주세요</h2>
              <p className="text-arcana-muted">사주명리학 전문 상담을 받아보세요</p>
            </div>
            {/* 성별 필터 */}
            <div className="flex justify-center gap-2 mb-6">
              {(["all", "female", "male"] as GenderFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setGenderFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-serif font-bold border transition-colors ${
                    genderFilter === f
                      ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple"
                      : "border-arcana-border text-arcana-muted hover:border-arcana-purple"
                  }`}
                >
                  {{ all: "전부", female: "여자", male: "남자" }[f]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sajuCharacters.map((character, index) => (
                <CharacterCard key={character.id} character={character} isSelected={selectedCharacter?.id === character.id}
                  onClick={() => handleCharacterSelect(character)} index={index} />
              ))}
            </div>
          </motion.div>
        ) : step === "info-input" ? (
          <motion.div key="info-input" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100vh-7rem)] md:h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
            {selectedCharacter && (
              <div className="h-[20%] md:h-auto md:w-[50%] flex-shrink-0 overflow-hidden">
                <CharacterDisplay character={selectedCharacter} mood="smile" className="w-full h-full" />
              </div>
            )}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-8 py-3 overflow-y-auto">
              <UserInfoForm
                mode="saju"
                onSubmit={handleInfoSubmit}
                onBack={handleBack}
                characterName={selectedCharacter?.name}
              />
            </div>
          </motion.div>
        ) : step === "topic-select" ? (
          <motion.div key="topic-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 min-h-[calc(100vh-7rem)] md:h-[calc(100vh-3.5rem)] flex flex-col md:flex-row md:overflow-hidden">
            <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
              {selectedCharacter && (
                <div className="h-[25vh] md:h-auto md:absolute md:inset-0 overflow-hidden">
                  <CharacterDisplay character={selectedCharacter} mood="mystical" className="w-full h-full" />
                </div>
              )}
              <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-4 md:pb-4">
                <DialogueBox messages={dialogueMessages} characterName={selectedCharacter?.name} />
              </div>
            </div>
            <div className="flex-1 md:w-[50%] flex flex-col justify-center px-4 md:px-6 py-4">
              <button onClick={handleBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
                ← 정보 수정
              </button>
              <h3 className="font-serif font-bold text-base md:text-lg mb-4">상담 주제를 선택해주세요</h3>
              <div className="grid grid-cols-1 gap-2">
                {sajuTopics.map((topic, index) => (
                  <motion.button key={topic.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleTopicSelect(topic.id)}
                    className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3">
                    <span className="text-xl">{topic.icon}</span>
                    <div>
                      <h4 className="font-serif font-bold text-sm group-hover:text-arcana-purple transition-colors">{topic.label}</h4>
                      <p className="text-arcana-muted text-xs mt-0.5">{topic.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
