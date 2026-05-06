"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { CardFace } from "@/components/card/CardFace";
import { CardBack } from "@/components/card/CardBack";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useT } from "@/i18n/useT";

const deckManager = new DeckManager();

interface DailyCardData {
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  keywords: string[];
}

interface CardSlotProps {
  isLoading: boolean;
  currentCard: ReturnType<typeof deckManager.getCardById>;
  currentData: DailyCardData | undefined;
  isFlipped: boolean;
  selectedSkinId: string;
  onFlip: () => void;
  tr: (key: string) => string;
}

function renderCardSlot({ isLoading, currentCard, currentData, isFlipped, selectedSkinId, onFlip, tr }: CardSlotProps) {
  if (isLoading) {
    return (
      <div className="w-32 h-48 rounded-lg bg-arcana-card/60 border border-arcana-border flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    );
  }
  if (currentCard && currentData) {
    return (
      <motion.div
        onClick={onFlip}
        className="cursor-pointer"
        style={{ perspective: "1000px" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-32 h-48"
        >
          <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0">
            <CardBack size="lg" className="w-full h-full" skinId={selectedSkinId} />
          </div>
          <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0">
            <CardFace card={currentCard} isReversed={currentData.isReversed} size="lg" className="w-full h-full" skinId={selectedSkinId} />
          </div>
        </motion.div>
        {!isFlipped && <p className="text-arcana-muted text-xs text-center mt-2">{tr("home.daily-card.tap-hint")}</p>}
      </motion.div>
    );
  }
  return (
    <div className="w-32 h-48 rounded-lg bg-arcana-card/60 border border-dashed border-arcana-border flex items-center justify-center">
      <span className="text-arcana-muted text-xs">카드 로딩 중...</span>
    </div>
  );
}

interface InterpretationPanelProps {
  currentData: DailyCardData | undefined;
  currentCard: ReturnType<typeof deckManager.getCardById>;
  isFlipped: boolean;
  isLoading: boolean;
  characterName: string | undefined;
  onShare: () => void;
  tr: (key: string) => string;
}

function renderInterpretationPanel({ currentData, currentCard, isFlipped, isLoading, characterName, onShare, tr }: InterpretationPanelProps) {
  if (currentData && currentCard && isFlipped) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <h3 className="font-display font-bold text-lg">{currentCard.nameKo}</h3>
          <p className="text-arcana-muted text-xs">{currentCard.name} {currentData.isReversed ? tr("home.daily-card.reversed") : tr("home.daily-card.upright")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentData.keywords.map((kw) => (
            <span key={kw} className="px-2 py-0.5 text-xs rounded-full bg-arcana-purple/10 text-arcana-purple border border-arcana-purple/20">
              {kw}
            </span>
          ))}
        </div>
        <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full">
              <span className="text-white text-xs font-display font-bold">{characterName}</span>
            </div>
          </div>
          <p className="text-arcana-text text-sm leading-relaxed">{currentData.interpretation}</p>
        </div>
        <button onClick={onShare} type="button"
          className="px-4 py-2 text-xs rounded-full border border-arcana-purple text-arcana-purple font-display font-bold hover:bg-arcana-purple/10 transition-colors">
          {tr("home.daily-card.share")}
        </button>
      </motion.div>
    );
  }
  if (currentData && !isFlipped) {
    return (
      <div className="flex flex-col items-center md:items-start justify-center h-full">
        <p className="text-arcana-muted text-sm font-sans">{tr("home.daily-card.tap-desc")}</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 bg-arcana-card/60 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-arcana-card/60 rounded w-1/4 animate-pulse" />
        <div className="h-24 bg-arcana-card/60 rounded animate-pulse" />
      </div>
    );
  }
  return null;
}

export function DailyCard() {
  const { t: tr } = useT();
  const characters = getAvailableCharacters();
  const { selectedSkinId } = useSkinStore();
  const [activeTab, setActiveTab] = useState(characters[0].id);
  const [data, setData] = useState<Record<string, DailyCardData>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [today, setToday] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    const d = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(d.toISOString().split("T")[0]);
    setTodayLabel(d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }));
  }, []);

  const fetchDailyCard = useCallback(async (characterId: string) => {
    if (!today) return;
    if (data[characterId]) return;
    setLoading(characterId);
    try {
      const res = await fetch("/api/daily-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, date: today }),
      });
      if (res.ok) {
        const result = await res.json();
        setData((prev) => ({ ...prev, [characterId]: result }));
      }
    } catch (e) { console.warn("일일 카드 로드 실패:", e); }
    setLoading(null);
  }, [data, today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDailyCard(activeTab);
  }, [activeTab, fetchDailyCard]);

  const handleFlip = (characterId: string) => {
    setFlipped((prev) => ({ ...prev, [characterId]: true }));
  };

  const currentData = data[activeTab];
  const currentCard = currentData ? deckManager.getCardById(currentData.cardId) : undefined;
  const isFlipped = flipped[activeTab] || false;
  const activeCharacter = characters.find((c) => c.id === activeTab);

  const handleShare = async () => {
    if (!currentData || !currentCard) return;
    const text = `🔮 오늘의 카드: ${currentCard.nameKo}\n\n${currentData.interpretation}\n\n- ${activeCharacter?.name}의 해석 | ArcanaInsight`;
    if (navigator.share) {
      await navigator.share({ title: tr("home.daily-card.share-text"), text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <section id="daily-card" className="py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-2">{tr("home.daily-card.title")}</h2>
          <p className="text-arcana-muted text-sm" suppressHydrationWarning>{todayLabel}</p>
        </ScrollReveal>

        {/* 캐릭터 탭 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide justify-start md:justify-center md:flex-wrap">
          {characters.map((char) => (
            <button key={char.id} type="button" onClick={() => setActiveTab(char.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-sans transition-all ${
                activeTab === char.id
                  ? "bg-arcana-purple text-white shadow-lg shadow-arcana-purple/30"
                  : "bg-arcana-card/70 text-arcana-muted hover:text-arcana-text border border-arcana-border"
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={`/images/characters/${char.id}/nukki/idle.png`} alt="" width={20} height={20} className="object-cover" />
              </div>
              <span className="hidden sm:inline">{char.name}</span>
            </button>
          ))}
        </div>

        {/* 카드 + 해석 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col md:flex-row gap-6 md:gap-8 items-center"
          >
            {/* 카드 */}
            <div className="flex-shrink-0 flex justify-center">
              {renderCardSlot({
                isLoading: loading === activeTab,
                currentCard,
                currentData,
                isFlipped,
                selectedSkinId,
                onFlip: () => handleFlip(activeTab),
                tr,
              })}
            </div>

            {/* 해석 — 카드를 뒤집은 후에만 표시 */}
            <div className="flex-1 min-w-0">
              {renderInterpretationPanel({
                currentData,
                currentCard,
                isFlipped,
                isLoading: loading === activeTab,
                characterName: activeCharacter?.name,
                onShare: handleShare,
                tr,
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
