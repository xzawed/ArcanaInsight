import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GenderFilter } from "@/types/character";

interface GenderStore {
  genderFilter: GenderFilter;
  setGenderFilter: (filter: GenderFilter) => void;
}

export const useGenderStore = create<GenderStore>()(
  persist(
    (set) => ({
      genderFilter: "all",
      setGenderFilter: (filter) => set({ genderFilter: filter }),
    }),
    {
      name: "arcana-gender-filter",
    }
  )
);
