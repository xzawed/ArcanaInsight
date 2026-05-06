"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { motion, AnimatePresence } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { ChatMessage, SajuTimeRange, Topic } from "@/types/session";
import { UserInfo } from "@/types/user-info";
import { sajuTimeOptions, sajuAreaOptions } from "@/data/saju/categories";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { SAJU_COPY } from "@/data/ui-copy";
import { ServiceBackground } from "@/components/effects/ServiceBackground";

type PageStep = "character-select" | "info-input" | "saju-select";

// ─── Step sub-components ────────────────────────────────────────────────────

function CharacterSelectStep({ characters, genderFilter, setGenderFilter, selectedCharacter, onSelect }: Readonly<{
  characters: CharacterConfig[];
  genderFilter: GenderFilter;
  setGenderFilter: (f: GenderFilter) => void;
  selectedCharacter: CharacterConfig | null;
  onSelect: (c: CharacterConfig) => void;
}>) {
  return (
    <motion.div key="char-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-4 py-8 relative z-20">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2">{SAJU_COPY.characterSelect.heading}</h2>
        <p className="text-arcana-muted text-sm md:text-base">{SAJU_COPY.characterSelect.sub}</p>
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
        {characters.map((character, index) => (
          <CharacterCard key={character.id} character={character} isSelected={selectedCharacter?.id === character.id}
            onClick={() => onSelect(character)} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

function InfoInputStep({ selectedCharacter, onSubmit, onBack }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  onSubmit: (info: UserInfo) => void;
  onBack: () => void;
}>) {
  return (
    <motion.div key="info-input" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      {selectedCharacter && (
        <div className="h-[25%] md:h-auto md:w-[50%] flex-shrink-0 overflow-hidden">
          <CharacterDisplay character={selectedCharacter} mood="smile" className="w-full h-full" />
        </div>
      )}
      <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-8 py-3 overflow-y-auto">
        <UserInfoForm mode="saju" onSubmit={onSubmit} onBack={onBack} characterName={selectedCharacter?.name} />
      </div>
    </motion.div>
  );
}

function SajuSelectStep({ selectedCharacter, dialogueMessages, selectedTime, selectedArea, monthlyToggle, canStart,
  freeQuestion, onFreeQuestionChange,
  onBack, onTimeSelect, onAreaSelect, onMonthlyToggle, onStart }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  dialogueMessages: ChatMessage[];
  selectedTime: SajuTimeRange | null;
  selectedArea: Topic | null;
  monthlyToggle: boolean;
  canStart: boolean;
  freeQuestion: string;
  onFreeQuestionChange: (q: string) => void;
  onBack: () => void;
  onTimeSelect: (t: SajuTimeRange, allowMonthly: boolean) => void;
  onAreaSelect: (a: Topic) => void;
  onMonthlyToggle: () => void;
  onStart: () => void;
}>) {
  const selectedTimeOption = sajuTimeOptions.find((t) => t.id === selectedTime);
  return (
    <motion.div key="saju-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
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
      <div className="flex-1 md:w-[50%] flex flex-col px-4 md:px-6 py-4 overflow-y-auto">
        <button onClick={onBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {SAJU_COPY.back.info}
        </button>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon id="ui-hourglass" size={20} />
            <h3 className="font-sans font-bold text-sm md:text-base text-arcana-purple">시간단위</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {sajuTimeOptions.map((opt) => (
              <button key={opt.id} onClick={() => onTimeSelect(opt.id, !!opt.allowMonthly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-bold border transition-all ${
                  selectedTime === opt.id
                    ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple shadow-sm shadow-arcana-purple/20"
                    : "border-arcana-border text-arcana-muted hover:border-arcana-purple/60 bg-arcana-card/50"
                }`}>
                <Icon id={opt.icon} size={18} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          {selectedTimeOption && <p className="text-arcana-muted text-xs mt-1.5 pl-1">{selectedTimeOption.desc}</p>}
        </div>
        {selectedTimeOption?.allowMonthly && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5">
            <label className="flex items-center gap-2 cursor-pointer group w-fit">
              <button
                type="button"
                onClick={onMonthlyToggle}
                role="switch"
                aria-checked={monthlyToggle}
                className={`w-9 h-5 rounded-full transition-colors relative ${monthlyToggle ? "bg-arcana-purple" : "bg-arcana-border"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${monthlyToggle ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs font-sans text-arcana-muted group-hover:text-arcana-text transition-colors">월별 상세 포함</span>
            </label>
          </motion.div>
        )}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Icon id="saju-general" size={20} />
            <h3 className="font-sans font-bold text-sm md:text-base text-arcana-purple">분석영역</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sajuAreaOptions.map((opt) => (
              <button key={opt.id} onClick={() => onAreaSelect(opt.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all ${
                  selectedArea === opt.id
                    ? "border-arcana-purple bg-arcana-purple/15 shadow-sm shadow-arcana-purple/20"
                    : "border-arcana-border bg-arcana-card/50 hover:border-arcana-purple/60"
                }`}>
                <Icon id={opt.icon} size={22} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className={`text-xs md:text-sm font-display font-bold truncate ${selectedArea === opt.id ? "text-arcana-purple" : "text-arcana-text"}`}>
                    {opt.label}
                  </p>
                  <p className="text-arcana-muted text-xs truncate">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-arcana-purple text-sm">✦</span>
            <h3 className="font-sans font-bold text-sm md:text-base text-arcana-purple">추가 질문 (선택)</h3>
          </div>
          <textarea
            value={freeQuestion}
            onChange={(e) => onFreeQuestionChange(e.target.value)}
            placeholder="구체적으로 궁금한 점이 있다면 적어주세요. (최대 200자)"
            maxLength={200}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-arcana-card/70 border border-arcana-border text-arcana-text text-sm placeholder:text-arcana-muted/50 focus:outline-none focus:border-arcana-purple transition-colors resize-none"
          />
          <p className="text-right text-arcana-muted text-xs mt-1">{freeQuestion.length}/200</p>
        </div>
        <button onClick={onStart} disabled={!canStart}
          className={`w-full py-3 rounded-full font-sans font-bold text-sm transition-all ${
            canStart
              ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white shadow-lg shadow-arcana-purple/30 hover:opacity-90"
              : "bg-arcana-surface/50 text-arcana-muted border border-arcana-border cursor-not-allowed"
          }`}>
          {canStart ? SAJU_COPY.startButton.active : SAJU_COPY.startButton.inactive}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page state + routing ───────────────────────────────────────────────────

function SajuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const { setTopic, setTimeRange, setIncludeMonthly, setCharacterId, setUserInfo, setPhase, setFreeQuestion } = useSajuSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const sajuCharacters = getCharactersByGender(genderFilter);

  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "info-input" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);
  const [selectedTime, setSelectedTime] = useState<SajuTimeRange | null>(null);
  const [selectedArea, setSelectedArea] = useState<Topic | null>(null);
  const [monthlyToggle, setMonthlyToggle] = useState(false);
  const [freeQuestion, setFreeQuestionLocal] = useState("");

  // 프리셀렉트된 캐릭터: 스토어 반영 + 인사 메시지 생성 (클라이언트 마운트 후 — new Date() SSR 비결정 방지)
  useEffect(() => {
    if (preselectedChar) {
      setCharacterId(preselectedChar.id);
      setDialogueMessages([{ id: crypto.randomUUID(), role: "character" as const, content: getCharacterGreeting(preselectedChar, useLocaleStore.getState().locale), mood: "smile", timestamp: new Date() }]);
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
      setStep("info-input");
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
    setStep("info-input");
  };

  const handleInfoSubmit = (info: UserInfo) => {
    setUserInfo(info);
    setDialogueMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "character",
      content: `${info.name || ""}님의 사주를 확인했어요. 어느 기간의 어떤 분야를 알아볼까요?`,
      mood: "mystical", timestamp: new Date(),
    }]);
    setStep("saju-select");
  };

  const handleTimeSelect = (time: SajuTimeRange, allowMonthly: boolean) => {
    setSelectedTime(time);
    if (!allowMonthly) setMonthlyToggle(false);
  };

  const handleStart = () => {
    if (!selectedTime || !selectedArea) return;
    setTopic(selectedArea);
    setTimeRange(selectedTime);
    setIncludeMonthly(monthlyToggle);
    setFreeQuestion(freeQuestion.trim() || null);
    setPhase("reading");
    router.push("/saju/session");
  };

  const handleBack = () => {
    if (step === "saju-select") { setStep("info-input"); return; }
    setStep("character-select");
    setSelectedCharacter(null);
    setDialogueMessages([]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ServiceBackground service="saju" />
      <ParticleOverlay density="low" className="z-10" />
      <AnimatePresence mode="wait">
        {step === "character-select" && (
          <CharacterSelectStep characters={sajuCharacters} genderFilter={genderFilter} setGenderFilter={setGenderFilter}
            selectedCharacter={selectedCharacter} onSelect={handleCharacterSelect} />
        )}
        {step === "info-input" && (
          <InfoInputStep selectedCharacter={selectedCharacter} onSubmit={handleInfoSubmit} onBack={handleBack} />
        )}
        {step === "saju-select" && (
          <SajuSelectStep selectedCharacter={selectedCharacter} dialogueMessages={dialogueMessages}
            selectedTime={selectedTime} selectedArea={selectedArea} monthlyToggle={monthlyToggle}
            canStart={selectedTime !== null && selectedArea !== null}
            freeQuestion={freeQuestion} onFreeQuestionChange={setFreeQuestionLocal}
            onBack={handleBack} onTimeSelect={handleTimeSelect} onAreaSelect={setSelectedArea}
            onMonthlyToggle={() => setMonthlyToggle((v) => !v)} onStart={handleStart} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SajuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    }>
      <SajuPageContent />
    </Suspense>
  );
}
