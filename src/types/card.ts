export type CardSuit = "wands" | "cups" | "swords" | "pentacles";

export type MajorArcanaId =
  | "the-fool" | "the-magician" | "the-high-priestess" | "the-empress"
  | "the-emperor" | "the-hierophant" | "the-lovers" | "the-chariot"
  | "strength" | "the-hermit" | "wheel-of-fortune" | "justice"
  | "the-hanged-man" | "death" | "temperance" | "the-devil"
  | "the-tower" | "the-star" | "the-moon" | "the-sun"
  | "judgement" | "the-world";

export interface TarotCard {
  id: string;
  name: string;
  nameKo: string;
  number: number;
  type: "major" | "minor";
  suit?: CardSuit;
  imageUrl: string;
  upright: { keywords: string[]; meaning: string; };
  reversed: { keywords: string[]; meaning: string; };
}

export interface SelectedCard {
  card: TarotCard;
  position: number;
  isReversed: boolean;
  selectedAt: Date;
}
