import { create } from "zustand";
import { Mood } from "@/types/character";

interface CharacterState {
  currentMood: Mood;
  isTyping: boolean;
  setMood: (mood: Mood) => void;
  setTyping: (typing: boolean) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  currentMood: "default",
  isTyping: false,
  setMood: (mood) => set({ currentMood: mood }),
  setTyping: (typing) => set({ isTyping: typing }),
}));
