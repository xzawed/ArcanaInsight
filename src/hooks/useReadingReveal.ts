import { create } from "zustand";

interface ReadingRevealState {
  revealedCardIds: string[];
  revealingCardId: string | null;
  isRevealComplete: boolean;
  revealCard: (cardId: string) => void;
  revealAll: (cardIds: string[]) => void;
  reset: () => void;
}

export const useReadingRevealStore = create<ReadingRevealState>((set) => ({
  revealedCardIds: [],
  revealingCardId: null,
  isRevealComplete: false,

  revealCard: (cardId) =>
    set((s) => ({
      revealingCardId: cardId,
      revealedCardIds: s.revealedCardIds.includes(cardId)
        ? s.revealedCardIds
        : [...s.revealedCardIds, cardId],
    })),

  revealAll: (cardIds) =>
    set({ revealedCardIds: cardIds, revealingCardId: null, isRevealComplete: true }),

  reset: () =>
    set({ revealedCardIds: [], revealingCardId: null, isRevealComplete: false }),
}));
