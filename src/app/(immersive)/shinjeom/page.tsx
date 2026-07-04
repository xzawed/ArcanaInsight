"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { CharacterCard } from "@/components/character/CharacterCard";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { CharacterConfig } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { Topic } from "@/types/session";
import { UserInfo } from "@/types/user-info";
import { Icon } from "@/components/common/Icon";
import { ServiceBackground } from "@/components/effects/ServiceBackground";
import { UserInfoForm } from "@/components/common/UserInfoForm";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { CulturalReadingDisplay } from "@/components/shinjeom/CulturalReadingDisplay";
import { PageSpinner } from "@/components/common/PageSpinner";
import { useResetScrollOnStep } from "@/hooks/useResetScrollOnStep";
import { usePreselectCharacter } from "@/hooks/usePreselectCharacter";

const TOPIC_CONFIGS: { id: Topic; iconId: string }[] = [
  { id: "shinjeom-general",    iconId: "shinjeom-general" },
  { id: "shinjeom-love",       iconId: "shinjeom-love" },
  { id: "shinjeom-wealth",     iconId: "shinjeom-wealth" },
  { id: "shinjeom-career",     iconId: "shinjeom-career" },
  { id: "shinjeom-health",     iconId: "shinjeom-health" },
  { id: "shinjeom-auspicious", iconId: "shinjeom-auspicious" },
];

type PageStep = "character-select" | "topic-select" | "user-info";
type GenderFilter = "all" | "female" | "male";

const topicKey = (id: Topic): string => id.replace("shinjeom-", "");

// ─── Step sub-components ────────────────────────────────────────────────────

function CharacterSelectStep({ characters, genderFilter, setGenderFilter, selectedCharacter, onSelect }: Readonly<{
  characters: CharacterConfig[];
  genderFilter: GenderFilter;
  setGenderFilter: (f: GenderFilter) => void;
  selectedCharacter: CharacterConfig | null;
  onSelect: (c: CharacterConfig) => void;
}>) {
  const { t } = useT();
  const genderLabels: Record<GenderFilter, string> = {
    all: t("settings.gender.all"),
    female: t("settings.gender.female"),
    male: t("settings.gender.male"),
  };
  return (
    <motion.div key="character-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}
      className="relative z-20 max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-center mb-2 drop-shadow-md">
        {t("shinjeom.page.character-select.heading")}
      </h2>
      <p className="text-arcana-muted text-sm text-center mb-6">{t("shinjeom.page.character-select.sub")}</p>
      <div className="flex justify-center gap-2 mb-6">
        {(["all", "female", "male"] as const).map((g) => (
          <button key={g} onClick={() => setGenderFilter(g)}
            className={`px-4 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
              genderFilter === g
                ? "bg-arcana-purple/20 text-arcana-purple border border-arcana-purple"
                : "border border-arcana-border text-arcana-muted hover:border-arcana-purple"
            }`}>
            {genderLabels[g]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {characters.map((char, index) => (
          <CharacterCard key={char.id} character={char} isSelected={selectedCharacter?.id === char.id}
            onClick={() => onSelect(char)} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

function TopicSelectStep({ onBack, onTopicSelect }: Readonly<{
  onBack: () => void;
  onTopicSelect: (topic: Topic) => void;
}>) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);

  return (
    <motion.div key="topic-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="relative z-20 max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-6">
        {t("shinjeom.page.topic-select.back")}
      </button>
      <h3 className="font-display font-bold text-lg mb-2 drop-shadow-md">{t("shinjeom.page.topic-select.heading")}</h3>
      <p className="text-arcana-muted text-xs mb-6">{t("shinjeom.page.topic-select.sub")}</p>
      <div className="grid grid-cols-1 gap-3">
        {TOPIC_CONFIGS.map((topic, index) => (
          <motion.button key={topic.id} data-testid={`shinjeom-topic-btn-${topic.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }} whileTap={{ scale: 0.97 }}
            onClick={() => onTopicSelect(topic.id)}
            className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10">
            <div className="flex items-center gap-3">
              <Icon id={topic.iconId} size={28} />
              <div className="flex flex-col">
                <h4 className="font-sans font-bold text-sm">
                  {t(`shinjeom.topic.${topicKey(topic.id)}.label` as Parameters<typeof t>[0])}
                </h4>
                <p className="text-arcana-muted text-xs mt-0.5">
                  {t(`shinjeom.topic.${topicKey(topic.id)}.desc` as Parameters<typeof t>[0])}
                </p>
                <CulturalReadingDisplay topicId={topic.id} locale={locale} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── UserInfo step ──────────────────────────────────────────────────────────

function UserInfoStep({ selectedCharacter, onBack, onSubmit, onSkip }: Readonly<{
  selectedCharacter: CharacterConfig | null;
  onBack: () => void;
  onSubmit: (data: UserInfo) => void;
  onSkip: () => void;
}>) {
  const { t } = useT();
  return (
    <motion.div key="user-info" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="relative z-20 max-w-lg mx-auto px-4 py-8">
      <UserInfoForm
        mode="shinjeom"
        onSubmit={onSubmit}
        onBack={onBack}
        characterName={selectedCharacter?.name}
      />
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 w-full text-arcana-muted text-sm hover:text-arcana-purple transition-colors text-center py-2"
      >
        {t("common.skip")}
      </button>
    </motion.div>
  );
}

// ─── Page state + routing ───────────────────────────────────────────────────

function ShinjeomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCharacterId, setTopic, setPhase, setUserInfo } = useShinjeomSessionStore();
  const { genderFilter, setGenderFilter } = useGenderStore();
  const characters = getCharactersByGender(genderFilter);

  // URL 파라미터 기반 동기 초기화 (flash 방지 — useSearchParams는 Suspense로 래핑된 상태)
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

  // 프리셀렉트 + 즐겨찾기 fallback: 캐릭터 선택 시 스토어 반영 + 스텝 전환
  usePreselectCharacter({
    currentCharacter: selectedCharacter,
    onSelect: (character) => {
      setSelectedCharacter(character);
      setCharacterId(character.id);
      setStep("topic-select");
    },
  });

  // 스텝 전환 시 스크롤 최상단 초기화
  useResetScrollOnStep(step);

  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setStep("topic-select");
  };

  const handleTopicSelect = (topic: Topic) => {
    setTopic(topic);
    setStep("user-info");
  };

  const handleUserInfoSubmit = (data: UserInfo) => {
    const hasData = data.name.trim() || data.birthDate;
    setUserInfo(hasData ? data : null);
    setPhase("conversation");
    router.push("/shinjeom/session");
  };

  const handleUserInfoSkip = () => {
    setUserInfo(null);
    setPhase("conversation");
    router.push("/shinjeom/session");
  };

  const handleBack = () => {
    setStep("character-select");
    setSelectedCharacter(null);
  };

  const handleUserInfoBack = () => {
    setStep("topic-select");
  };

  return (
    <div className="relative overflow-hidden">
      <ServiceBackground service="shinjeom" />
      <ParticleOverlay density="low" className="z-10" />
      <AnimatePresence mode="wait">
        {step === "character-select" && (
          <CharacterSelectStep characters={characters} genderFilter={genderFilter} setGenderFilter={setGenderFilter}
            selectedCharacter={selectedCharacter} onSelect={handleCharacterSelect} />
        )}
        {step === "topic-select" && (
          <TopicSelectStep onBack={handleBack} onTopicSelect={handleTopicSelect} />
        )}
        {step === "user-info" && (
          <UserInfoStep selectedCharacter={selectedCharacter} onBack={handleUserInfoBack}
            onSubmit={handleUserInfoSubmit} onSkip={handleUserInfoSkip} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShinjeomPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ShinjeomPageContent />
    </Suspense>
  );
}
