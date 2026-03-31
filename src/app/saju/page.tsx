"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSajuSessionStore, SajuUserInfo } from "@/hooks/useSajuSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CharacterCard } from "@/components/character/CharacterCard";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharacterById } from "@/data/characters";
import { CharacterConfig } from "@/types/character";
import { ChatMessage, Topic } from "@/types/session";
import { BIRTH_HOUR_MAP } from "@/data/saju/constants";

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

const birthHourOptions = Object.entries(BIRTH_HOUR_MAP)
  .filter(([k]) => k !== "unknown")
  .map(([key, hour]) => {
    const labels: Record<string, string> = {
      ja: "자시 (23:00~01:00)", chuk: "축시 (01:00~03:00)", in: "인시 (03:00~05:00)",
      myo: "묘시 (05:00~07:00)", jin: "진시 (07:00~09:00)", sa: "사시 (09:00~11:00)",
      o: "오시 (11:00~13:00)", mi: "미시 (13:00~15:00)", sin: "신시 (15:00~17:00)",
      yu: "유시 (17:00~19:00)", sul: "술시 (19:00~21:00)", hae: "해시 (21:00~23:00)",
    };
    return { value: key, label: labels[key] || key, hour };
  });

type PageStep = "character-select" | "info-input" | "topic-select";

export default function SajuPage() {
  const router = useRouter();
  const { setTopic, setCharacterId, setUserInfo, setPhase } = useSajuSessionStore();
  // 사주 서비스 캐릭터: 선화(사주 전문) + 미코(신점 전문)
  const sajuCharacters = ["seonhwa", "miko"].map(getCharacterById).filter(Boolean) as CharacterConfig[];

  const [step, setStep] = useState<PageStep>("character-select");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<ChatMessage[]>([]);

  // 입력 폼 상태
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");

  const handleCharacterSelect = (character: CharacterConfig) => {
    setSelectedCharacter(character);
    setCharacterId(character.id);
    setDialogueMessages([{
      id: crypto.randomUUID(), role: "character",
      content: character.greeting, mood: "smile", timestamp: new Date(),
    }]);
    setStep("info-input");
  };

  const handleInfoSubmit = () => {
    if (!birthDate || !birthHour) return;
    const info: SajuUserInfo = { name, birthDate, birthHour, gender };
    setUserInfo(info);
    setDialogueMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "character",
      content: `${name || ""}님의 사주를 준비했어요. 어떤 주제로 상담받으실 건가요?`,
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
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {sajuCharacters.map((character, index) => (
                <CharacterCard key={character.id} character={character} isSelected={selectedCharacter?.id === character.id}
                  onClick={() => handleCharacterSelect(character)} index={index} />
              ))}
            </div>
          </motion.div>
        ) : step === "info-input" ? (
          <motion.div key="info-input" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
            {selectedCharacter && (
              <div className="h-[20%] md:h-auto md:w-[50%] flex-shrink-0 overflow-hidden">
                <CharacterDisplay character={selectedCharacter} mood="smile" className="w-full h-full" />
              </div>
            )}
            <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-4 md:px-8 py-3 overflow-y-auto">
              <button onClick={handleBack} className="self-start mb-2 text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
                ← 뒤로
              </button>
              <h3 className="font-serif font-bold text-base md:text-lg mb-1">생년월일 정보 입력</h3>
              <p className="text-arcana-muted text-[10px] mb-3">정확한 사주 분석을 위해 필수 정보입니다</p>

              <div className="space-y-2">
                <div>
                  <label className="text-arcana-muted text-[10px] font-serif mb-0.5 block">이름 (선택)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동"
                    className="w-full px-3 py-2 rounded-xl bg-arcana-surface border border-arcana-border text-arcana-text text-sm focus:border-arcana-purple focus:outline-none" />
                </div>
                <div>
                  <label className="text-arcana-muted text-[10px] font-serif mb-0.5 block">생년월일 (필수)</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-arcana-surface border border-arcana-border text-arcana-text text-sm focus:border-arcana-purple focus:outline-none" />
                </div>
                <div>
                  <label className="text-arcana-muted text-[10px] font-serif mb-0.5 block">태어난 시간 (필수)</label>
                  <select value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-arcana-surface border border-arcana-border text-arcana-text text-sm focus:border-arcana-purple focus:outline-none">
                    <option value="">선택하세요</option>
                    {birthHourOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-arcana-muted text-[10px] font-serif mb-0.5 block">성별 (필수)</label>
                  <div className="flex gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <button key={g} onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-xl text-xs font-serif font-bold border transition-colors ${
                          gender === g ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple" : "border-arcana-border text-arcana-muted hover:border-arcana-purple"
                        }`}
                      >
                        {{ male: "남성", female: "여성", other: "기타" }[g]}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleInfoSubmit} disabled={!birthDate || !birthHour}
                  className="w-full mt-1 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20">
                  사주 분석 시작
                </button>
              </div>
            </div>
          </motion.div>
        ) : step === "topic-select" ? (
          <motion.div key="topic-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="relative z-20 min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row md:overflow-hidden">
            <div className="flex flex-col md:relative w-full md:w-[50%] flex-shrink-0">
              {selectedCharacter && (
                <div className="h-[25vh] md:h-auto md:absolute md:inset-0 overflow-hidden">
                  <CharacterDisplay character={selectedCharacter} mood="mystical" className="w-full h-full" />
                </div>
              )}
              <div className="flex-shrink-0 md:absolute md:bottom-0 md:left-0 md:right-0 z-20 md:px-6 md:pb-4">
                <div className="md:max-w-sm md:mx-auto">
                  <DialogueBox messages={dialogueMessages} characterName={selectedCharacter?.name} />
                </div>
              </div>
            </div>
            <div className="flex-1 md:w-[50%] flex flex-col justify-center px-4 md:px-6 py-4">
              <div className="md:max-w-md md:mx-auto md:w-full">
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
