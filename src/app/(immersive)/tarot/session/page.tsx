"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ReadingErrorState } from "@/components/session/ReadingErrorState";
import { useSessionStore } from "@/hooks/useSession";
import { useCardAnimationStore } from "@/hooks/useCardAnimation";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";

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
import { TarotResultPanel } from "@/components/tarot/TarotResultPanel";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { shareWithUrl, shareWithText } from "@/lib/share-utils";
import { ServiceIllustrations } from "@/components/effects/ServiceIllustrations";
import { useTarotCardSelection } from "@/hooks/useTarotCardSelection";

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
  const {
    locale, t, router,
    phase, character, currentMood, chatMessages, selectedCards, requiredCards, readingResult, isLoading, animationPhase,
    shuffledDeck, selectedIndices, revealedPositions, pendingConfirm, confirmEachCard,
    toggleConfirmMode, handleCardSelect, handleConfirmCard, handleCancelLastCard, handleBackToSpread,
    readingError, readingErrorReason, isConnecting, elapsedSec, startReading, setReadingError,
    spread, showCardLabel, particleDensity, effectTheme, activeTheme, resultContainerRef,
  } = useTarotCardSelection();

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
      {/* 서비스 일러스트 — 전체화면 레이어 (데스크탑) */}
      <div className="absolute inset-0 z-[8] hidden md:block pointer-events-none">
        <ServiceIllustrations service="tarot" />
      </div>

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
          {phase === "card-select" && (
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleBackToSpread}
                className="text-arcana-muted text-xs hover:text-arcana-purple transition-colors"
                type="button"
              >
                {t("tarot.session.btn.back-to-spread")}
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
                  directAnswerLabel={t("tarot.result.direct-answer")}
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
