"use client";

import type { RefObject } from "react";
import { ResultTextCard } from "@/components/session/ResultTextCard";
import { SessionActionButtons } from "@/components/session/SessionActionButtons";
import { CardInterpretationList } from "@/components/tarot/CardInterpretationList";
import type { ReadingResult } from "@/types/service";
import type { SelectedCard } from "@/types/card";
import type { SpreadDefinition } from "@/types/session";
import type { Locale } from "@/i18n/config";

interface TarotResultPanelProps {
  readingResult: ReadingResult;
  spread: SpreadDefinition | null;
  selectedCards: SelectedCard[];
  locale: Locale;
  overallLabel: string;
  directAnswerLabel: string;
  adviceLabel: string;
  newSessionLabel: string;
  shareLabel: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onNewSession: () => void;
  onShare: () => void;
}

export function TarotResultPanel({
  readingResult,
  spread,
  selectedCards,
  locale,
  overallLabel,
  directAnswerLabel,
  adviceLabel,
  newSessionLabel,
  shareLabel,
  containerRef,
  onNewSession,
  onShare,
}: TarotResultPanelProps) {
  return (
    <>
      <div ref={containerRef} data-testid="reading-content" className="space-y-4 md:space-y-5 flex-1 overflow-y-auto pr-2">
        {readingResult.cardInterpretations && readingResult.cardInterpretations.length > 0 && (
          <CardInterpretationList
            interpretations={readingResult.cardInterpretations}
            selectedCards={selectedCards}
            spread={spread}
            locale={locale}
          />
        )}
        {readingResult.directAnswer && (
          <ResultTextCard text={readingResult.directAnswer} emoji="🎴" label={directAnswerLabel} delay={0.6} colorScheme="purple" />
        )}
        {readingResult.overallReading && (
          <ResultTextCard text={readingResult.overallReading} emoji="🔮" label={overallLabel} delay={1} colorScheme="purple" />
        )}
        {readingResult.advice && (
          <ResultTextCard text={readingResult.advice} emoji="✨" label={adviceLabel} delay={1.4} colorScheme="gold" />
        )}
      </div>
      <SessionActionButtons
        onNewSession={onNewSession}
        onShare={onShare}
        newSessionLabel={newSessionLabel}
        shareLabel={shareLabel}
      />
    </>
  );
}
