"use client";

import { OHAENG } from "@/data/saju/constants";
import type { SajuResult } from "@/services/saju/saju-types";

interface DaeunTimelineProps {
  majorFortunes: SajuResult["majorFortunes"];
  yearlyFortune: SajuResult["yearlyFortune"];
  birthYear: number;
}

export function DaeunTimeline({ majorFortunes, yearlyFortune, birthYear }: DaeunTimelineProps) {
  const currentAge = new Date().getFullYear() - birthYear;

  return (
    <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🌊</span>
        <h3 className="font-serif font-bold text-arcana-purple">대운 흐름</h3>
      </div>

      {/* 대운 타임라인 */}
      <div className="flex overflow-x-auto gap-1 pb-2">
        {majorFortunes.map((f, i) => {
          const isCurrent = currentAge >= f.startAge && currentAge <= f.endAge;
          const info = OHAENG[f.element];

          return (
            <div
              key={i}
              className={`flex-shrink-0 w-16 rounded-lg p-2 text-center border transition-all ${
                isCurrent
                  ? "border-arcana-gold bg-arcana-gold/15 shadow-lg shadow-arcana-gold/20"
                  : "border-arcana-border bg-arcana-surface/30"
              }`}
            >
              <div className="font-serif font-bold text-sm" style={{ color: info.color }}>
                {f.stem}{f.branch}
              </div>
              <div className="text-[9px] text-arcana-muted mt-0.5">
                {f.startAge > 0 ? `${f.startAge}~${f.endAge}세` : `~${f.endAge}세`}
              </div>
              <div className="text-[8px] mt-0.5" style={{ color: info.color }}>
                {info.hanja}
              </div>
              {isCurrent && (
                <div className="text-[8px] text-arcana-gold font-bold mt-0.5">현재</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 올해 세운 */}
      <div className="mt-3 px-3 py-2 bg-arcana-purple/10 rounded-lg border border-arcana-purple/20">
        <span className="text-arcana-purple text-xs font-serif font-bold">올해 세운: </span>
        <span className="text-arcana-text text-xs font-serif">
          {yearlyFortune.description}
        </span>
        <span className="ml-1 text-xs" style={{ color: OHAENG[yearlyFortune.element].color }}>
          ({OHAENG[yearlyFortune.element].hanja})
        </span>
      </div>
    </div>
  );
}
