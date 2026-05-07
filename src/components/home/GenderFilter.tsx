"use client";

import { GenderFilter } from "@/types/character";
import { useGenderStore } from "@/hooks/useGenderStore";
import { useT } from "@/i18n/useT";

export function GenderFilterToggle() {
  const { genderFilter, setGenderFilter } = useGenderStore();
  const { t } = useT();
  const labels: Record<GenderFilter, string> = {
    all: t("settings.gender.all"),
    female: t("settings.gender.female"),
    male: t("settings.gender.male"),
  };

  return (
    <div className="flex justify-center gap-2 mb-6">
      {(["all", "female", "male"] as GenderFilter[]).map((f) => (
        <button
          key={f}
          onClick={() => setGenderFilter(f)}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-bold border transition-colors ${
            genderFilter === f
              ? "border-arcana-purple bg-arcana-purple/20 text-arcana-purple"
              : "border-arcana-border text-arcana-muted hover:border-arcana-purple"
          }`}
        >
          {labels[f]}
        </button>
      ))}
    </div>
  );
}
