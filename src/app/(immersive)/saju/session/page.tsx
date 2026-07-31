"use client";

import Image from "next/image";
import { ResultTextCard } from "@/components/session/ResultTextCard";
import { SessionActionButtons } from "@/components/session/SessionActionButtons";
import { ReadingErrorState } from "@/components/session/ReadingErrorState";
import { shareWithUrl, shareWithText } from "@/lib/share-utils";
import { motion } from "framer-motion";
import { useSajuSessionStore } from "@/hooks/useSajuSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { DialogueBox } from "@/components/chat/DialogueBox";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { MysticBackground, ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { SajuChart } from "@/components/saju/SajuChart";
import { OhaengGraph } from "@/components/saju/OhaengGraph";
import { DaeunTimeline } from "@/components/saju/DaeunTimeline";
import { SajuChartReveal } from "@/components/saju/SajuChartReveal";
import { getWaitingLinesData } from "@/data/characters/waiting-lines-i18n";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";
import { ServiceIllustrations } from "@/components/effects/ServiceIllustrations";
import { useSajuReading } from "@/hooks/useSajuReading";

const SITE_NAME = "ArcanaInsight";

async function handleSajuShare(r: { shareToken?: string | null; overallReading?: string | null } | null, locale: Locale): Promise<void> {
  const shareToken = r?.shareToken;
  const title = `${translate("saju.session.share.title", locale)} - ${SITE_NAME}`;
  if (shareToken) {
    const url = `${globalThis.location?.origin}/saju/result/${shareToken}`;
    const text = `☯ ${title}`;
    await shareWithUrl(title, text, url, locale);
  } else {
    const summary = r?.overallReading
      ? `☯ ${title}\n\n${r.overallReading.slice(0, 100)}...\n\n- ${SITE_NAME}`
      : `☯ ${title}\n\n- ${SITE_NAME}`;
    await shareWithText(title, summary, locale);
  }
}

export default function SajuSessionPage() {
  const {
    locale, t, router,
    phase, character, currentMood, chatMessages, readingResult, sajuData, isLoading,
    readingError, readingErrorReason, setReadingError,
    startReading, resultContainerRef, birthYear, activeTheme,
  } = useSajuReading();

  return (
    <div className="relative h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={getServiceBackgroundUrl('saju', activeTheme)} alt="" fill className="object-cover" sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>
      <ParticleOverlay density={phase === "reading" ? "medium" : "low"} className="z-10" />
      <MysticBackground service="saju" />
      <ThemeAtmosphere theme={activeTheme} intensity="ambient" className="z-[6] mix-blend-screen" testId="session-theme-atmosphere-saju" />
      {/* 서비스 일러스트 — 전체화면 레이어 (데스크탑) */}
      <div className="absolute inset-0 z-[8] hidden md:block pointer-events-none">
        <ServiceIllustrations service="saju" />
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col md:flex-row z-20">
        {/* 좌측 컬럼: 캐릭터 + 대사 */}
        <div className="w-full h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 flex flex-col transition-all duration-500">
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
              <DialogueBox messages={chatMessages} characterName={character?.name ?? ""} isTyping={false} />
            </div>
          )}
        </div>

        <div className="flex-1 md:w-[50%] flex flex-col px-2 md:px-4 overflow-hidden relative">
          {phase === "result" && readingResult && sajuData ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex-1 flex flex-col overflow-hidden py-4">
              <div ref={resultContainerRef} className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
                <SajuChartReveal index={0}>
                  <SajuChart pillars={sajuData.pillars} dayMaster={sajuData.dayMaster}
                    dayMasterElement={sajuData.dayMasterElement} isStrong={sajuData.isStrong} yongsin={sajuData.yongsin} />
                </SajuChartReveal>
                <SajuChartReveal index={1}>
                  <OhaengGraph elements={sajuData.elements} yongsinElement={sajuData.yongsin.element} />
                </SajuChartReveal>

                {readingResult.directAnswer && (
                  <ResultTextCard text={readingResult.directAnswer} emoji="🎯" label={t("saju.result.direct-answer")} delay={0.3} colorScheme="gold" />
                )}

                {readingResult.overallReading && (
                  <ResultTextCard text={readingResult.overallReading} emoji="☯" label={t("saju.result.overall")} delay={0.4} colorScheme="purple" />
                )}

                {readingResult.topicReading && (
                  <ResultTextCard text={readingResult.topicReading} emoji="🔍" label={t("saju.result.topic")} delay={0.55} colorScheme="card" />
                )}

                <SajuChartReveal index={4}>
                  <DaeunTimeline majorFortunes={sajuData.majorFortunes} yearlyFortune={sajuData.yearlyFortune} birthYear={birthYear} />
                </SajuChartReveal>

                {readingResult.advice && (
                  <ResultTextCard text={readingResult.advice} emoji="✨" label={t("saju.result.advice")} delay={0.85} colorScheme="gold" />
                )}
              </div>

              <SessionActionButtons
                onNewSession={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                onShare={() => handleSajuShare(useSajuSessionStore.getState().readingResult, locale)}
                newSessionLabel={t("tarot.session.btn.new-session")}
                shareLabel={t("tarot.session.btn.share")}
              />
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {readingError ? (
                <ReadingErrorState
                  titleText={t("tarot.session.error.title")}
                  errorText={readingErrorReason === "timeout" ? t("tarot.session.error.timeout") : t("tarot.session.error.reading")}
                  tryAgainText={t("tarot.session.btn.try-again")}
                  newSessionText={t("tarot.session.btn.new-session")}
                  onRetry={() => { setReadingError(false); startReading(); }}
                  onNewSession={() => { useSajuSessionStore.getState().reset(); router.push("/saju"); }}
                  isRetrying={isLoading}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
                  <p className="text-arcana-muted text-xs font-serif">{getWaitingLinesData(locale).sajuAnalyzingText[character?.id ?? ""] ?? getWaitingLinesData(locale).defaultSajuAnalyzingText}</p>
                </div>
              )}
            </div>
          )}

          {/* 대사창 — 모바일에서만 (데스크탑은 캐릭터 하단에 표시) */}
          {phase !== "result" && (
            <div className="md:hidden flex-shrink-0 z-30">
              <DialogueBox messages={chatMessages} characterName={character?.name ?? ""} isTyping={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
