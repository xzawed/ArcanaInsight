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
import { waitingLines, buildCardPreviewLine } from "@/data/characters/waiting-lines";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads } from "@/data/spreads";
import { TarotCard, SelectedCard } from "@/types/card";

const deckManager = new DeckManager();

export default function TarotSessionPage() {
  const router = useRouter();
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, characterId, spreadType, requiredCards, selectedCards, chatMessages, readingResult, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage, setReadingResult, setLoading,
  } = useSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [readingError, setReadingError] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const resultBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topic || !character || !spreadType) { router.push("/tarot"); return; }
    const allCards = deckManager.getAllCards();
    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledDeck(shuffled);
    setAvailableCards(shuffled);

    // 세션 생성을 await하여 sessionId 확보 후 카드 선택 시작
    const initSession = async () => {
      try {
        const res = await fetch("/api/tarot/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, characterId, spreadType }),
        });
        if (!res.ok) throw new Error(`세션 생성 실패: ${res.status}`);
        const data = await res.json();
        if (data.session?.id) setSessionId(data.session.id);
      } catch (err) {
        console.warn("세션 생성 실패 (리딩은 계속 진행):", err);
      }
    };
    initSession();

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
    if (selectedCards.length >= requiredCards || pendingConfirm) return;
    const card = shuffledDeck[index];
    const isReversed = Math.random() > 0.5;
    const position = selectedCards.length;
    const selected: SelectedCard = { card, position, isReversed, selectedAt: new Date() };
    selectCard(selected);
    setSelectedIndices((prev) => [...prev, index]);
    setRevealedPositions((prev) => [...prev, position]);
    setMood("surprised");

    // 매 카드 선택마다 확인 요청
    const currentCount = selectedCards.length + 1;
    const isLast = currentCount >= requiredCards;
    setPendingConfirm(true);
    setTimeout(() => {
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: isLast
          ? `${requiredCards}장의 카드가 모두 선택되었어요! 이 카드로 리딩을 시작할까요?`
          : `${currentCount}번째 카드를 선택했어요. 이 카드가 맞나요? (${currentCount}/${requiredCards})`,
        mood: isLast ? "smile" : "default", timestamp: new Date(),
      });
      setMood(isLast ? "smile" : "default");
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, selectedCards, requiredCards, pendingConfirm]);

  /** 확인 → 마지막 카드면 리딩 시작, 아니면 다음 카드 선택 계속 */
  const handleConfirmCard = useCallback(() => {
    setPendingConfirm(false);
    const { selectedCards: currentCards } = useSessionStore.getState();
    if (currentCards.length >= requiredCards) {
      startReading(currentCards);
    } else {
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: `좋아요! 다음 카드를 골라주세요. (${currentCards.length}/${requiredCards})`,
        mood: "mystical", timestamp: new Date(),
      });
      setMood("mystical");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredCards, addChatMessage, setMood]);

  /** 취소 → 마지막 카드 제거, 다시 선택 가능 */
  const handleCancelLastCard = useCallback(() => {
    setPendingConfirm(false);
    const currentCards = useSessionStore.getState().selectedCards;
    if (currentCards.length === 0) return;
    const lastCard = currentCards[currentCards.length - 1];
    const remaining = currentCards.slice(0, -1);
    useSessionStore.setState({ selectedCards: remaining });
    setSelectedIndices((prev) => prev.slice(0, -1));
    setRevealedPositions((prev) => prev.filter((p) => p !== lastCard.position));
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: "다른 카드를 골라주세요. 직감을 믿으세요!",
      mood: "mystical", timestamp: new Date(),
    });
    setMood("mystical");
  }, [addChatMessage, setMood]);

  // 대기 연출: 카드 순차 뒤집기 + 캐릭터 대사 + 카드 미리보기
  const startWaitingSequence = useCallback((cards: SelectedCard[], charId: string) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const currentSpread = spreadType ? spreads[spreadType] : null;
    const lines = waitingLines[charId] || waitingLines["arcana"];

    // 1단계: 카드 순차 뒤집기 (2초 간격) + 카드 정보 미리보기
    cards.forEach((sc, i) => {
      timers.push(setTimeout(() => {
        setRevealedPositions((prev) => [...prev, sc.position]);
        setMood(i % 2 === 0 ? "serious" : "mystical");

        // 카드 키워드 미리보기 대사
        const posLabel = currentSpread?.positions[sc.position]?.labelKo || `위치 ${sc.position + 1}`;
        const keywords = sc.isReversed ? sc.card.reversed.keywords : sc.card.upright.keywords;
        const preview = buildCardPreviewLine(charId, sc.card.nameKo, keywords, posLabel);
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: preview, mood: "serious", timestamp: new Date() });
      }, (i + 1) * 2000));
    });

    // 2단계: 캐릭터 대기 대사 (카드 뒤집기 끝난 후 3초 간격)
    const baseDelay = (cards.length + 1) * 2000;
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setMood(line.mood);
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: line.content, mood: line.mood, timestamp: new Date() });
      }, baseDelay + i * 3000));
    });

    return () => timers.forEach(clearTimeout);
  }, [spreadType, addChatMessage, setMood]);

  const startReading = async (cards: SelectedCard[]) => {
    setPhase("reading"); setLoading(true); setMood("mystical"); setReadingError(false);
    // 카드 뒤집기 초기화 (reading 시작 시 전부 뒷면으로)
    setRevealedPositions([]);
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드가 모두 모였네요... 이제 카드의 이야기를 들어볼게요", mood: "mystical", timestamp: new Date() });

    // 대기 연출 시작 (API 호출과 동시 실행)
    const stopSequence = startWaitingSequence(cards, characterId || "arcana");

    // sessionId 확보 대기 (최대 3초) — race condition 방지
    let sessionId = useSessionStore.getState().sessionId;
    if (!sessionId) {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500));
        sessionId = useSessionStore.getState().sessionId;
        if (sessionId) break;
      }
    }
    try {
      const response = await fetch("/api/tarot/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topic, spreadType, characterId, userInfo: useSessionStore.getState().userInfo, cards: cards.map((c) => ({ cardId: c.card.id, position: c.position, isReversed: c.isReversed })) }),
      });
      if (!response.ok || !response.body) {
        stopSequence();
        let errorDetail = "";
        try {
          const errorBody = await response.json();
          errorDetail = errorBody?.error || "";
        } catch { /* JSON 파싱 실패 무시 */ }
        console.error("리딩 API 응답 실패:", response.status, errorDetail);
        const message = errorDetail.includes("GROK_API_KEY")
          ? "AI 서비스 설정에 문제가 있어요. 관리자에게 문의해주세요."
          : "서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.";
        addChatMessage({ id: crypto.randomUUID(), role: "character", content: message, mood: "surprised", timestamp: new Date() });
        setMood("surprised");
        setReadingError(true);
        setLoading(false);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const sseLines = sseBuffer.split("\n");
        sseBuffer = sseLines.pop() || ""; // 불완전한 마지막 줄은 버퍼에 유지
        for (const line of sseLines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            // SSE 에러 처리 — Grok API 실패 등
            if (data.error) {
              stopSequence();
              console.error("리딩 SSE 에러:", data.error);
              addChatMessage({ id: crypto.randomUUID(), role: "character", content: "카드 해석 중 문제가 발생했어요. 다시 시도해주세요.", mood: "surprised", timestamp: new Date() });
              setMood("surprised");
              setReadingError(true);
              setLoading(false);
              streamDone = true;
              break;
            }
            if (data.done && data.result) {
              // 연출 중단 — 결과 도착
              stopSequence();
              // 모든 카드 뒤집기 완료
              setRevealedPositions(cards.map((c) => c.position));

              setReadingResult(data.result);
              const currentSpread = spreadType ? spreads[spreadType] : null;
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
              // DB 저장 실패 알림
              if (data.dbSaved === false && sessionId) {
                addChatMessage({
                  id: crypto.randomUUID(), role: "system",
                  content: "리딩 결과가 저장되지 않았습니다. 결과를 스크린샷으로 보관해주세요.",
                  timestamp: new Date(),
                });
              }
              setPhase("result"); setMood("smile");
              streamDone = true;
              break;
            }
          } catch (e) { console.warn("SSE 파싱 실패:", e); }
        }
      }
    } catch (e) {
      console.error("리딩 요청 실패:", e);
      stopSequence();
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

  const spread = spreadType ? spreads[spreadType] : null;
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
        {/* 좌측 컬럼: 캐릭터 + 대사 (데스크탑) */}
        <div className="w-full md:w-[50%] md:flex-shrink-0 flex flex-col">
          {/* 캐릭터: 모바일 상단 25~35% / 데스크탑 flex-1 */}
          {character && (
            <div className={`${phase === "result" ? "h-[25%]" : phase === "reading" ? "h-[25%]" : "h-[35%]"} md:flex-1 relative overflow-hidden transition-all duration-500`}>
              <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
              {/* 데스크탑: 하단 그라디언트 — 대사창과 자연스럽게 연결 */}
              <div className="hidden md:block absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-arcana-bg/80 to-transparent pointer-events-none" />
            </div>
          )}
          {/* 대사창 — 데스크탑에서 캐릭터 하단에 표시 */}
          {phase !== "result" && (
            <div className="hidden md:block flex-shrink-0 px-6 pb-4">
              <div className="max-w-sm mx-auto">
                <DialogueBox
                  messages={chatMessages}
                  characterName={character?.name ?? ""}
                  isTyping={false}
                />
              </div>
            </div>
          )}
        </div>

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
                className="w-full flex-1 flex flex-col items-center justify-center"
              >
                <CardDeck
                  cards={shuffledDeck}
                  isSpread={animationPhase === "spreading"}
                  selectedIndices={selectedIndices}
                  onCardSelect={handleCardSelect}
                />
                {/* 카드 확인/취소 버튼 */}
                {pendingConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 mt-3"
                  >
                    <button
                      onClick={handleCancelLastCard}
                      className="px-5 py-2 rounded-full border border-arcana-border text-arcana-muted text-xs font-serif font-bold hover:border-arcana-purple hover:text-arcana-purple transition-colors"
                    >
                      다시 고르기
                    </button>
                    <button
                      onClick={handleConfirmCard}
                      className="px-5 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-xs font-serif font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                    >
                      {selectedCards.length >= requiredCards ? "이 카드로 진행" : "확인"}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
            {phase === "reading" && spread && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md md:max-w-2xl flex-1 flex items-center justify-center mx-auto relative pt-2"
              >
                <CardSpread
                  selectedCards={selectedCards}
                  spread={spread}
                  revealedPositions={revealedPositions}
                />
                {/* 스피너 제거 — 카드 순차 뒤집기 연출이 로딩 상태를 시각적으로 대체 */}
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
            {phase === "result" && readingResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex-1 flex flex-col overflow-y-auto py-4"
              >
                {/* 리딩 결과만 표시 (캐릭터 대사 제외) */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 md:max-w-lg md:mx-auto md:w-full">
                  {/* 카드별 해석 */}
                  {readingResult.cardInterpretations?.map((interp, i) => {
                    const card = selectedCards.find(c => c.card.id === interp.cardId);
                    const posLabel = spread?.positions[interp.position]?.labelKo || `위치 ${interp.position + 1}`;
                    return (
                      <div key={`card-${i}`} className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-arcana-border/50">
                          <span className="text-arcana-gold text-xs font-serif font-bold px-2 py-0.5 bg-arcana-gold/10 rounded-full">{posLabel}</span>
                          <span className="text-arcana-text font-bold text-sm">{card?.card.nameKo || ""}</span>
                        </div>
                        <p className="text-arcana-text text-sm leading-relaxed whitespace-pre-wrap">{interp.interpretation}</p>
                      </div>
                    );
                  })}

                  {/* 종합 해석 */}
                  {readingResult.overallReading && (
                    <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔮</span>
                        <span className="text-arcana-purple font-serif font-bold">종합 해석</span>
                      </div>
                      <p className="text-arcana-text text-sm leading-relaxed whitespace-pre-wrap">{readingResult.overallReading}</p>
                    </div>
                  )}

                  {/* 조언 */}
                  {readingResult.advice && (
                    <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">✨</span>
                        <span className="text-arcana-gold font-serif font-bold">조언</span>
                      </div>
                      <p className="text-arcana-text text-sm leading-relaxed whitespace-pre-wrap">{readingResult.advice}</p>
                    </div>
                  )}

                  <div ref={resultBottomRef} />
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 flex-shrink-0 md:max-w-lg md:mx-auto md:w-full">
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
                      const siteName = "ArcanaInsight";

                      if (shareToken) {
                        // 공유 링크가 있으면 URL 공유
                        const url = `${window.location.origin}/tarot/result/${shareToken}`;
                        const text = `🔮 타로 리딩 결과를 확인해보세요!\n\n- ${siteName}`;
                        if (navigator.share) {
                          try { await navigator.share({ title: `타로 리딩 결과 - ${siteName}`, text, url }); } catch { /* 취소 */ }
                        } else {
                          try {
                            await navigator.clipboard.writeText(`${text}\n${url}`);
                            alert("링크가 복사되었습니다!");
                          } catch { /* 실패 */ }
                        }
                      } else {
                        // 공유 링크 없으면 결과 텍스트 직접 공유
                        const summary = result?.overallReading
                          ? `🔮 타로 리딩 결과\n\n${result.overallReading}\n\n- ${siteName}`
                          : `🔮 타로 리딩을 받아보세요!\n\n- ${siteName}`;
                        if (navigator.share) {
                          try { await navigator.share({ title: `타로 리딩 결과 - ${siteName}`, text: summary }); } catch { /* 취소 */ }
                        } else {
                          try {
                            await navigator.clipboard.writeText(summary);
                            alert("결과가 복사되었습니다!");
                          } catch { /* 실패 */ }
                        }
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

          {/* 대사창 — 모바일에서만 (데스크탑은 캐릭터 하단에 표시) */}
          {phase !== "result" && (
            <div className="md:hidden flex-shrink-0 z-30">
              <DialogueBox
                messages={chatMessages}
                characterName={character?.name ?? ""}
                isTyping={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
