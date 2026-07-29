"use client";

import { motion } from "framer-motion";
import { ReadingText } from "@/components/common/ReadingText";
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
import { getCardName } from "@/data/cards/locale-helpers";
import { getPositionLabel, fallbackPosLabel } from "@/data/spreads";
import type { SelectedCard } from "@/types/card";
import type { SpreadDefinition } from "@/types/session";
import type { CardInterpretationItem } from "@/types/service";
import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/translations";

interface CardInterpretationListProps {
  interpretations: CardInterpretationItem[];
  selectedCards: SelectedCard[];
  spread: SpreadDefinition | null;
  locale: Locale;
}

export function CardInterpretationList({ interpretations, selectedCards, spread, locale }: Readonly<CardInterpretationListProps>) {
  // 라벨은 i18n SSOT(section.* 키)에서 가져온다 — 컴포넌트가 ko/en/ja를 직접 들고 있으면
  // 언어 추가 시 i18n:check가 못 잡는 사각지대가 된다.
  const labels = {
    symbolism: t("tarot.section.symbolism", locale),
    situation: t("tarot.section.situation", locale),
    action: t("tarot.section.action", locale),
  };
  return (
    <>
      {interpretations.map((interp, i) => {
        const card = selectedCards.find(c => c.card.id === interp.cardId);
        const fallbackCard = !card && interp.position < selectedCards.length
          ? selectedCards[interp.position] : null;
        let displayName = "";
        if (card?.card) displayName = getCardName(card.card, locale);
        else if (fallbackCard?.card) displayName = getCardName(fallbackCard.card, locale);
        const pos = spread?.positions[interp.position];
        const posLabel = pos ? getPositionLabel(pos, locale) : fallbackPosLabel(interp.position, locale);
        const hasNewFormat = !!(interp.symbolism || interp.situation);
        return (
          <motion.div
            key={`card-${interp.cardId}-${interp.position}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + Math.min(i * 0.2, 0.8), ease: "easeOut" }}
            className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-arcana-border/50">
              <span className="text-arcana-gold text-xs md:text-sm font-serif font-bold px-2 py-0.5 bg-arcana-gold/10 rounded-full">{posLabel}</span>
              <span className="text-arcana-text font-bold text-sm md:text-base">{displayName}</span>
            </div>
            {hasNewFormat ? (
              <div>
                <ReadingSectionBlock icon="✦" label={labels.symbolism} content={interp.symbolism ?? ""} />
                <ReadingSectionBlock icon="◈" label={labels.situation} content={interp.situation ?? ""} />
                {interp.action && (
                  <ReadingSectionBlock icon="→" label={labels.action} content={interp.action} />
                )}
              </div>
            ) : (
              <ReadingText text={interp.interpretation ?? ""} />
            )}
          </motion.div>
        );
      })}
    </>
  );
}
