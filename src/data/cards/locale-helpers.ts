import type { TarotCard } from "@/types/card";

export function getCardName(card: TarotCard, locale: string): string {
  if (locale === "ko") return card.nameKo;
  if (locale === "ja") return card.nameJa ?? card.name;
  return card.name;
}
