import { TarotCard, SelectedCard } from "@/types/card";
import { majorArcana } from "@/data/cards/major-arcana";
import { minorArcana } from "@/data/cards/minor-arcana";

export class DeckManager {
  private deck: TarotCard[];

  constructor() { this.deck = [...majorArcana, ...minorArcana]; }

  getAllCards(): TarotCard[] { return this.deck; }

  getCardById(id: string): TarotCard | undefined { return this.deck.find((c) => c.id === id); }

  shuffleAndDraw(count: number): SelectedCard[] {
    const shuffled = [...this.deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count).map((card, index) => ({
      card, position: index, isReversed: Math.random() > 0.5, selectedAt: new Date(),
    }));
  }

  drawSpecificCards(cardIds: string[], reversed: boolean[]): SelectedCard[] {
    return cardIds.map((id, index) => {
      const card = this.getCardById(id);
      if (!card) throw new Error(`Card not found: ${id}`);
      return { card, position: index, isReversed: reversed[index] ?? false, selectedAt: new Date() };
    });
  }
}
