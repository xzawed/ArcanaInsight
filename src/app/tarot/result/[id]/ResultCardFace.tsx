"use client";

import { CardFace } from "@/components/card/CardFace";
import { useSkinStore } from "@/hooks/useSkinStore";
import { TarotCard } from "@/types/card";

interface ResultCardFaceProps {
  card: TarotCard;
  isReversed: boolean;
}

export function ResultCardFace({ card, isReversed }: ResultCardFaceProps) {
  const { selectedSkinId } = useSkinStore();
  return <CardFace card={card} isReversed={isReversed} size="sm" skinId={selectedSkinId} />;
}
