"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Topic } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getAvailableCharacters } from "@/data/characters";
import { getSpreadForTopic } from "@/data/spreads";
import { CharacterConfig } from "@/types/character";
import { ChatMessage } from "@/types/session";

const topics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "love", label: "연애/관계", icon: "💕", desc: "사랑과 인간관계에 대한 상담" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", icon: "✨", desc: "자유로운 주제의 종합 상담" },
];

type PageStep = "character-select" | "topic-select";

export default function TarotPage() {
  const router = useRouter();
  const { setTopic, setSpreadType, setPhase, setCharacterId } = useSessionStore();
  const availableCharacters = getAvailableCharacters();

  const [step, setStep] = useState<PageStep>("character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);

  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setDialogueMessages([{
      id: crypto.randomUUID(),
      role: "character",
      content: character.greeting,
      mood: "smile",
      timestamp: new Date(),
    }]);
    setTimeout(() => setStep("topic-select"), 500);
  };

  const handleTopicSelect = (topic: Topic) => {
    const spread = getSpreadForTopic(topic);
    setTopic(topic);
    setSpreadType(spread.type, spread.positions.length);
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  const handleBack = () => {
    setStep("character-select");
    setSelectedCharacter(null);
    setDialogueMessages([]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      <ParticleOverlay density="low" className="z-10" />

      <AnimatePresence mode="wait">
        {step === "character-select" ? (
          <motion.div
            key="character-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-4xl mx-auto px-4 py-8 relative z-20"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold mb-2 drop-shadow-md">상담사를 선택해주세요</h2>
              <p className="text-arcana-muted drop-shadow-sm">각 상담사마다 다른 스타일의 리딩을 제공합니다</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableCharacters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSelected={selectedCharacter?.id === character.id}
                  onClick={() => handleCharacterSelect(character)}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="topic-select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-20 min-h-[calc(100vh-3.5rem)] flex flex-col"
          >
            <div className="flex-shrink-0">
              <DialogueBox
                messages={dialogueMessages}
                characterName={selectedCharacter?.name}
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-end md:flex-1 relative">
              {selectedCharacter && (
                <div className="hidden md:flex w-[50%] max-w-[480px] flex-shrink-0 justify-center">
                  <CharacterDisplay
                    character={selectedCharacter}
                    mood="smile"
                    size="large"
                    className="h-full"
                  />
                </div>
              )}

              <div className="flex flex-col justify-center px-4 md:px-6 py-4 md:pb-8 w-full">
                <button
                  onClick={handleBack}
                  className="self-start mb-3 md:mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
                >
                  ← 다른 상담사 선택
                </button>
                <h3 className="font-serif font-bold text-lg mb-3 md:mb-4 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h3>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  {topics.map((topic, index) => (
                    <motion.button
                      key={topic.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      onClick={() => handleTopicSelect(topic.id)}
                      className="group bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-xl p-3 md:p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3"
                    >
                      <span className="text-xl">{topic.icon}</span>
                      <div>
                        <h4 className="font-serif font-bold text-sm group-hover:text-arcana-purple transition-colors">{topic.label}</h4>
                        <p className="text-arcana-muted text-xs mt-0.5">{topic.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
