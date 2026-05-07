"use client";

import { useState, useEffect } from "react";
import { OHAENG, getStemReadingFromKo, getBranchReadingFromKo, getStemHanjaFromKo, getBranchHanjaFromKo } from "@/data/saju/constants";
import type { SajuResult } from "@/services/saju/saju-types";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { t as translate } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";

interface DaeunTimelineProps {
  readonly majorFortunes: SajuResult["majorFortunes"];
  readonly yearlyFortune: SajuResult["yearlyFortune"];
  readonly birthYear: number;
}

function formatAgeRange(startAge: number, endAge: number, locale: Locale): string {
  if (startAge > 0) {
    return translate("saju.chart.age-range", locale)
      .replace("{from}", String(startAge))
      .replace("{to}", String(endAge));
  }
  return translate("saju.chart.age-until", locale).replace("{to}", String(endAge));
}

export function DaeunTimeline({ majorFortunes, yearlyFortune, birthYear }: DaeunTimelineProps) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [currentAge, setCurrentAge] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentAge(new Date().getFullYear() - birthYear);
  }, [birthYear]);

  return (
    <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🌊</span>
        <h3 className="font-serif font-bold text-arcana-purple">{t("saju.chart.daeun-title")}</h3>
      </div>

      {/* 대운 타임라인 */}
      <div className="flex overflow-x-auto gap-2 md:gap-3 pb-2">
        {majorFortunes.map((f, i) => {
          const isCurrent = currentAge >= f.startAge && currentAge <= f.endAge;
          const info = OHAENG[f.element];
          const stemHanja = getStemHanjaFromKo(f.stem);
          const branchHanja = getBranchHanjaFromKo(f.branch);
          const stemReading = getStemReadingFromKo(f.stem, locale);
          const branchReading = getBranchReadingFromKo(f.branch, locale);

          return (
            <div
              key={i}
              className={`flex-shrink-0 w-[4.5rem] md:w-20 rounded-lg p-2 md:p-2.5 text-center border transition-all ${
                isCurrent
                  ? "border-arcana-gold bg-arcana-gold/15 shadow-lg shadow-arcana-gold/20"
                  : "border-arcana-border bg-arcana-surface/30"
              }`}
            >
              <div className="font-serif font-bold text-sm md:text-base" style={{ color: info.color }}>
                {stemHanja}{branchHanja}
              </div>
              <div className="text-[10px] md:text-xs text-arcana-muted mt-0.5">
                {formatAgeRange(f.startAge, f.endAge, locale)}
              </div>
              <div className="text-[9px] md:text-[11px] mt-0.5" style={{ color: info.color }}>
                {stemReading}{branchReading}
              </div>
              {isCurrent && (
                <div className="text-[9px] md:text-xs text-arcana-gold font-bold mt-0.5">{t("saju.chart.current")}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 올해 세운 */}
      <div className="mt-4 px-3 py-2.5 bg-arcana-purple/10 rounded-lg border border-arcana-purple/20">
        <span className="text-arcana-purple text-xs md:text-sm font-serif font-bold">{t("saju.chart.yearly")}: </span>
        <span className="text-arcana-text text-xs md:text-sm font-serif">
          {yearlyFortune.description}
        </span>
        <span className="ml-1 text-xs md:text-sm" style={{ color: OHAENG[yearlyFortune.element].color }}>
          ({OHAENG[yearlyFortune.element].hanja})
        </span>
      </div>
    </div>
  );
}
