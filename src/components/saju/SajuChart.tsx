"use client";

import { OHAENG, getOhaengLabel, getStemReading, getBranchReading } from "@/data/saju/constants";
import type { SajuResult } from "@/services/saju/saju-types";
import type { OhaengType } from "@/data/saju/constants";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";

interface SajuChartProps {
  readonly pillars: SajuResult["pillars"];
  readonly dayMaster: string;
  readonly dayMasterElement: OhaengType;
  readonly isStrong: boolean;
  readonly yongsin: SajuResult["yongsin"];
}

export function SajuChart({ pillars, dayMaster, dayMasterElement, isStrong, yongsin }: SajuChartProps) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const dayMasterReading = getStemReading(pillars.day.stemHanja, locale) || dayMaster;

  const pillarOrder = [
    { key: "hour",  label: t("saju.chart.pillar.hour"),  data: pillars.hour },
    { key: "day",   label: t("saju.chart.pillar.day"),   data: pillars.day },
    { key: "month", label: t("saju.chart.pillar.month"), data: pillars.month },
    { key: "year",  label: t("saju.chart.pillar.year"),  data: pillars.year },
  ];

  return (
    <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">☯</span>
        <h3 className="font-serif font-bold text-arcana-purple">{t("saju.chart.title")}</h3>
        <span className="text-arcana-muted text-xs md:text-sm ml-auto">
          {t("saju.chart.day-master")}: {dayMasterReading}({OHAENG[dayMasterElement].hanja}) · {isStrong ? t("saju.chart.strong") : t("saju.chart.weak")}
        </span>
      </div>

      {/* 4주 테이블 */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 text-center text-sm">
        {/* 헤더 */}
        {pillarOrder.map(({ key, label }) => (
          <div key={key} className="text-arcana-muted text-xs md:text-sm font-serif py-1">{label}</div>
        ))}
        {/* 천간 */}
        {pillarOrder.map(({ key, data }) => (
          <div
            key={`stem-${key}`}
            className={`py-2 rounded-t-lg border border-b-0 border-arcana-border font-serif font-bold text-lg ${key === "day" ? "bg-arcana-purple/20 border-arcana-purple/40" : "bg-arcana-surface/50"}`}
            style={{ color: OHAENG[data.element].color }}
          >
            {data.stemHanja}
            <div className="text-[10px] md:text-xs text-arcana-muted">{getStemReading(data.stemHanja, locale)}</div>
          </div>
        ))}
        {/* 지지 */}
        {pillarOrder.map(({ key, data }) => {
          const branchEl = OHAENG[data.element];
          return (
            <div
              key={`branch-${key}`}
              className={`py-2 rounded-b-lg border border-t-0 border-arcana-border font-serif font-bold text-lg ${key === "day" ? "bg-arcana-purple/10 border-arcana-purple/40" : "bg-arcana-surface/30"}`}
              style={{ color: branchEl.color }}
            >
              {data.branchHanja}
              <div className="text-[10px] md:text-xs text-arcana-muted">{getBranchReading(data.branchHanja, locale)}</div>
            </div>
          );
        })}
      </div>

      {/* 용신 */}
      <div className="mt-4 px-3 py-2.5 bg-arcana-gold/10 rounded-lg border border-arcana-gold/20">
        <span className="text-arcana-gold text-xs md:text-sm font-serif font-bold">{t("saju.chart.yongsin-label")}: </span>
        <span className="text-arcana-text text-xs md:text-sm">
          {OHAENG[yongsin.element].hanja}({getOhaengLabel(yongsin.element, locale)}) — {yongsin.reason}
        </span>
      </div>
    </div>
  );
}
