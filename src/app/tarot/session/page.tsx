"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ReadingErrorState } from "@/components/session/ReadingErrorState";
import { useSessionStore } from "@/hooks/useSession";
import { useCharacterStore } from "@/hooks/useCharacter";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";

const ShuffleCeremony = dynamic(
  () => import("@/components/tarot/ShuffleCeremony").then((m) => ({ default: m.ShuffleCeremony })),
  { ssr: false, loading: () => null },
);
const CardDeck = dynamic(
  () => import("@/components/card/CardDeck").then((m) => ({ default: m.CardDeck })),
  { loading: () => <div className="w-full flex-1 min-h-[160px] md:min-h-[280px]" /> },
);
const CardSpread = dynamic(
  () => import("@/components/card/CardSpread").then((m) => ({ default: m.CardSpread })),
  { loading: () => <div className="w-full flex-1 min-h-[200px] md:min-h-[360px]" /> },
);
const ReadingProgressIndicator = dynamic(
  () => import("@/components/tarot/ReadingProgressIndicator").then((m) => ({ default: m.ReadingProgressIndicator })),
  { loading: () => null },
);
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { getCharacterById } from "@/data/characters";
import { getCharacterGreeting } from "@/data/characters/locale-helpers";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads } from "@/data/spreads";
import { TarotResultPanel } from "@/components/tarot/TarotResultPanel";
import { TarotCard, SelectedCard } from "@/types/card";
import { ChatMessage } from "@/types/session";
import { useT } from "@/i18n/useT";
import { useThemeStore } from "@/hooks/useTheme";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { shareWithUrl, shareWithText } from "@/lib/share-utils";
import { useReadingRevealStore } from "@/hooks/useReadingReveal";
import { useTarotReading } from "@/hooks/useTarotReading";
import { ServiceIllustrations } from "@/components/effects/ServiceIllustrations";


const deckManager = new DeckManager();

/** 타로 결과 공유 버튼 핸들러 — CC 22 → 모듈 레벨 추출 */
async function shareTarotResult(locale: Locale): Promise<void> {
  const result = useSessionStore.getState().readingResult;
  const shareToken = result?.shareToken;
  const siteName = "ArcanaInsight";
  const shareTitle = `${translate("tarot.session.share.title", locale)} - ${siteName}`;

  if (shareToken) {
    const url = `${globalThis.location?.origin}/tarot/result/${shareToken}`;
    const text = `🔮 ${shareTitle}`;
    await shareWithUrl(shareTitle, text, url, locale);
  } else {
    const summary = result?.overallReading
      ? `🔮 ${shareTitle}\n\n${result.overallReading}\n\n- ${siteName}`
      : `🔮 ${shareTitle}\n\n- ${siteName}`;
    await shareWithText(shareTitle, summary, locale);
  }
}

export default function TarotSessionPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const { currentMood, setMood } = useCharacterStore();
  const { animationPhase, setAnimationPhase } = useCardAnimationStore();
  const {
    phase, topic, characterId, spreadType, requiredCards, selectedCards, chatMessages, readingResult, isLoading,
    setPhase, setSessionId, setAvailableCards,
    selectCard, addChatMessage,
  } = useSessionStore();

  const character = characterId ? getCharacterById(characterId) : null;

  const { isRevealComplete, reset: resetReveal } = useReadingRevealStore();

  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [pendingConfirm, _setPendingConfirm] = useState(false);
  const pendingConfirmRef = useRef(false);
  const setPendingConfirm = (v: boolean) => { pendingConfirmRef.current = v; _setPendingConfirm(v); };

  const { readingError, readingErrorReason, isConnecting, elapsedSec, readingAbortRef, startReading, setReadingError } =
    useTarotReading({ setRevealedPositions, setPendingConfirm });

  const [confirmEachCard, setConfirmEachCard] = useState(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const redirectedRef = useRef(false);
  // 빠른 연속 터치 race 차단: 동기 ref-lock (RAF로 다음 frame에 unlock)
  const selectionLockRef = useRef(false);
  // 마지막 카드 자동 시작 setTimeout 이중 큐잉 차단
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleConfirmMode = () => {
    setConfirmEachCard((prev) => {
      const next = !prev;
      localStorage.setItem("arcana-confirm-each-card", String(next));
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setConfirmEachCard(localStorage.getItem("arcana-confirm-each-card") === "true");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // unmount cleanup: 진행 중인 SSE abort + 자동 시작 타이머 clear (saju/shinjeom과 동일 패턴)
  useEffect(() => {
    return () => {
      readingAbortRef.current?.abort();
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, []);

  // phase가 초기화되면 reveal 상태도 리셋
  useEffect(() => {
    if (phase === "card-shuffle" || phase === "card-select") {
      resetReveal();
    }
  }, [phase, resetReveal]);

  useEffect(() => {
    if (!topic || !character || !spreadType) {
      if (!redirectedRef.current) { redirectedRef.current = true; router.push("/tarot"); }
      return;
    }
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

    setMood("default");
    addChatMessage({ id: crypto.randomUUID(), role: "character", content: getCharacterGreeting(character, locale), mood: "default", timestamp: new Date() });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]); // NOSONAR

  const handleCeremonyComplete = useCallback(() => {
    const { requiredCards: required } = useSessionStore.getState();
    setAnimationPhase("spreading");
    setPhase("card-select");
    addChatMessage({
      id: crypto.randomUUID(), role: "character",
      content: t("tarot.session.msg.pick-cards-prompt").replace("{n}", String(required)),
      mood: "default", timestamp: new Date(),
    });
  }, [addChatMessage, setAnimationPhase, setPhase, t]);

  const handleCardSelect = useCallback((index: number) => {
    // 빠른 연속 터치 race 차단:
    // 1. selectionLockRef 동기 ref-lock (state 반영 전 두 번째 click 차단)
    // 2. pendingConfirmRef (확인 대기 중 추가 선택 차단)
    if (selectionLockRef.current || pendingConfirmRef.current) return;
    // TOCTOU 방지: lock을 fresh getState 호출 직전에 즉시 set (다른 click handler가 동일 frame에 진입해도 차단)
    selectionLockRef.current = true;
    requestAnimationFrame(() => { selectionLockRef.current = false; });
    // 항상 fresh 상태를 읽어 stale closure 방지
    const { selectedCards: currentCards, requiredCards: required } = useSessionStore.getState();
    if (currentCards.length >= required) return;
    // 같은 deck index 중복 클릭 방어 (CardDeck isSelected prop의 stale 보완)
    if (currentCards.some((c) => c.card.id === shuffledDeck[index]?.id)) return;

    const card = shuffledDeck[index];
    if (!card) return;
    const isReversed = Math.random() > 0.5;
    const position = currentCards.length;
    const selected: SelectedCard = { card, position, isReversed, selectedAt: new Date() };
    if (!selectCard(selected)) return;
    setSelectedIndices((prev) => prev.includes(index) ? prev : [...prev, index]);
    setRevealedPositions((prev) => prev.includes(position) ? prev : [...prev, position]);
    setMood("surprised");

    const currentCount = currentCards.length + 1;
    const isLast = currentCount >= required;

    if (isLast && !confirmEachCard) {
      // 확인 모드 OFF + 마지막 카드 → 자동으로 리딩 시작 (즉시 잠금으로 중복 방지)
      setPendingConfirm(true);
      // setTimeout 이중 큐잉 차단: 이미 예약된 타이머가 있으면 재예약 안 함
      if (autoStartTimerRef.current) return;
      autoStartTimerRef.current = setTimeout(() => {
        autoStartTimerRef.current = null;
        const { selectedCards: allCards, requiredCards: req } = useSessionStore.getState();
        // 800ms 동안 cancel·race로 카드 수가 줄었으면 startReading 차단 (서버에 부족한 cards 전달 방지)
        if (allCards.length < req) {
          console.warn("[tarot-session] auto-start aborted: insufficient cards", allCards.length, "/", req);
          setPendingConfirm(false);
          return;
        }
        startReading(allCards);
      }, 800);
    } else if (confirmEachCard || isLast) {
      // 확인 모드 ON 또는 마지막 카드(확인 모드 ON) → 확인 요청
      setPendingConfirm(true);
      setTimeout(() => {
        addChatMessage({
          id: crypto.randomUUID(), role: "character",
          content: isLast
            ? t("tarot.session.msg.confirm-final").replace("{n}", String(required))
            : t("tarot.session.msg.confirm-card")
                .replace(/\{current\}/g, String(currentCount))
                .replace(/\{total\}/g, String(required)),
          mood: "mystical", timestamp: new Date(),
        });
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledDeck, confirmEachCard, selectCard, setMood, addChatMessage]); // NOSONAR

  /** 확인 → 마지막 카드면 리딩 시작, 아니면 다음 카드 선택 계속 */
  const handleConfirmCard = useCallback(() => {
    // 빠른 더블클릭으로 startReading 이중 호출 차단
    if (!pendingConfirmRef.current) return;
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    setPendingConfirm(false);
    const { selectedCards: currentCards } = useSessionStore.getState();
    if (currentCards.length >= requiredCards) {
      startReading(currentCards);
    } else {
      const nextCardMsg = translate("tarot.session.msg.next-card", locale)
        .replace("{current}", String(currentCards.length))
        .replace("{total}", String(requiredCards));
      addChatMessage({
        id: crypto.randomUUID(), role: "character",
        content: nextCardMsg,
        mood: "default", timestamp: new Date(),
      });
      setMood("default");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredCards, addChatMessage, setMood]); // NOSONAR

  /** 취소 → 마지막 카드 제거, 다시 선택 가능 */
  const handleCancelLastCard = useCallback(() => {
    // 자동 시작 타이머가 예약돼 있으면 cancel — store가 줄어든 상태로 startReading 발화 방지
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
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
      content: translate("tarot.session.msg.different-card", locale),
      mood: "default", timestamp: new Date(),
    });
    setMood("default");
  }, [addChatMessage, setMood, locale]);

  // 결과 스트리밍 시 컨테이너 내부만 하단 스크롤 (윈도우 스크롤 방지)
  useEffect(() => {
    if (phase === "result") {
      const container = resultContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages, phase]);

  const spread = spreadType ? spreads[spreadType] : null;
  // showLabel: AI 리딩 완료(result phase + reveal complete) 시에만 카드 텍스트 공개
  const showCardLabel = phase === "result" && isRevealComplete;
  const particleDensityMap: Record<string, "low" | "medium" | "high"> = { reading: "medium", result: "low" };
  const particleDensity = particleDensityMap[phase] ?? "medium";
  const effectTheme = character?.effectTheme;
  const { activeTheme } = useThemeStore();

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('tarot', activeTheme)} alt="" fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,26,0.7) 100%)",
        }} />
      </div>

      {/* 파티클 */}
      <ParticleOverlay
        density={particleDensity}
        colorScheme={effectTheme ? { primary: effectTheme.primary, secondary: effectTheme.secondary, accent: effectTheme.accent } : undefined}
        particleStyle={effectTheme?.particleStyle}
        className="z-10"
      />
      <MysticBackground service="tarot" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-tarot" />

      {/* 무대: 모바일 세로 / 데스크탑 가로 5:5 */}
      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 좌측 컬럼: 캐릭터 + 대사 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col transition-all duration-500">
          {/* 캐릭터 */}
          {character && (
            <div className="flex-1 relative overflow-hidden">
              <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
              {/* 데스크탑: 하단 그라디언트 — 대사창과 자연스럽게 연결 */}
              <div className="hidden md:block absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-arcana-bg/80 to-transparent pointer-events-none" />
            </div>
          )}
          {/* 대사창 — 데스크탑에서 캐릭터 하단에 표시 */}
          {phase !== "result" && (
            <div className="hidden md:block flex-shrink-0 px-4 pb-4">
              <DialogueBox
                messages={chatMessages}
                characterName={character?.name ?? ""}
                isTyping={false}
              />
            </div>
          )}
        </div>

        {/* 우측: 모바일 하단 / 데스크탑 우측 50% */}
        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden relative">
          {/* 데스크탑 전용 서비스 일러스트 */}
          <div className="absolute inset-0 hidden md:block pointer-events-none">
            <ServiceIllustrations service="tarot" />
          </div>
          {phase === "card-shuffle" && (
            <ShuffleCeremony
              characterId={characterId ?? "arcana"}
              onComplete={handleCeremonyComplete}
              primaryColor={character?.effectTheme?.primary}
            />
          )}
          {phase === "card-select" && (
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                className="text-arcana-muted text-xs hover:text-arcana-purple transition-colors"
                type="button"
              >
                {t("tarot.session.btn.back-to-character")}
              </button>
              <button
                onClick={toggleConfirmMode}
                className={`flex items-center gap-2 text-xs font-serif px-3 py-1.5 rounded-full border transition-all ${
                  confirmEachCard
                    ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple shadow-sm shadow-arcana-purple/10"
                    : "border-arcana-border/50 text-arcana-muted/60 hover:border-arcana-border hover:text-arcana-muted"
                }`}
                type="button"
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  confirmEachCard ? "border-arcana-purple bg-arcana-purple" : "border-arcana-muted/40"
                }`}>
                  {confirmEachCard && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {t("settings.card-confirm.label")}
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {phase === "card-select" && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden"
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
                      {t("tarot.session.btn.pick-again")}
                    </button>
                    <button
                      onClick={handleConfirmCard}
                      className="px-5 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white text-xs font-serif font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
                    >
                      {selectedCards.length >= requiredCards ? t("tarot.session.btn.proceed") : t("tarot.session.btn.confirm")}
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
                  glowColor={effectTheme?.primary}
                  showLabel={showCardLabel}
                />
                {/* 카드 뒤집기 연출 + 진행 인디케이터 동시 노출. 인디케이터는 화면 하단 fixed 미니 배너. */}
                {phase === "reading" && isLoading && !readingError && (
                  <ReadingProgressIndicator
                    elapsedSec={elapsedSec}
                    isConnecting={isConnecting}
                    primaryColor={effectTheme?.primary}
                  />
                )}
                {readingError && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <ReadingErrorState
                      titleText={t("tarot.session.error.title")}
                      errorText={readingErrorReason === "timeout" ? t("tarot.session.error.timeout") : t("tarot.session.error.reading")}
                      tryAgainText={t("tarot.session.btn.try-again")}
                      newSessionText={t("tarot.session.btn.new-session")}
                      onRetry={() => { setReadingError(false); startReading(selectedCards); }}
                      onNewSession={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                      isRetrying={isLoading}
                    />
                  </div>
                )}
              </motion.div>
            )}
            {phase === "result" && readingResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full flex-1 flex flex-col overflow-hidden py-4"
              >
                <TarotResultPanel
                  readingResult={readingResult}
                  spread={spread ?? null}
                  selectedCards={selectedCards}
                  locale={locale}
                  overallLabel={t("tarot.result.overall")}
                  adviceLabel={t("tarot.result.advice")}
                  newSessionLabel={t("tarot.session.btn.new-session")}
                  shareLabel={t("tarot.session.btn.share")}
                  containerRef={resultContainerRef}
                  onNewSession={() => { useSessionStore.getState().reset(); useCardAnimationStore.getState().reset(); router.push("/tarot"); }}
                  onShare={() => shareTarotResult(locale)}
                />
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
