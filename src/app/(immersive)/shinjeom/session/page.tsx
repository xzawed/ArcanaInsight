"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useShinjeomSessionStore } from "@/hooks/useShinjeomSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { ResultTextCard } from "@/components/session/ResultTextCard";
import { SessionActionButtons } from "@/components/session/SessionActionButtons";
import { shareWithUrl, shareWithText } from "@/lib/share-utils";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { ShinjeomEnergyEffect } from "@/components/shinjeom/ShinjeomEnergyEffect";
import { ServiceIllustrations } from "@/components/effects/ServiceIllustrations";
import { useShinjeomChat } from "@/hooks/useShinjeomChat";

const SITE_NAME = "ArcanaInsight";

async function handleShinjeomShare(r: { shareToken?: string | null; overallReading?: string | null } | null, locale: Locale): Promise<void> {
  const shareToken = r?.shareToken;
  const title = `${translate("shinjeom.session.share.title", locale)} - ${SITE_NAME}`;
  if (shareToken) {
    const url = `${globalThis.location?.origin}/shinjeom/result/${shareToken}`;
    const text = `🔮 ${title}`;
    await shareWithUrl(title, text, url, locale);
  } else {
    const summary = r?.overallReading
      ? `🔮 ${title}\n\n${r.overallReading.slice(0, 100)}...\n\n- ${SITE_NAME}`
      : `🔮 ${title}\n\n- ${SITE_NAME}`;
    await shareWithText(title, summary, locale);
  }
}

export default function ShinjeomSessionPage() {
  const {
    locale, t, router,
    phase, character, characterId, currentMood, chatMessages, turnCount, readingResult, isLoading, reset,
    inputText, setInputText, showEnergyEffect, setShowEnergyEffect,
    handleSend, handleEndConsultation, chatContainerRef, activeTheme,
  } = useShinjeomChat();

  if (!character) return null;

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('shinjeom', activeTheme)} alt="" fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density="low" className="z-10" />
      <MysticBackground service="shinjeom" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-shinjeom" />
      {/* 서비스 일러스트 — 전체화면 레이어 (데스크탑) */}
      <div className="absolute inset-0 z-[8] hidden md:block pointer-events-none">
        <ServiceIllustrations service="shinjeom" />
      </div>
      {showEnergyEffect && (
        <ShinjeomEnergyEffect onComplete={() => setShowEnergyEffect(false)} />
      )}

      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 캐릭터 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col">
          {character && (
            <div className="flex-1 relative overflow-hidden">
              <CharacterDisplay character={character} mood={currentMood} className="w-full h-full" />
            </div>
          )}
        </div>

        {/* 대화 영역 */}
        <div className="flex-1 md:w-[50%] flex flex-col px-3 md:px-4 overflow-hidden relative">
          {phase === "result" && readingResult ? (
            /* 최종 결과 */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto py-4 space-y-4">
              {readingResult.directAnswer && (
                <ResultTextCard text={readingResult.directAnswer} emoji="🎯" label={t("shinjeom.result.direct-answer")} delay={0.05} colorScheme="gold" />
              )}

              <ResultTextCard text={readingResult.overallReading} emoji="🔮" label={t("shinjeom.result.overall")} delay={0.1} colorScheme="purple" />

              {readingResult.topicReading && (
                <ResultTextCard text={readingResult.topicReading} emoji="🔍" label={t("shinjeom.result.topic")} delay={0.35} colorScheme="gold" />
              )}

              {readingResult.advice && (
                <ResultTextCard text={readingResult.advice} emoji="✨" label={t("shinjeom.result.advice")} delay={0.6} colorScheme="card" />
              )}

              <SessionActionButtons
                onNewSession={() => { reset(); router.push("/shinjeom"); }}
                onShare={() => handleShinjeomShare(useShinjeomSessionStore.getState().readingResult, locale)}
                newSessionLabel={t("tarot.session.btn.new-session")}
                shareLabel={t("shinjeom.session.btn.share")}
                className="pt-2"
              />
            </motion.div>
          ) : (
            /* 대화 */
            <>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
                <AnimatePresence>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-arcana-purple/20 border border-arcana-purple/30"
                          : "bg-arcana-card/70 border border-arcana-border"
                      }`}>
                        {msg.role === "character" && (
                          <span className="text-arcana-purple text-[10px] font-serif font-bold block mb-1">{character.name}</span>
                        )}
                        <p className="text-arcana-text text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-arcana-card/70 border border-arcana-border rounded-2xl px-4 py-3">
                      <span className="text-arcana-muted text-sm animate-pulse">{getWaitingLinesData(locale).loadingText[characterId ?? ""] ?? getWaitingLinesData(locale).defaultLoadingText}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 입력 */}
              <div className="flex-shrink-0 py-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend(); }}
                    placeholder={turnCount === 0 ? t("shinjeom.session.input.placeholder.first") : t("shinjeom.session.input.placeholder.followup")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 rounded-full bg-arcana-card/70 border border-arcana-border text-arcana-text text-sm placeholder:text-arcana-muted/50 focus:outline-none focus:border-arcana-purple transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm disabled:opacity-40 transition-opacity"
                  >
                    {t("shinjeom.session.btn.send")}
                  </button>
                </div>
                {turnCount >= 1 && (
                  <button
                    data-testid="shinjeom-get-result-btn"
                    onClick={handleEndConsultation}
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 rounded-full border border-arcana-gold/60 text-arcana-gold font-serif font-bold text-sm disabled:opacity-40 transition-opacity hover:bg-arcana-gold/10"
                  >
                    {t("shinjeom.session.btn.get-result")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
