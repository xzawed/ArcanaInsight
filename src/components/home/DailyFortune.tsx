"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BURST_SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * 360;
  const dist = 38 + (i % 3) * 14;
  const rad = (angle * Math.PI) / 180;
  return {
    id: i,
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    delay: i * 0.045,
  };
});
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { getAvailableCharacters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { CardFace } from "@/components/card/CardFace";
import { CardBack } from "@/components/card/CardBack";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { useThemeStore } from "@/hooks/useTheme";
import { useT } from "@/i18n/useT";
import Image from "next/image";
import type { CardStyleId } from "@/data/cardStyles";
import type { CharacterId } from "@/types/character";
import { characterImageLoaderProp, getCharacterImageUrl } from "@/lib/storage/character-image";

const deckManager = new DeckManager();

type Area = "general" | "love" | "career" | "health" | "wealth";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

interface AreaResult {
  area: Area;
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  keywords: string[];
}

interface FortuneData {
  areas: AreaResult[];
}

function AreaCardSlot({
  areaResult, isFlipped, isLoading, selectedSkinId, styleId, onFlip, areaLabel, tr,
}: Readonly<{
  areaResult: AreaResult | undefined;
  isFlipped: boolean;
  isLoading: boolean;
  selectedSkinId: string;
  styleId: CardStyleId | undefined;
  onFlip: () => void;
  areaLabel: string;
  tr: (key: string) => string;
}>) {
  const card = areaResult ? deckManager.getCardById(areaResult.cardId) : undefined;
  const [burstPlaying, setBurstPlaying] = useState(false);

  useEffect(() => {
    if (!isFlipped) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBurstPlaying(true);
    const t = setTimeout(() => setBurstPlaying(false), 850);
    return () => clearTimeout(t);
  }, [isFlipped]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-sans text-arcana-muted font-medium">{areaLabel}</span>
      {isLoading || !areaResult ? (
        <div className="w-24 h-36 rounded-lg bg-arcana-card/60 border border-arcana-border flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {burstPlaying && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20, overflow: "visible" }}>
              {BURST_SPARKS.map((spark) => (
                <motion.div
                  key={spark.id}
                  className="absolute rounded-full"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: 5,
                    height: 5,
                    marginLeft: -2.5,
                    marginTop: -2.5,
                    background: "var(--theme-particle-color, #a78bfa)",
                    boxShadow: "0 0 6px var(--theme-glow-color, rgba(167,139,250,0.8))",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1.2 }}
                  animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.65, delay: spark.delay, ease: "easeOut" }}
                />
              ))}
            </div>
          )}
          <motion.div
            onClick={onFlip}
            className="cursor-pointer"
            style={{ perspective: "1000px" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.55 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative w-24 h-36"
            >
              <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0">
                <CardBack size="md" className="w-full h-full" skinId={selectedSkinId} styleId={styleId} />
              </div>
              <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0">
                {card && (
                  <CardFace card={card} isReversed={false} size="md" className="w-full h-full" skinId={selectedSkinId} styleId={styleId} />
                )}
                {areaResult.isReversed && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-red-400 bg-red-900/50 px-1.5 py-0.5 rounded-full pointer-events-none">
                    {tr("tarot.result.card.reversed-badge")}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
      {!isFlipped && !isLoading && areaResult && (
        <p className="text-arcana-muted text-xs text-center">{tr("home.daily-fortune.tap-hint")}</p>
      )}
      {isFlipped && areaResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-[140px]"
        >
          <div className="flex flex-wrap justify-center gap-1 mb-1">
            {areaResult.keywords.map((kw) => (
              <span key={kw} className="px-1.5 py-0.5 text-[10px] rounded-full bg-arcana-purple/10 text-arcana-purple border border-arcana-purple/20">{kw}</span>
            ))}
          </div>
          <p className="text-arcana-text text-xs leading-relaxed">{areaResult.interpretation}</p>
        </motion.div>
      )}
    </div>
  );
}

export function DailyFortune() {
  const { t: tr, locale } = useT();
  const characters = getAvailableCharacters();
  const { selectedSkinId } = useSkinStore();
  const { activeTheme } = useThemeStore();
  const { resolvedStyle } = useCardStyleStore();
  const styleId = resolvedStyle(activeTheme) ?? undefined;

  const [selectedCharId, setSelectedCharId] = useState<CharacterId>(characters[0].id);
  const [fortuneData, setFortuneData] = useState<FortuneData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flipped, setFlipped] = useState<Record<Area, boolean>>({ general: false, love: false, career: false, health: false, wealth: false });
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(DATE_LOCALE[locale] ?? DATE_LOCALE.ko, { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
    [locale],
  );

  const fetchFortune = useCallback(async (charId: string, date: string) => {
    if (!date) return;
    setIsLoading(true);
    setFortuneData(null);
    try {
      const res = await fetch("/api/daily-fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: charId, date }),
      });
      if (res.ok) setFortuneData(await res.json());
    } catch (e) { console.warn("오늘의 운세 로드 실패:", e); }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (today) fetchFortune(selectedCharId, today);
  }, [selectedCharId, today, fetchFortune]);

  const handleCharChange = (charId: CharacterId) => {
    setSelectedCharId(charId);
    setFlipped({ general: false, love: false, career: false, health: false, wealth: false });
  };

  const handleFlip = (area: Area) => {
    setFlipped((prev) => ({ ...prev, [area]: true }));
  };

  const getAreaResult = (area: Area) => fortuneData?.areas.find((a) => a.area === area);
  const activeCharacter = characters.find((c) => c.id === selectedCharId);
  const generalResult = getAreaResult("general");

  return (
    <section id="daily-fortune" className="py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-2">{tr("home.daily-fortune.title")}</h2>
          <p className="text-arcana-muted text-sm" suppressHydrationWarning>{todayLabel}</p>
        </ScrollReveal>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide justify-start md:justify-center md:flex-wrap">
          {characters.map((char) => (
            <button key={char.id} type="button" onClick={() => handleCharChange(char.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-sans transition-all ${
                selectedCharId === char.id
                  ? "bg-arcana-purple text-white shadow-lg shadow-arcana-purple/30"
                  : "bg-arcana-card/70 text-arcana-muted hover:text-arcana-text border border-arcana-border"
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={getCharacterImageUrl(char.id, "default")} {...characterImageLoaderProp} alt="" width={20} height={20} className="object-cover" />
              </div>
              <span className="hidden sm:inline">{char.name}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selectedCharId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex flex-col items-center mb-8">
              <AreaCardSlot
                areaResult={generalResult}
                isFlipped={flipped.general}
                isLoading={isLoading}
                selectedSkinId={selectedSkinId}
                styleId={styleId}
                onFlip={() => handleFlip("general")}
                areaLabel={tr("home.daily-fortune.area.general")}
                tr={tr}
              />
              {flipped.general && generalResult && (
                <div className="mt-3 text-center max-w-xs">
                  <div className="px-2 py-0.5 inline-block bg-gradient-to-r from-arcana-purple to-arcana-indigo rounded-full mb-1">
                    <span className="text-white text-xs font-display font-bold">{activeCharacter?.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
              {(["love", "career", "health", "wealth"] as Area[]).map((area) => (
                <AreaCardSlot
                  key={area}
                  areaResult={getAreaResult(area)}
                  isFlipped={flipped[area]}
                  isLoading={isLoading}
                  selectedSkinId={selectedSkinId}
                  styleId={styleId}
                  onFlip={() => handleFlip(area)}
                  areaLabel={tr(`home.daily-fortune.area.${area}`)}
                  tr={tr}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
