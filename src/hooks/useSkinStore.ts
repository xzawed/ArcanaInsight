import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SKIN_ID } from "@/data/skins";

interface SkinState {
  selectedSkinId: string;
  setSkin: (skinId: string) => void;
}

export const useSkinStore = create<SkinState>()(
  persist(
    (set) => ({
      selectedSkinId: DEFAULT_SKIN_ID,
      setSkin: (skinId: string) => set({ selectedSkinId: skinId }),
    }),
    {
      name: "arcana-skin",
    }
  )
);
