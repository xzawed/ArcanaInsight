"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Topic } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { UserInfo } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm, UserInfoData } from "@/components/tarot/UserInfoForm";
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

type PageStep = "character-select" | "character-detail" | "topic-select" | "user-info";

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
    setStep("character-detail");
  };

  const handleConfirmCharacter = () => {
    setStep("topic-select");
  };

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const handleTopicSelect = (topic: Topic) => {
    const spread = getSpreadForTopic(topic);
    setTopic(topic);
    setSelectedTopic(topic);
    setSpreadType(spread.type, spread.positions.length);
    // 바로 세션 진입 (개인정보는 선택 사항)
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  const handleOpenUserInfo = () => {
    setStep("user-info");
  };

  const handleUserInfoSubmit = (data: UserInfoData) => {
    useSessionStore.getState().setUserInfo({
      name: data.name,
      birthDate: data.birthDate,
      gender: data.gender as UserInfo["gender"],
      birthHour: data.birthHour,
    });
    // 주제가 이미 선택되어 있으면 세션 진입, 아니면 주제 선택으로
    if (selectedTopic) {
      setPhase("card-shuffle");
      router.push("/tarot/session");
    } else {
      setStep("topic-select");
    }
  };

  const handleBack = () => {
    if (step === "user-info") {
      setStep("topic-select");
    } else if (step === "topic-select") {
      setStep("character-select");
      setSelectedCharacter(null);
      setDialogueMessages([]);
    } else {
      setStep("character-select");
      setSelectedCharacter(null);
      setDialogueMessages([]);
    }
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
              <h2 className="text-xl md:text-2xl font-serif font-bold mb-2 drop-shadow-md">상담사를 선택해주세요</h2>
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
        ) : step === "character-detail" && selectedCharacter ? (
          <motion.div
            key="character-detail"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-20 h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 좌측: 모바일 상단 35% / 데스크탑 50% */}
            <div className="h-[35%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
              <div className="absolute inset-0 overflow-hidden">
                <CharacterDisplay
                  character={selectedCharacter}
                  mood="smile"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* 우측: 모바일 하단 / 데스크탑 50% */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-10 py-4 md:py-6 overflow-y-auto">
              <button
                onClick={handleBack}
                className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
              >
                ← 다른 상담사 선택
              </button>

              <div className="space-y-5">
                {/* 이름 */}
                <div>
                  <h2 className="text-3xl font-serif font-bold text-arcana-purple drop-shadow-md">
                    {selectedCharacter.name}
                  </h2>
                  <p className="text-arcana-muted text-sm mt-1">{selectedCharacter.nameJp}</p>
                </div>

                {/* 특기 태그 */}
                <div className="inline-block px-3 py-1 bg-arcana-purple/20 border border-arcana-purple/40 rounded-full">
                  <span className="text-arcana-purple text-xs font-serif">{selectedCharacter.speciality}</span>
                </div>

                {/* 상세 소개 */}
                <p className="text-arcana-text text-sm leading-relaxed">
                  {selectedCharacter.description}
                </p>

                {/* 말투 스타일 */}
                <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4">
                  <h4 className="text-arcana-gold text-xs font-serif font-bold mb-2">리딩 스타일</h4>
                  <p className="text-arcana-muted text-xs leading-relaxed">{selectedCharacter.speechStyle}</p>
                </div>

                {/* 인사 미리보기 */}
                <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4">
                  <h4 className="text-arcana-gold text-xs font-serif font-bold mb-2">첫 인사</h4>
                  <p className="text-arcana-text text-sm italic leading-relaxed">&ldquo;{selectedCharacter.greeting}&rdquo;</p>
                </div>

                {/* 상담 시작 버튼 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmCharacter}
                  className="w-full px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                >
                  {selectedCharacter.name}와 상담 시작하기
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : step === "topic-select" ? (
          <motion.div
            key="topic-select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 캐릭터 + 대사: 모바일 상단 / 데스크탑 좌측 50% */}
            <div className="h-[40%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
              {/* 캐릭터 (전체 영역 꽉 채움) */}
              {selectedCharacter && (
                <div className="absolute inset-0 overflow-hidden">
                  <CharacterDisplay
                    character={selectedCharacter}
                    mood="smile"
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* 대사 (캐릭터 하단에 오버레이) */}
              <div className="absolute bottom-0 left-0 right-0 z-20">
                <DialogueBox
                  messages={dialogueMessages}
                  characterName={selectedCharacter?.name}
                />
              </div>
            </div>

            {/* 카테고리: 모바일 하단 / 데스크탑 우측 50% */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-center px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
              <button
                onClick={handleBack}
                className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
              >
                ← 다른 상담사 선택
              </button>
              <h3 className="font-serif font-bold text-base md:text-lg mb-4 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h3>
              <div className="grid grid-cols-1 gap-3">
                {topics.map((topic, index) => (
                  <motion.button
                    key={topic.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTopicSelect(topic.id)}
                    className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3"
                  >
                    <span className="text-xl">{topic.icon}</span>
                    <div>
                      <h4 className="font-serif font-bold text-sm group-hover:text-arcana-purple transition-colors">{topic.label}</h4>
                      <p className="text-arcana-muted text-xs mt-0.5">{topic.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* 개인정보 입력 (선택 사항) */}
              <button
                type="button"
                onClick={handleOpenUserInfo}
                className="mt-4 w-full py-2.5 rounded-full border border-arcana-border text-arcana-muted text-xs font-serif hover:border-arcana-purple hover:text-arcana-purple transition-colors"
              >
                📝 개인정보 입력하고 더 정확한 리딩 받기 (선택)
              </button>
            </div>
          </motion.div>
        ) : step === "user-info" ? (
          <motion.div
            key="user-info"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-20 h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 캐릭터 */}
            {selectedCharacter && (
              <div className="h-[35%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
                <div className="absolute inset-0 overflow-hidden">
                  <CharacterDisplay
                    character={selectedCharacter}
                    mood="default"
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* 폼 */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-10 py-4 md:py-6 overflow-y-auto">
              <UserInfoForm
                onSubmit={handleUserInfoSubmit}
                onBack={() => setStep("topic-select")}
                characterName={selectedCharacter?.name}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
