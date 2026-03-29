"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { CardDeck } from "@/components/card/CardDeck";
import { CardSpread } from "@/components/card/CardSpread";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharacterById } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getSpreadForTopic } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";

const deckManager = new DeckManager();

export default function TarotSessionPage() {
  const router = useRouter();
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, characterId, requiredCards, selectedCards, chatMessages, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage, setReadingResult, setLoading,
  } = useSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  useEffect(() => {
    if (!topic || !character) { router.push("/tarot"); return; }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    fetch("/api/tarot/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then((res) => res.json()).then((data) => { if (data.session) setSessionId(data.session.id); });

    setMood("smile");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: character!.greeting, mood: "smile", timestamp: new Date() });

    setTimeout(() => {
      setAnimationPhase("spreading");
      setPhase("card-select");
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: `${requiredCards}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요`,
        mood: "mystical", timestamp: new Date(),
      });
      setMood("mystical");
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleCardSelect = useCallback((index: number) => {
    if (selectedCards.length >= requiredCards) return;
    const card = shuffledDeck[index];
    const isReversed = Math.random() > 0.5;
    const position = selectedCards.length;
    const selected: SelectedCard = { card, position, isReversed, selectedAt: new Date() };
    selectCard(selected);
    setSelectedIndices((prev) => [...prev, index]);
    setRevealedPositions((prev) => [...prev, position]);
    setMood("surprised");
    setTimeout(() => setMood("default"), 1000);
    if (selectedCards.length + 1 >= requiredCards) {
      const allSelected = [...selectedCards, selected];
      setTimeout(() => startReading(allSelected), 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, selectedCards, requiredCards]);

  const startReading = async (cards: SelectedCard[]) => {
    setPhase("reading"); setLoading(true); setMood("mystical");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요", mood: "mystical", timestamp: new Date() });
    const sessionId = useSessionStore.getState().sessionId;
    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, characterId, cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })) }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const loadingMsgId = crypto.randomUUID();
      addChatMessage({ id: loadingMsgId, role: "character", content: "카드를 읽고 있어요...", mood: "mystical", timestamp: new Date() });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done && data.result) {
              setReadingResult(data.result);
              const currentSpread = topic ? getSpreadForTopic(topic) : null;
              if (data.result.cardInterpretations) {
                for (const interp of data.result.cardInterpretations) {
                  const card = cards.find(c => c.card.id === interp.cardId);
                  const posLabel = currentSpread?.positions[interp.position]?.labelKo || `위치 ${interp.position + 1}`;
                  addChatMessage({
                    id: crypto.randomUUID(), role: "character",
                    content: `[${posLabel}] ${card?.card.nameKo || ""}\n\n${interp.interpretation}`,
                    mood: "serious", timestamp: new Date(),
                  });
                }
              }
              if (data.result.overallReading) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `종합 해석\n\n${data.result.overallReading}`,
                  mood: "mystical", timestamp: new Date(),
                });
              }
              if (data.result.advice) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `조언\n\n${data.result.advice}`,
                  mood: "smile", timestamp: new Date(),
                });
              }
              setPhase("result"); setMood("smile");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드의 메시지를 읽는 데 문제가 생겼어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
      setMood("surprised");
    }
    setLoading(false);
  };

  const spread = topic ? getSpreadForTopic(topic) : null;
  const particleDensity = phase === "reading" || phase === "result" ? "high" : "medium";

  return (
    <div className="relative h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      {/* 파티클 */}
      <ParticleOverlay density={particleDensity} className="z-10" />

      {/* 무대: 모바일 세로 / 데스크탑 가로 5:5 */}
      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 캐릭터: 모바일 상단 40% / 데스크탑 좌측 50% */}
        {character && (
          <div className="h-[40%] md:h-auto w-full md:w-[50%] flex-shrink-0 relative overflow-hidden">
            <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
          </div>
        )}

        {/* 카드: 모바일 하단 / 데스크탑 우측 50% */}
        <div className="flex-1 md:w-[50%] flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {phase === "card-select" && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <CardDeck
                  cards={shuffledDeck.slice(0, 12)}
                  isSpread={animationPhase === "spreading"}
                  selectedIndices={selectedIndices}
                  onCardSelect={handleCardSelect}
                />
              </motion.div>
            )}
            {(phase === "reading" || phase === "result") && spread && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
              >
                <CardSpread
                  selectedCards={selectedCards}
                  spread={spread}
                  revealedPositions={revealedPositions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 하단 대화창 */}
      <div className="relative z-30 flex-shrink-0">
        <DialogueBox
          messages={chatMessages}
          characterName={character?.name ?? ""}
          isTyping={isLoading && phase === "reading"}
        />

        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-arcana-card/90 backdrop-blur-sm px-4 pb-4 flex gap-3"
          >
            <button
              onClick={() => {
                useSessionStore.getState().reset();
                useCardAnimationStore.getState().reset();
                router.push("/tarot");
              }}
              className="flex-1 py-2.5 rounded-full bg-arcana-surface border border-arcana-border text-sm hover:border-arcana-purple transition-colors font-serif"
            >
              새로운 상담
            </button>
            <button className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm hover:opacity-90 transition-opacity font-serif">
              결과 공유하기
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
