import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReducedMotionState {
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

export const useReducedMotionStore = create<ReducedMotionState>()(
  persist(
    (set) => ({
      reducedMotion: false,
      setReducedMotion: (value: boolean) => set({ reducedMotion: value }),
    }),
    {
      name: "arcana-reduced-motion",
    }
  )
);
