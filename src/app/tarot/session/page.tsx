"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
  const [readingError, setReadingError] = useState(false);
  const resultBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topic || !character) { router.push("/tarot"); return; }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    fetch("/api/tarot/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then((res) => res.json()).then((data) => { if (data.session) setSessionId(data.session.id); })
      .catch(() => { /* 세션 생성 실패 — 카드 선택은 계속 가능 */ });

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
    setPhase("reading"); setLoading(true); setMood("mystical"); setReadingError(false);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요", mood: "mystical", timestamp: new Date() });
    const sessionId = useSessionStore.getState().sessionId;
    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, characterId, cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })) }),
      });
      if (!response.ok || !response.body) {
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: "서버 연결에 문제가 생겼어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
        setMood("surprised");
        setReadingError(true);
        setLoading(false);
        return;
      }
      const reader = response.body.getReader();
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
      setReadingError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (phase === "result") {
      resultBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, phase]);

  const spread = topic ? getSpreadForTopic(topic) : null;
  const particleDensity = phase === "reading" ? "high" : phase === "result" ? "low" : "medium";

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
        {/* 캐릭터: 모바일 상단 25~35% / 데스크탑 좌측 50% */}
        {character && (
          <div className={`${phase === "result" ? "h-[25%]" : "h-[35%]"} md:h-auto w-full md:w-[50%] flex-shrink-0 relative overflow-hidden transition-all duration-500`}>
            <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
          </div>
        )}

        {/* 우측: 모바일 하단 / 데스크탑 우측 50% */}
        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden">
          {phase === "card-select" && (
            <button
              onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
              className="self-start mb-2 text-arcana-muted text-xs hover:text-arcana-purple transition-colors"
              type="button"
            >
              ← 상담사 다시 선택
            </button>
          )}
          <AnimatePresence mode="wait">
            {phase === "card-select" && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex-1 flex items-center justify-center"
              >
                <CardDeck
                  cards={shuffledDeck.slice(0, 12)}
                  isSpread={animationPhase === "spreading"}
                  selectedIndices={selectedIndices}
                  onCardSelect={handleCardSelect}
                />
              </motion.div>
            )}
            {phase === "reading" && spread && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md flex-1 flex items-center justify-center mx-auto relative"
              >
                <CardSpread
                  selectedCards={selectedCards}
                  spread={spread}
                  revealedPositions={revealedPositions}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
                      <p className="text-arcana-muted text-xs font-serif">카드를 해석하고 있어요...</p>
                    </div>
                  </div>
                )}
                {readingError && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-arcana-muted text-sm font-serif">해석에 문제가 발생했어요</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setReadingError(false); startReading(selectedCards); }}
                          className="px-6 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                          다시 시도
                        </button>
                        <button
                          onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                          className="px-6 py-2 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
                        >
                          새로운 상담
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {phase === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex-1 flex flex-col overflow-y-auto py-4"
              >
                {/* 결과 메시지 목록 */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {chatMessages.filter(m => m.role === "character").map((msg) => {
                    // 카드 해석 메시지 (위치 라벨로 시작하는 메시지)
                    const cardMatch = msg.content.match(/^\[(.+?)\]\s*(.+?)\n\n([\s\S]+)$/);
                    // 종합 해석 메시지
                    const isOverall = msg.content.startsWith("종합 해석\n\n");
                    // 조언 메시지
                    const isAdvice = msg.content.startsWith("조언\n\n");

                    if (cardMatch) {
                      const [, posLabel, cardName, interpretation] = cardMatch;
                      return (
                        <div key={msg.id} className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-arcana-border/50">
                            <span className="text-arcana-gold text-xs font-serif font-bold px-2 py-0.5 bg-arcana-gold/10 rounded-full">{posLabel}</span>
                            <span className="text-arcana-text font-bold text-sm">{cardName}</span>
                          </div>
                          <p className="text-arcana-text text-sm leading-relaxed">{interpretation}</p>
                        </div>
                      );
                    }

                    if (isOverall) {
                      return (
                        <div key={msg.id} className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🔮</span>
                            <span className="text-arcana-purple font-serif font-bold">종합 해석</span>
                          </div>
                          <p className="text-arcana-text text-sm leading-relaxed">{msg.content.replace("종합 해석\n\n", "")}</p>
                        </div>
                      );
                    }

                    if (isAdvice) {
                      return (
                        <div key={msg.id} className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✨</span>
                            <span className="text-arcana-gold font-serif font-bold">조언</span>
                          </div>
                          <p className="text-arcana-text text-sm leading-relaxed">{msg.content.replace("조언\n\n", "")}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4">
                        <p className="text-arcana-text text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    );
                  })}
                  <div ref={resultBottomRef} />
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 flex-shrink-0">
                  <button
                    onClick={() => {
                      useSessionStore.getState().reset();
                      useCardAnimationStore.getState().reset();
                      router.push("/tarot");
                    }}
                    className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
                  >
                    새로운 상담
                  </button>
                  <button
                    onClick={async () => {
                      const result = useSessionStore.getState().readingResult;
                      const shareToken = result?.shareToken;
                      if (!shareToken) return;
                      const url = `${window.location.origin}/tarot/result/${shareToken}`;
                      const text = `🔮 타로 리딩 결과를 확인해보세요!\n\n- ArcanaInsight`;
                      if (navigator.share) {
                        try { await navigator.share({ title: "타로 리딩 결과 - ArcanaInsight", text, url }); } catch { /* 취소 */ }
                      } else {
                        try { await navigator.clipboard.writeText(`${text}\n${url}`); } catch { /* 실패 */ }
                      }
                    }}
                    className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                  >
                    결과 공유하기
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 하단 대화창 (카드 선택/리딩 단계에서만) */}
          {phase !== "result" && (
            <div className="flex-shrink-0 z-30">
              <DialogueBox
                messages={chatMessages}
                characterName={character?.name ?? ""}
                isTyping={isLoading && phase === "reading"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
