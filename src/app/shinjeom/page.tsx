"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { CharacterCard } from "@/components/character/CharacterCard";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { CharacterConfig } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { Topic } from "@/types/session";
import { Icon } from "@/components/common/Icon";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";

const topics: { id: Topic; label: string; iconId: string; desc: string }[] = [
  { id: "shinjeom-general", label: "신수 (종합운)", iconId: "shinjeom-general", desc: "전반적인 운세와 앞날의 길흉" },
  { id: "shinjeom-love", label: "연애/궁합", iconId: "shinjeom-love", desc: "인연, 만남, 관계의 운명" },
  { id: "shinjeom-wealth", label: "재물/사업운", iconId: "shinjeom-wealth", desc: "돈, 사업, 투자의 흐름" },
  { id: "shinjeom-career", label: "직장/이직", iconId: "shinjeom-career", desc: "직장 운세, 이직·전직 시기와 방향" },
  { id: "shinjeom-health", label: "건강/액막이", iconId: "shinjeom-health", desc: "건강 운세, 액운 해소 조언" },
  { id: "shinjeom-auspicious", label: "택일", iconId: "shinjeom-auspicious", desc: "이사·결혼·개업 등 길일 선택" },
];

type PageStep = "character-select" | "topic-select";

function ShinjeomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCharacterId, setTopic, setPhase } = useShinjeomSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const characters = getCharactersByGender(genderFilter);

  const preselectedCharId = searchParams.get("character");
  const preselectedChar = preselectedCharId ? getCharacterById(preselectedCharId) ?? null : null;

  const reset = useShinjeomSessionStore.getState().reset;
  const [step, setStep] = useState<PageStep>(() => preselectedChar ? "topic-select" : "character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(() => preselectedChar);

  // 페이지 진입 시 이전 세션 초기화
  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NOSONAR

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
      setStep("topic-select");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteCharacter]); // NOSONAR

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
    setStep("topic-select");
  };

  const handleTopicSelect = (topic: Topic) => {
    setTopic(topic);
    setPhase("conversation");
    router.push("/shinjeom/session");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>
      <ParticleOverlay density="low" className="z-10" />

      <AnimatePresence mode="wait">
        {step === "character-select" ? (
          <motion.div
            key="character-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-20 max-w-4xl mx-auto px-4 py-8"
          >
            <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-center mb-2 drop-shadow-md">
              신점 상담사를 선택하세요
            </h2>
            <p className="text-arcana-muted text-sm text-center mb-6">영적 상담을 도와줄 캐릭터를 골라주세요</p>

            <div className="flex justify-center gap-2 mb-6">
              {(["all", "female", "male"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-4 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
                    genderFilter === g
                      ? "bg-arcana-purple/20 text-arcana-purple border border-arcana-purple"
                      : "border border-arcana-border text-arcana-muted hover:border-arcana-purple"
                  }`}
                >
                  {{ all: "전부", female: "여자", male: "남자" }[g]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {characters.map((char, index) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  isSelected={selectedCharacter?.id === char.id}
                  onClick={() => handleCharacterSelect(char)}
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
            exit={{ opacity: 0, x: -50 }}
            className="relative z-20 max-w-lg mx-auto px-4 py-8"
          >
            <button
              onClick={() => { setStep("character-select"); setSelectedCharacter(null); }}
              className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-6"
            >
              ← 다른 상담사 선택
            </button>

            <h3 className="font-display font-bold text-lg mb-2 drop-shadow-md">어떤 점을 봐드릴까요?</h3>
            <p className="text-arcana-muted text-xs mb-6">상담 주제를 선택하면 대화가 시작됩니다</p>

            <div className="grid grid-cols-1 gap-3">
              {topics.map((t, index) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleTopicSelect(t.id)}
                  className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10"
                >
                  <div className="flex items-center gap-3">
                    <Icon id={t.iconId} size={28} />
                    <div>
                      <h4 className="font-sans font-bold text-sm">{t.label}</h4>
                      <p className="text-arcana-muted text-xs mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShinjeomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    }>
      <ShinjeomPageContent />
    </Suspense>
  );
}
