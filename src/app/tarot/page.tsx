"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Topic, SpreadType, ChatMessage } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { UserInfo } from "@/types/user-info";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";
import { spreads } from "@/data/spreads";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { Icon } from "@/components/common/Icon";
import { TAROT_COPY } from "@/data/ui-copy";
import { ServiceBackground } from "@/components/effects/ServiceBackground";

const topics: { id: Topic; label: string; iconId: string; desc: string }[] = [
  { id: "love-single", label: "연애 (솔로)", iconId: "topic-love-single", desc: "새로운 만남과 인연에 대한 상담" },
  { id: "love-couple", label: "연애 (커플)", iconId: "topic-love-couple", desc: "현재 관계의 발전과 미래에 대한 상담" },
  { id: "career", label: "직장/진로", iconId: "topic-career", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", iconId: "topic-finance", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", iconId: "topic-health", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", iconId: "topic-general", desc: "자유로운 주제의 종합 상담" },
];

const spreadOptions: { type: SpreadType; label: string; iconId: string; cards: number; desc: string; detail: string }[] = [
  { type: "one-card", label: "원카드", iconId: "spread-card", cards: 1, desc: "빠르고 직관적인 답변", detail: "하나의 카드로 질문에 대한 핵심 메시지를 받습니다. 간단한 질문이나 오늘의 조언이 필요할 때 적합합니다." },
  { type: "three-card", label: "쓰리카드", iconId: "spread-three", cards: 3, desc: "과거 · 현재 · 미래", detail: "세 장의 카드로 시간의 흐름에 따른 상황 변화를 읽습니다. 과거의 원인, 현재의 상태, 미래의 방향을 종합적으로 파악합니다." },
  { type: "five-card", label: "켈틱 크로스 (5장)", iconId: "spread-five", cards: 5, desc: "심층 다각도 분석", detail: "다섯 장의 카드로 현재 상황, 도전, 기반, 가까운 미래, 최종 결과를 다각도로 분석합니다. 복잡한 상황에 깊이 있는 통찰이 필요할 때 추천합니다." },
  { type: "celtic-cross", label: "켈틱 크로스 (10장)", iconId: "spread-celtic", cards: 10, desc: "전통 10장 종합 분석", detail: "가장 유명한 전통 타로 배열법입니다. 현재 상황, 방해 요소, 과거, 의식, 근미래, 자아, 외부 환경, 희망과 두려움, 최종 결과까지 10개 관점에서 심층 분석합니다." },
  { type: "relationship", label: "관계 스프레드", iconId: "spread-relationship", cards: 7, desc: "두 사람의 관계 분석", detail: "나와 상대방의 시각, 관계의 의미, 장애물과 강점을 양면에서 거울처럼 분석합니다. 연인, 가족, 친구 등 모든 대인 관계 상담에 최적화되어 있습니다." },
  { type: "horseshoe", label: "말굽 스프레드", iconId: "spread-horseshoe", cards: 7, desc: "시간 흐름 + 내외부 요인", detail: "U자 모양으로 과거에서 미래까지의 흐름을 보여주며, 심리 상태·외부 환경·장애물을 함께 분석합니다. 재정·커리어 등 복합적 상황에 적합합니다." },
  { type: "decision", label: "의사결정", iconId: "spread-decision", cards: 5, desc: "두 갈래 길의 선택", detail: "문제의 핵심을 파악한 뒤 두 가지 선택지와 각각의 결과를 비교합니다. 중요한 결정 앞에서 방향을 찾을 때 도움을 줍니다." },
  { type: "week-ahead", label: "한 주 전망", iconId: "spread-week", cards: 7, desc: "월요일부터 일요일까지", detail: "이번 주 7일간의 에너지와 테마를 하루씩 카드로 읽어드립니다. 한 주를 의미 있게 준비하고 싶을 때 추천합니다." },
  { type: "zodiac", label: "조디악 휠", iconId: "spread-zodiac", cards: 12, desc: "12하우스 인생 전반", detail: "점성술의 12하우스에 각각 카드를 배치하여 자아·재정·소통·가정·사랑·건강·관계·변화·철학·커리어·우정·영성을 종합 분석합니다." },
  { type: "tree-of-life", label: "생명의 나무", iconId: "spread-tree", cards: 10, desc: "카발라 영적 탐구", detail: "카발라의 세피로트 10개에 카드를 배치하여 영적 목표·지혜·이해·자비·도전·균형·감정·지성·잠재의식·현실을 탐구하는 심층 배열법입니다." },
];

const topicSpreads: Record<Topic, SpreadType[]> = {
  "love-single": ["one-card", "three-card", "five-card", "celtic-cross"],
  "love-couple": ["one-card", "three-card", "relationship", "celtic-cross"],
  career: ["one-card", "three-card", "five-card", "horseshoe", "celtic-cross"],
  finance: ["one-card", "three-card", "horseshoe", "decision", "celtic-cross"],
  health: ["one-card", "three-card", "five-card"],
  general: ["one-card", "three-card", "five-card", "celtic-cross", "week-ahead", "zodiac", "tree-of-life"],
  "saju-general": [], "saju-love-single": [], "saju-love-couple": [],
  "saju-career": [], "saju-health": [], "saju-personality": [],
  "saju-compatibility": [], "saju-auspicious-date": [],
  "shinjeom-general": [], "shinjeom-love": [], "shinjeom-wealth": [], "shinjeom-health": [],
  "shinjeom-career": [], "shinjeom-auspicious": [],
  love: ["one-card", "three-card", "five-card", "relationship", "celtic-cross"],
};

type PageStep = "character-select" | "topic-select" | "spread-select" | "user-info";

// ─── Step sub-components ────────────────────────────────────────────────────

function CharacterSelectStep({ availableCharacters, genderFilter, setGenderFilter, selectedCharacter, onSelect }: Readonly<{
  availableCharacters: CharacterConfig[];
  genderFilter: GenderFilter;
  setGenderFilter: (f: GenderFilter) => void;
  selectedCharacter: CharacterConfig | null;
  onSelect: (c: CharacterConfig) => void;
}>) {
  return (
    <motion.div key="character-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl mx-auto px-4 py-8 relative z-20">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2 drop-shadow-md">{TAROT_COPY.characterSelect.heading}</h2>
        <p className="text-arcana-muted text-sm md:text-base drop-shadow-sm">{TAROT_COPY.characterSelect.sub}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {(["all", "female", "male"] as GenderFilter[]).map((f) => (
          <button key={f} onClick={() => setGenderFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-display font-bold border transition-colors ${
              genderFilter === f
                ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple"
                : "border-arcana-border text-arcana-muted hover:border-arcana-purple"
            }`}>
            {{ all: "전부", female: "여자", male: "남자" }[f]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {availableCharacters.map((character, index) => (
          <CharacterCard key={character.id} character={character} isSelected={selectedCharacter?.id === character.id}
            onClick={() => onSelect(character)} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

function TopicSelectStep({ selectedCharacter, dialogueMessages, onBack, onTopicSelect }: Readonly<{
  selectedCharacter: CharacterConfig;
  dialogueMessages: ChatMessage[];
  onBack: () => void;
  onTopicSelect: (t: Topic) => void;
}>) {
  return (
    <motion.div key="topic-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
        <div className="h-[25%] md:h-auto md:absolute md:inset-0 overflow-hidden">
          <CharacterDisplay character={selectedCharacter} mood="smile" className="w-full h-full" />
        </div>
        <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-4 md:pb-4">
          <DialogueBox messages={dialogueMessages} characterName={selectedCharacter.name} />
        </div>
      </div>
      <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
        <button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {TAROT_COPY.back.character}
        </button>
        <h3 className="font-sans font-bold text-base md:text-lg mb-4 drop-shadow-md">{TAROT_COPY.topicSelect.heading}</h3>
        <div className="grid grid-cols-1 gap-2 md:gap-3">
          {topics.map((topic, index) => (
            <motion.button key={topic.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }} whileTap={{ scale: 0.97 }}
              onClick={() => onTopicSelect(topic.id)}
              className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3 md:p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3">
              <Icon id={topic.iconId} size={24} />
              <div>
                <h4 className="font-sans font-bold text-sm group-hover:text-arcana-purple transition-colors">{topic.label}</h4>
                <p className="text-arcana-muted text-xs md:text-sm mt-0.5">{topic.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SpreadSelectStep({ selectedCharacter, dialogueMessages, selectedTopic, onBack, onSpreadSelect, onOpenUserInfo }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  dialogueMessages: ChatMessage[];
  selectedTopic: Topic | null;
  onBack: () => void;
  onSpreadSelect: (s: SpreadType) => void;
  onOpenUserInfo: () => void;
}>) {
  const filteredSpreads = spreadOptions.filter((opt) => !selectedTopic || topicSpreads[selectedTopic]?.includes(opt.type));
  return (
    <motion.div key="spread-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
        {selectedCharacter && (
          <div className="h-[25%] md:h-auto md:absolute md:inset-0 overflow-hidden">
            <CharacterDisplay character={selectedCharacter} mood="mystical" className="w-full h-full" />
          </div>
        )}
        <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-4 md:pb-4">
          <DialogueBox messages={dialogueMessages} characterName={selectedCharacter?.name} />
        </div>
      </div>
      <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
        <button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {TAROT_COPY.back.topic}
        </button>
        <h3 className="font-sans font-bold text-base md:text-lg mb-2 drop-shadow-md">{TAROT_COPY.spreadSelect.heading}</h3>
        <p className="text-arcana-muted text-xs mb-4">{TAROT_COPY.spreadSelect.sub}</p>
        <div className="grid grid-cols-1 gap-3">
          {filteredSpreads.map((opt, index) => (
            <motion.button key={opt.type} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }} whileTap={{ scale: 0.97 }}
              onClick={() => onSpreadSelect(opt.type)}
              className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10">
              <div className="flex items-center gap-3 mb-2">
                <Icon id={opt.iconId} size={28} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans font-bold text-sm group-hover:text-arcana-purple transition-colors">{opt.label}</h4>
                    <span className="text-arcana-gold text-[10px] font-bold bg-arcana-gold/10 px-2 py-0.5 rounded-full">{opt.cards}장</span>
                  </div>
                  <p className="text-arcana-purple text-xs font-sans mt-0.5">{opt.desc}</p>
                </div>
              </div>
              <p className="text-arcana-muted text-xs leading-relaxed">{opt.detail}</p>
            </motion.button>
          ))}
        </div>
        <button type="button" onClick={onOpenUserInfo}
          className="mt-4 w-full py-2.5 rounded-full border border-arcana-border text-arcana-muted text-xs font-sans hover:border-arcana-purple hover:text-arcana-purple transition-colors">
          <span className="inline-flex items-center gap-1"><Icon id="ui-info" size={14} /> {TAROT_COPY.spreadSelect.userInfoBtn}</span>
        </button>
      </div>
    </motion.div>
  );
}

function UserInfoStep({ selectedCharacter, onSubmit, onBack }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  onSubmit: (data: UserInfo) => void;
  onBack: () => void;
}>) {
  return (
    <motion.div key="user-info" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      {selectedCharacter && (
        <div className="h-[25%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative">
          <div className="absolute inset-0 overflow-hidden">
            <CharacterDisplay character={selectedCharacter} mood="default" className="w-full h-full" />
          </div>
        </div>
      )}
      <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-10 py-4 md:py-6 overflow-y-auto">
        <UserInfoForm mode="tarot" onSubmit={onSubmit} onBack={onBack} characterName={selectedCharacter?.name} />
      </div>
    </motion.div>
  );
}

// ─── Page state + routing ───────────────────────────────────────────────────

function TarotPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTopic, setSpreadType, setPhase, setCharacterId } = useSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const availableCharacters = getCharactersByGender(genderFilter);

  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "topic-select" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);

  // 프리셀렉트된 캐릭터: 스토어 반영 + 인사 메시지 생성 (클라이언트 마운트 후 — new Date() SSR 비결정 방지)
  useEffect(() => {
    if (preselectedChar) {
      setCharacterId(preselectedChar.id);
      setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: preselectedChar.greeting, mood: "smile", timestamp: new Date() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선호 상담사 fallback: URL 파라미터 없이 직접 접속한 경우 자동 선택
  const { favoriteCharacter } = useFavoriteCharacter(!!preselectedChar);
  useEffect(() => {
    if (favoriteCharacter && !selectedCharacter) {
      setSelectedCharacter(favoriteCharacter);
      setCharacterId(favoriteCharacter.id);
      setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: favoriteCharacter.greeting, mood: "smile", timestamp: new Date() }]);
      setStep("topic-select");
    }
  }, [favoriteCharacter, selectedCharacter, setCharacterId]);

  // 스텝 전환 시 스크롤 최상단 초기화 (3중 보정: 즉시 + rAF + rAF)
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto']").forEach((el) => { el.scrollTop = 0; });
    };
    resetScroll();
    requestAnimationFrame(() => { resetScroll(); requestAnimationFrame(resetScroll); });
  }, [step]);

  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: character.greeting, mood: "smile", timestamp: new Date() }]);
    setStep("topic-select");
  };

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

  const handleUserInfoSubmit = (data: UserInfo) => {
    useSessionStore.getState().setUserInfo(data);
    setStep(selectedTopic ? "spread-select" : "topic-select");
  };

  const handleBack = () => {
    if (step === "user-info") { setStep("spread-select"); return; }
    if (step === "spread-select") { setStep("topic-select"); return; }
    setStep("character-select");
    setSelectedCharacter(null);
    setDialogueMessages([]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ServiceBackground service="tarot" />
      <ParticleOverlay density="low" className="z-10" />
      <AnimatePresence mode="wait">
        {step === "character-select" && (
          <CharacterSelectStep availableCharacters={availableCharacters} genderFilter={genderFilter}
            setGenderFilter={setGenderFilter} selectedCharacter={selectedCharacter} onSelect={handleCharacterSelect} />
        )}
        {step === "topic-select" && selectedCharacter && (
          <TopicSelectStep selectedCharacter={selectedCharacter} dialogueMessages={dialogueMessages}
            onBack={handleBack} onTopicSelect={handleTopicSelect} />
        )}
        {step === "spread-select" && (
          <SpreadSelectStep selectedCharacter={selectedCharacter} dialogueMessages={dialogueMessages}
            selectedTopic={selectedTopic} onBack={handleBack} onSpreadSelect={handleSpreadSelect}
            onOpenUserInfo={() => setStep("user-info")} />
        )}
        {step === "user-info" && (
          <UserInfoStep selectedCharacter={selectedCharacter} onSubmit={handleUserInfoSubmit} onBack={() => setStep("topic-select")} />
        )}
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
