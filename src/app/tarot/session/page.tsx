"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { TypingDialogue } from "@/components/character/TypingDialogue";
import { CardDeck } from "@/components/card/CardDeck";
import { CardSpread } from "@/components/card/CardSpread";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { getCharacterByService } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getSpreadForTopic } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";

const deckManager = new DeckManager();

export default function TarotSessionPage() {
  const router = useRouter();
  const character = getCharacterByService("tarot")!;
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, requiredCards, selectedCards, chatMessages, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage, appendToLastMessage, setReadingResult, setLoading,
  } = useSessionStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  useEffect(() => {
    if (!topic) { router.push("/tarot"); return; }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    fetch("/api/tarot/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then((res) => res.json()).then((data) => { if (data.session) setSessionId(data.session.id); });

    setMood("smile");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: character.greeting, mood: "smile", timestamp: new Date() });

    setTimeout(() => {
      setAnimationPhase("spreading");
      setPhase("card-select");
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: `${requiredCards}장의 카드를 골라주세요. 직감을 믿고 끌리는 카드를 선택해보세요 ✨`,
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
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요 🔮", mood: "mystical", timestamp: new Date() });
    const sessionId = useSessionStore.getState().sessionId;
    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })) }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Show loading dots while AI generates
      const loadingMsgId = crypto.randomUUID();
      addChatMessage({ id: loadingMsgId, role: "character", content: "카드를 읽고 있어요... ✨", mood: "mystical", timestamp: new Date() });

      let fullJson = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) fullJson += data.chunk;
            if (data.done && data.result) {
              setReadingResult(data.result);

              // Replace loading message with card interpretations
              const messages = useSessionStore.getState().chatMessages.filter(m => m.id !== loadingMsgId);
              // We can't easily remove, so we'll add new messages for the result

              // Add individual card interpretations
              const currentSpread = topic ? getSpreadForTopic(topic) : null;
              if (data.result.cardInterpretations) {
                for (const interp of data.result.cardInterpretations) {
                  const card = cards.find(c => c.card.id === interp.cardId);
                  const posLabel = currentSpread?.positions[interp.position]?.labelKo || `위치 ${interp.position + 1}`;
                  addChatMessage({
                    id: crypto.randomUUID(), role: "character",
                    content: `🃏 [${posLabel}] ${card?.card.nameKo || ""}\n\n${interp.interpretation}`,
                    mood: "serious", timestamp: new Date(),
                  });
                }
              }

              // Add overall reading
              if (data.result.overallReading) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `🔮 종합 해석\n\n${data.result.overallReading}`,
                  mood: "mystical", timestamp: new Date(),
                });
              }

              // Add advice
              if (data.result.advice) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "character",
                  content: `✨ 조언\n\n${data.result.advice}`,
                  mood: "smile", timestamp: new Date(),
                });
              }

              setPhase("result"); setMood("smile");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      addChatMessage({ id: crypto.randomUUID(), role: "character", content: "앗, 카드의 메시지를 읽는 데 문제가 생겼어요. 다시 시도해주세요 🙏", mood: "surprised", timestamp: new Date() });
      setMood("surprised");
    }
    setLoading(false);
  };

  const spread = topic ? getSpreadForTopic(topic) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex-shrink-0 h-[35%] flex items-center justify-center relative">
        <CharacterDisplay character={character} mood={currentMood} />
        {chatMessages.length > 0 && (
          <div className="absolute bottom-2 left-4 right-4 bg-arcana-card/90 backdrop-blur-sm border border-arcana-border rounded-xl px-4 py-2">
            <TypingDialogue text={chatMessages[chatMessages.length - 1].content} speed={20} isStreaming={false} className="text-sm" />
          </div>
        )}
      </div>
      {phase === "card-select" && (
        <div className="flex-shrink-0 h-[30%] flex items-center">
          <CardDeck cards={shuffledDeck.slice(0, 12)} isSpread={animationPhase === "spreading"} selectedIndices={selectedIndices} onCardSelect={handleCardSelect} />
        </div>
      )}
      {(phase === "reading" || phase === "result") && spread && (
        <div className="flex-shrink-0 h-[30%] flex items-center">
          <CardSpread selectedCards={selectedCards} spread={spread} revealedPositions={revealedPositions} />
        </div>
      )}
      <div className="flex-1 min-h-0 border-t border-arcana-border mt-2">
        <ChatWindow messages={chatMessages} className="h-full" />
      </div>
      {phase === "result" && (
        <div className="flex-shrink-0 flex gap-3 py-3 border-t border-arcana-border">
          <button onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
            className="flex-1 py-2.5 rounded-full bg-arcana-card border border-arcana-border text-sm hover:border-arcana-purple transition-colors">
            새로운 상담
          </button>
          <button className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-sm hover:opacity-90 transition-opacity">
            결과 공유하기
          </button>
        </div>
      )}
    </div>
  );
}
