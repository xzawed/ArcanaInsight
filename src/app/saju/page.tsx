"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";
import { motion, AnimatePresence } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { CharacterConfig, GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { ChatMessage, SajuTimeRange, Topic } from "@/types/session";
import { UserInfo } from "@/types/user-info";
import { sajuTimeOptions, sajuAreaOptions } from "@/data/saju/categories";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";

type PageStep = "character-select" | "info-input" | "saju-select";

function SajuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTopic, setTimeRange, setIncludeMonthly, setCharacterId, setUserInfo, setPhase } = useSajuSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const sajuCharacters = getCharactersByGender(genderFilter);

  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "info-input" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>(() =>
    preselectedChar ? [{
      id: crypto.randomUUID(), role: "character" as const,
      content: preselectedChar.greeting, mood: "smile", timestamp: new Date(),
    }] : []
  );
  const [selectedTime, setSelectedTime] = useState<SajuTimeRange | null>(null);
  const [selectedArea, setSelectedArea] = useState<Topic | null>(null);
  const [monthlyToggle, setMonthlyToggle] = useState(false);

  // URL 파라미터로 캐릭터가 프리셀렉트된 경우 스토어에 반영
  useEffect(() => {
    if (preselectedChar) {
      setCharacterId(preselectedChar.id);
    }
  }, [preselectedChar, setCharacterId]);

  // 선호 상담사 fallback: URL 파라미터 없이 직접 접속한 경우 자동 선택
  const { favoriteCharacter } = useFavoriteCharacter(!!preselectedChar);
  useEffect(() => {
    if (favoriteCharacter && !selectedCharacter) {
      setSelectedCharacter(favoriteCharacter);
      setCharacterId(favoriteCharacter.id);
      setDialogueMessages([{
        id: crypto.randomUUID(), role: "character",
        content: favoriteCharacter.greeting, mood: "smile", timestamp: new Date(),
      }]);
      setStep("info-input");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteCharacter]);

  // 스텝 전환 시 스크롤 최상단 초기화 (3중 보정: 즉시 + rAF + rAF)
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto']")
        .forEach((el) => { el.scrollTop = 0; });
    };
    resetScroll();
    requestAnimationFrame(() => {
      resetScroll();
      requestAnimationFrame(resetScroll);
    });
  }, [step]);

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
      content: `${info.name || ""}님의 사주를 확인했어요. 어느 기간의 어떤 분야를 알아볼까요?`,
      mood: "mystical", timestamp: new Date(),
    }]);
    setStep("saju-select");
  };

  const handleStart = () => {
    if (!selectedTime || !selectedArea) return;
    setTopic(selectedArea);
    setTimeRange(selectedTime);
    setIncludeMonthly(monthlyToggle);
    setPhase("reading");
    router.push("/saju/session");
  };

  const handleBack = () => {
    if (step === "saju-select") setStep("info-input");
    else if (step === "info-input") { setStep("character-select"); setSelectedCharacter(null); setDialogueMessages([]); }
    else { setStep("character-select"); setSelectedCharacter(null); }
  };

  const selectedTimeOption = sajuTimeOptions.find((t) => t.id === selectedTime);
  const canStart = selectedTime !== null && selectedArea !== null;

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
              <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-2">사주 상담사를 선택해주세요</h2>
              <p className="text-arcana-muted text-sm md:text-base">사주명리학 전문 상담을 받아보세요</p>
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
              {sajuCharacters.map((character, index) => (
                <CharacterCard key={character.id} character={character} isSelected={selectedCharacter?.id === character.id}
                  onClick={() => handleCharacterSelect(character)} index={index} />
              ))}
            </div>
          </motion.div>

        ) : step === "info-input" ? (
          <motion.div key="info-input" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
            {selectedCharacter && (
              <div className="h-[25%] md:h-auto md:w-[50%] flex-shrink-0 overflow-hidden">
                <CharacterDisplay character={selectedCharacter} mood="smile" className="w-full h-full" />
              </div>
            )}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-8 py-3 overflow-y-auto">
              <UserInfoForm mode="saju" onSubmit={handleInfoSubmit} onBack={handleBack} characterName={selectedCharacter?.name} />
            </div>
          </motion.div>

        ) : step === "saju-select" ? (
          <motion.div key="saju-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
            {/* 좌측: 캐릭터 + 대사 */}
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

            {/* 우측: 시간단위 x 분석영역 선택 */}
            <div className="flex-1 md:w-[50%] flex flex-col px-4 md:px-6 py-4 overflow-y-auto">
              <button onClick={handleBack} className="self-start mb-4 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
                ← 정보 수정
              </button>

              {/* 시간단위 */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon id="ui-hourglass" size={20} />
                  <h3 className="font-sans font-bold text-sm md:text-base text-arcana-purple">시간단위</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sajuTimeOptions.map((opt) => (
                    <button key={opt.id} onClick={() => {
                      setSelectedTime(opt.id);
                      if (!opt.allowMonthly) setMonthlyToggle(false);
                    }}
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
                {selectedTimeOption && (
                  <p className="text-arcana-muted text-xs mt-1.5 pl-1">{selectedTimeOption.desc}</p>
                )}
              </div>

              {/* 월별 상세 토글 — 년단위만 표시 */}
              {selectedTimeOption?.allowMonthly && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="mb-5">
                  <label className="flex items-center gap-2 cursor-pointer group w-fit">
                    <div onClick={() => setMonthlyToggle(!monthlyToggle)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${monthlyToggle ? "bg-arcana-purple" : "bg-arcana-border"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${monthlyToggle ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs font-sans text-arcana-muted group-hover:text-arcana-text transition-colors">
                      월별 상세 포함
                    </span>
                  </label>
                </motion.div>
              )}

              {/* 분석영역 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon id="saju-general" size={20} />
                  <h3 className="font-sans font-bold text-sm md:text-base text-arcana-purple">분석영역</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sajuAreaOptions.map((opt) => (
                    <button key={opt.id} onClick={() => setSelectedArea(opt.id)}
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

              {/* 시작 버튼 */}
              <button onClick={handleStart} disabled={!canStart}
                className={`w-full py-3 rounded-full font-sans font-bold text-sm transition-all ${
                  canStart
                    ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white shadow-lg shadow-arcana-purple/30 hover:opacity-90"
                    : "bg-arcana-surface/50 text-arcana-muted border border-arcana-border cursor-not-allowed"
                }`}>
                {canStart ? "사주 분석 시작하기 →" : "시간단위와 분석영역을 선택해주세요"}
              </button>
            </div>
          </motion.div>
        ) : null}
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
