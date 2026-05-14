"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Topic, SpreadType, ChatMessage, SpreadDefinition } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { UserInfo } from "@/types/user-info";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";
import { spreads, getSpreadName, getSpreadShortDesc, getSpreadDetail } from "@/data/spreads";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { Icon } from "@/components/common/Icon";
import { ServiceBackground } from "@/components/effects/ServiceBackground";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { getTopicLabel, getTopicDesc, getTopicIconId } from "@/data/topics-meta";

const TAROT_TOPIC_IDS: Topic[] = ["love-single", "love-couple", "career", "finance", "health", "general"];

const topicSpreads: Partial<Record<Topic, SpreadType[]>> = {
  "love-single": ["one-card", "three-card", "five-card", "celtic-cross"],
  "love-couple": ["one-card", "three-card", "relationship", "celtic-cross"],
  career: ["one-card", "three-card", "five-card", "horseshoe", "celtic-cross"],
  finance: ["one-card", "three-card", "horseshoe", "decision", "celtic-cross"],
  health: ["one-card", "three-card", "five-card"],
  general: ["one-card", "three-card", "five-card", "celtic-cross", "week-ahead", "zodiac", "tree-of-life"],
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
  const { t } = useT();
  const genderLabels: Record<GenderFilter, string> = {
    all: t("tarot.page.gender.all"),
    female: t("tarot.page.gender.female"),
    male: t("tarot.page.gender.male"),
  };
  return (
    <motion.div key="character-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl mx-auto px-4 py-8 relative z-20">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2 drop-shadow-md">{t("tarot.page.character-select.heading")}</h2>
        <p className="text-arcana-muted text-sm md:text-base drop-shadow-sm">{t("tarot.page.character-select.sub")}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {(["all", "female", "male"] as GenderFilter[]).map((f) => (
          <button key={f} onClick={() => setGenderFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-display font-bold border transition-colors ${
              genderFilter === f
                ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple"
                : "border-arcana-border text-arcana-muted hover:border-arcana-purple"
            }`}>
            {genderLabels[f]}
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
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
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
        <button onClick={onBack} data-testid="topic-back-btn" className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {t("tarot.page.topic-select.back")}
        </button>
        <h3 className="font-sans font-bold text-base md:text-lg mb-4 drop-shadow-md">{t("tarot.page.topic-select.heading")}</h3>
        <div className="grid grid-cols-1 gap-2 md:gap-3">
          {TAROT_TOPIC_IDS.map((topicId, index) => (
            <motion.button key={topicId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }} whileTap={{ scale: 0.97 }}
              onClick={() => onTopicSelect(topicId)}
              data-testid={`topic-btn-${topicId}`}
              className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-3 md:p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10 flex items-center gap-3">
              <Icon id={getTopicIconId(topicId) ?? "topic-general"} size={24} />
              <div>
                <h4 className="font-sans font-bold text-sm group-hover:text-arcana-purple transition-colors">{getTopicLabel(topicId, locale)}</h4>
                <p className="text-arcana-muted text-xs md:text-sm mt-0.5">{getTopicDesc(topicId, locale)}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SpreadSelectStep({ selectedCharacter, dialogueMessages, selectedTopic, onBack, onSpreadSelect, onOpenUserInfo, freeQuestion, onFreeQuestionChange }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  dialogueMessages: ChatMessage[];
  selectedTopic: Topic | null;
  onBack: () => void;
  onSpreadSelect: (s: SpreadType) => void;
  onOpenUserInfo: () => void;
  freeQuestion: string;
  onFreeQuestionChange: (q: string) => void;
}>) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const visibleTypes: SpreadType[] = (selectedTopic ? topicSpreads[selectedTopic] ?? [] : Object.keys(spreads) as SpreadType[]);
  const filteredSpreads: SpreadDefinition[] = visibleTypes.map((type) => spreads[type]).filter(Boolean);
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
        <button onClick={onBack} data-testid="spread-back-btn" className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {t("tarot.page.spread-select.back")}
        </button>
        <h3 className="font-sans font-bold text-base md:text-lg mb-2 drop-shadow-md">{t("tarot.page.spread-select.heading")}</h3>
        <p className="text-arcana-muted text-xs mb-4">{t("tarot.page.spread-select.sub")}</p>
        <div className="grid grid-cols-1 gap-3">
          {filteredSpreads.map((spread, index) => (
            <motion.button key={spread.type} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }} whileTap={{ scale: 0.97 }}
              onClick={() => onSpreadSelect(spread.type)}
              data-testid={`spread-btn-${spread.type}`}
              className="group bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10">
              <div className="flex items-center gap-3 mb-2">
                <Icon id={spread.iconId ?? "spread-card"} size={28} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans font-bold text-sm group-hover:text-arcana-purple transition-colors">{getSpreadName(spread, locale)}</h4>
                    <span className="text-arcana-gold text-[10px] font-bold bg-arcana-gold/10 px-2 py-0.5 rounded-full">
                      {spread.positions.length}{t("tarot.page.spread-select.cards-suffix")}
                    </span>
                  </div>
                  <p className="text-arcana-purple text-xs font-sans mt-0.5">{getSpreadShortDesc(spread, locale)}</p>
                </div>
              </div>
              <p className="text-arcana-muted text-xs leading-relaxed">{getSpreadDetail(spread, locale)}</p>
            </motion.button>
          ))}
        </div>
        {/* 자유 질문 입력 — optional */}
        <div className="mt-4">
          <label className="block text-arcana-muted text-xs mb-1.5 font-sans">
            {t("tarot.page.spread-select.free-question-label")} <span className="text-arcana-border/60">{t("tarot.page.spread-select.free-question-optional")}</span>
          </label>
          <textarea
            value={freeQuestion}
            onChange={(e) => onFreeQuestionChange(e.target.value)}
            placeholder={t("tarot.page.spread-select.free-question-placeholder")}
            maxLength={200}
            rows={2}
            className="w-full bg-arcana-card/50 border border-arcana-border rounded-xl px-3 py-2 text-arcana-text text-sm placeholder-arcana-muted/50 resize-none focus:outline-none focus:border-arcana-purple transition-colors"
          />
        </div>
        <button type="button" onClick={onOpenUserInfo}
          className="mt-4 w-full py-2.5 rounded-full border border-arcana-border text-arcana-muted text-xs font-sans hover:border-arcana-purple hover:text-arcana-purple transition-colors">
          <span className="inline-flex items-center gap-1"><Icon id="ui-info" size={14} /> {t("tarot.page.spread-select.user-info-btn")}</span>
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
  const locale = useLocaleStore((s) => s.locale);
  const { setTopic, setSpreadType, setPhase, setCharacterId, setFreeQuestion } = useSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const availableCharacters = getCharactersByGender(genderFilter);

  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "topic-select" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);
  const [localFreeQuestion, setLocalFreeQuestion] = useState("");

  // 프리셀렉트된 캐릭터: 스토어 반영 + 인사 메시지 생성 (클라이언트 마운트 후 — new Date() SSR 비결정 방지)
  useEffect(() => {
    if (preselectedChar) {
      setCharacterId(preselectedChar.id);
      setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(preselectedChar, useLocaleStore.getState().locale), mood: "smile", timestamp: new Date() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선호 상담사 fallback: URL 파라미터 없이 직접 접속한 경우 자동 선택
  const { favoriteCharacter } = useFavoriteCharacter(!!preselectedChar);
  useEffect(() => {
    if (favoriteCharacter && !selectedCharacter) {
      setSelectedCharacter(favoriteCharacter);
      setCharacterId(favoriteCharacter.id);
      setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(favoriteCharacter, useLocaleStore.getState().locale), mood: "smile", timestamp: new Date() }]);
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
    setDialogueMessages([{ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(character, locale), mood: "smile", timestamp: new Date() }]);
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
            onOpenUserInfo={() => setStep("user-info")}
            freeQuestion={localFreeQuestion}
            onFreeQuestionChange={(q) => { setLocalFreeQuestion(q); setFreeQuestion(q); }} />
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
