"use client";

import { CardFace } from "@/components/card/CardFace";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { useThemeStore } from "@/hooks/useTheme";
import { TarotCard } from "@/types/card";

interface ResultCardFaceProps {
  card: TarotCard;
  isReversed: boolean;
}

export function ResultCardFace({ card, isReversed }: Readonly<ResultCardFaceProps>) {
  const { selectedSkinId } = useSkinStore();
  const { activeTheme } = useThemeStore();
  const { resolvedStyle } = useCardStyleStore();
  const styleId = resolvedStyle(activeTheme);
  return <CardFace card={card} isReversed={isReversed} size="sm" skinId={selectedSkinId} styleId={styleId ?? undefined} />;
}
