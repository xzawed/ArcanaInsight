"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Topic, SpreadType } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { UserInfo } from "@/types/user-info";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { spreads } from "@/data/spreads";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { ChatMessage } from "@/types/session";

const topics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "love-single", label: "연애 (솔로)", icon: "💝", desc: "새로운 만남과 인연에 대한 상담" },
  { id: "love-couple", label: "연애 (커플)", icon: "💑", desc: "현재 관계의 발전과 미래에 대한 상담" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", icon: "✨", desc: "자유로운 주제의 종합 상담" },
];

const spreadOptions: { type: SpreadType; label: string; icon: string; cards: number; desc: string; detail: string }[] = [
  {
    type: "one-card", label: "원카드", icon: "🃏", cards: 1,
    desc: "빠르고 직관적인 답변",
    detail: "하나의 카드로 질문에 대한 핵심 메시지를 받습니다. 간단한 질문이나 오늘의 조언이 필요할 때 적합합니다.",
  },
  {
    type: "three-card", label: "쓰리카드", icon: "🎴", cards: 3,
    desc: "과거 · 현재 · 미래",
    detail: "세 장의 카드로 시간의 흐름에 따른 상황 변화를 읽습니다. 과거의 원인, 현재의 상태, 미래의 방향을 종합적으로 파악합니다.",
  },
  {
    type: "five-card", label: "켈틱 크로스 (5장)", icon: "✦", cards: 5,
    desc: "심층 다각도 분석",
    detail: "다섯 장의 카드로 현재 상황, 도전, 기반, 가까운 미래, 최종 결과를 다각도로 분석합니다. 복잡한 상황에 깊이 있는 통찰이 필요할 때 추천합니다.",
  },
  {
    type: "celtic-cross", label: "켈틱 크로스 (10장)", icon: "☘️", cards: 10,
    desc: "전통 10장 종합 분석",
    detail: "가장 유명한 전통 타로 배열법입니다. 현재 상황, 방해 요소, 과거, 의식, 근미래, 자아, 외부 환경, 희망과 두려움, 최종 결과까지 10개 관점에서 심층 분석합니다.",
  },
  {
    type: "relationship", label: "관계 스프레드", icon: "💕", cards: 7,
    desc: "두 사람의 관계 분석",
    detail: "나와 상대방의 시각, 관계의 의미, 장애물과 강점을 양면에서 거울처럼 분석합니다. 연인, 가족, 친구 등 모든 대인 관계 상담에 최적화되어 있습니다.",
  },
  {
    type: "horseshoe", label: "말굽 스프레드", icon: "🔮", cards: 7,
    desc: "시간 흐름 + 내외부 요인",
    detail: "U자 모양으로 과거에서 미래까지의 흐름을 보여주며, 심리 상태·외부 환경·장애물을 함께 분석합니다. 재정·커리어 등 복합적 상황에 적합합니다.",
  },
  {
    type: "decision", label: "의사결정", icon: "⚖️", cards: 5,
    desc: "두 갈래 길의 선택",
    detail: "문제의 핵심을 파악한 뒤 두 가지 선택지와 각각의 결과를 비교합니다. 중요한 결정 앞에서 방향을 찾을 때 도움을 줍니다.",
  },
  {
    type: "week-ahead", label: "한 주 전망", icon: "📅", cards: 7,
    desc: "월요일부터 일요일까지",
    detail: "이번 주 7일간의 에너지와 테마를 하루씩 카드로 읽어드립니다. 한 주를 의미 있게 준비하고 싶을 때 추천합니다.",
  },
  {
    type: "zodiac", label: "조디악 휠", icon: "♈", cards: 12,
    desc: "12하우스 인생 전반",
    detail: "점성술의 12하우스에 각각 카드를 배치하여 자아·재정·소통·가정·사랑·건강·관계·변화·철학·커리어·우정·영성을 종합 분석합니다.",
  },
  {
    type: "tree-of-life", label: "생명의 나무", icon: "🌳", cards: 10,
    desc: "카발라 영적 탐구",
    detail: "카발라의 세피로트 10개에 카드를 배치하여 영적 목표·지혜·이해·자비·도전·균형·감정·지성·잠재의식·현실을 탐구하는 심층 배열법입니다.",
  },
];

/** 주제별 사용 가능한 스프레드 매핑 — 성격이 맞지 않는 조합은 노출하지 않음 */
const topicSpreads: Record<Topic, SpreadType[]> = {
  "love-single": ["one-card", "three-card", "five-card", "celtic-cross"],
  "love-couple": ["one-card", "three-card", "relationship", "celtic-cross"],
  career: ["one-card", "three-card", "five-card", "horseshoe", "celtic-cross"],
  finance: ["one-card", "three-card", "horseshoe", "decision", "celtic-cross"],
  health: ["one-card", "three-card", "five-card"],
  general: ["one-card", "three-card", "five-card", "celtic-cross", "week-ahead", "zodiac", "tree-of-life"],
  // 사주 주제는 타로에서 사용하지 않지만 타입 안전성을 위해 빈 배열
  "saju-general": [], "saju-love-single": [], "saju-love-couple": [],
  "saju-career": [], "saju-health": [], "saju-personality": [],
  "saju-compatibility": [], "saju-auspicious-date": [],
  "shinjeom-general": [], "shinjeom-love": [], "shinjeom-wealth": [], "shinjeom-health": [],
  love: ["one-card", "three-card", "five-card", "relationship", "celtic-cross"],
};

type PageStep = "character-select" | "character-detail" | "topic-select" | "spread-select" | "user-info";

function TarotPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTopic, setSpreadType, setPhase, setCharacterId } = useSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const availableCharacters = getCharactersByGender(genderFilter);

  // 홈에서 캐릭터를 선택하고 왔을 때 자동으로 캐릭터 상세로 진입
  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "character-detail" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>(() =>
    preselectedChar ? [{
      id: crypto.randomUUID(),
      role: "character" as const,
      content: preselectedChar.greeting,
      mood: "smile",
      timestamp: new Date(),
    }] : []
  );

  // 프리셀렉트된 캐릭터 ID를 스토어에 반영
  useEffect(() => {
    if (preselectedChar) {
      setCharacterId(preselectedChar.id);
    }
  }, [preselectedChar, setCharacterId]);

  // 스텝 전환 시 스크롤 최상단 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto']")
      .forEach((el) => { el.scrollTop = 0; });
  }, [step]);

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
    setTopic(topic);
    setSelectedTopic(topic);
    setStep("spread-select");
  };

  const handleSpreadSelect = (spreadType: SpreadType) => {
    const spread = spreads[spreadType];
    setSpreadType(spread.type, spread.positions.length);
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  const handleOpenUserInfo = () => {
    setStep("user-info");
  };

  const handleUserInfoSubmit = (data: UserInfo) => {
    useSessionStore.getState().setUserInfo(data);
    if (selectedTopic) {
      setStep("spread-select");
    } else {
      setStep("topic-select");
    }
  };

  const handleBack = () => {
    if (step === "user-info") {
      setStep("spread-select");
    } else if (step === "spread-select") {
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
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 좌측: 모바일 상단 25% / 데스크탑 50% */}
            <div className="h-[25%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
              <div className="absolute inset-0 overflow-hidden">
                <CharacterDisplay
                  character={selectedCharacter}
                  mood="smile"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* 우측: 모바일 하단 / 데스크탑 50% */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-10 py-3 md:py-6 overflow-y-auto">
              <button
                onClick={handleBack}
                className="self-start mb-2 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
              >
                ← 다른 상담사 선택
              </button>

              <div className="space-y-3">
                {/* 이름 + 특기 */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple drop-shadow-md">
                    {selectedCharacter.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-arcana-muted text-xs">{selectedCharacter.nameJp}</p>
                    <span className="px-2 py-0.5 bg-arcana-purple/20 border border-arcana-purple/40 rounded-full text-arcana-purple text-[10px] font-serif">
                      {selectedCharacter.speciality}
                    </span>
                  </div>
                </div>

                {/* 상세 소개 */}
                <p className="text-arcana-text text-sm leading-relaxed">
                  {selectedCharacter.description}
                </p>

                {/* 리딩 스타일 + 첫 인사 (모바일에서 가로 배치) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3">
                    <h4 className="text-arcana-gold text-[10px] font-serif font-bold mb-1">리딩 스타일</h4>
                    <p className="text-arcana-muted text-xs leading-relaxed">{selectedCharacter.speechStyle}</p>
                  </div>
                  <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3">
                    <h4 className="text-arcana-gold text-[10px] font-serif font-bold mb-1">첫 인사</h4>
                    <p className="text-arcana-text text-xs italic leading-relaxed line-clamp-2">&ldquo;{selectedCharacter.greeting}&rdquo;</p>
                  </div>
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
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 캐릭터 + 대사: 모바일 세로 배치 / 데스크탑 좌측 50% 오버레이 */}
            <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
              {/* 캐릭터 */}
              {selectedCharacter && (
                <div className="h-[25%] md:h-auto md:absolute md:inset-0 overflow-hidden">
                  <CharacterDisplay
                    character={selectedCharacter}
                    mood="smile"
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* 대사: 모바일은 캐릭터 아래 / 데스크탑은 하단 오버레이 */}
              <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-4 md:pb-4">
                <DialogueBox
                  messages={dialogueMessages}
                  characterName={selectedCharacter?.name}
                />
              </div>
            </div>

            {/* 카테고리: 모바일 하단 / 데스크탑 우측 50% */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
              <button
                onClick={handleBack}
                className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
              >
                ← 다른 상담사 선택
              </button>
              <h3 className="font-serif font-bold text-base md:text-lg mb-4 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h3>
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {topics.map((topic, index) => (
                  <motion.button
                    key={topic.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTopicSelect(topic.id)}
                    className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3 md:p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3"
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
          </motion.div>
        ) : step === "spread-select" ? (
          <motion.div
            key="spread-select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 캐릭터 + 대사 */}
            <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
              {selectedCharacter && (
                <div className="h-[25%] md:h-auto md:absolute md:inset-0 overflow-hidden">
                  <CharacterDisplay character={selectedCharacter} mood="mystical" className="w-full h-full" />
                </div>
              )}
              <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-4 md:pb-4">
                <DialogueBox
                  messages={dialogueMessages}
                  characterName={selectedCharacter?.name}
                />
              </div>
            </div>

            {/* 스프레드 선택 */}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
              <button onClick={handleBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
                ← 주제 다시 선택
              </button>
              <h3 className="font-serif font-bold text-base md:text-lg mb-2 drop-shadow-md">카드 리딩 방식을 선택해주세요</h3>
              <p className="text-arcana-muted text-xs mb-4">카드 수가 많을수록 더 깊이 있는 해석을 받을 수 있어요</p>

              <div className="grid grid-cols-1 gap-3">
                {spreadOptions.filter((opt) => !selectedTopic || topicSpreads[selectedTopic]?.includes(opt.type)).map((opt, index) => (
                  <motion.button
                    key={opt.type}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSpreadSelect(opt.type)}
                    className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-sm group-hover:text-arcana-purple transition-colors">{opt.label}</h4>
                          <span className="text-arcana-gold text-[10px] font-bold bg-arcana-gold/10 px-2 py-0.5 rounded-full">{opt.cards}장</span>
                        </div>
                        <p className="text-arcana-purple text-xs font-serif mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <p className="text-arcana-muted text-xs leading-relaxed">{opt.detail}</p>
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
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden"
          >
            {/* 캐릭터 */}
            {selectedCharacter && (
              <div className="h-[25%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
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
                mode="tarot"
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

export default function TarotPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    }>
      <TarotPageContent />
    </Suspense>
  );
}
