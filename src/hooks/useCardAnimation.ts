import { create } from "zustand";

type AnimationPhase = "idle" | "shuffling" | "spreading" | "selecting" | "flipping" | "placing";

interface CardAnimationState {
  animationPhase: AnimationPhase;
  flippedCardIndex: number | null;
  setAnimationPhase: (phase: AnimationPhase) => void;
  setFlippedCard: (index: number | null) => void;
  reset: () => void;
}

export const useCardAnimationStore = create<CardAnimationState>((set) => ({
  animationPhase: "idle",
  flippedCardIndex: null,
  setAnimationPhase: (phase) => set({ animationPhase: phase }),
  setFlippedCard: (index) => set({ flippedCardIndex: index }),
  reset: () => set({ animationPhase: "idle", flippedCardIndex: null }),
}));
