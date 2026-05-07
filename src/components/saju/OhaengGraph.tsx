"use client";

import { OHAENG, getOhaengLabel } from "@/data/saju/constants";
import type { OhaengType } from "@/data/saju/constants";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";

interface OhaengGraphProps {
  readonly elements: Record<OhaengType, number>;
  readonly yongsinElement: OhaengType;
}

export function OhaengGraph({ elements, yongsinElement }: OhaengGraphProps) {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const maxCount = Math.max(...Object.values(elements), 1);
  const ohaengOrder: OhaengType[] = ["wood", "fire", "earth", "metal", "water"];

  return (
    <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔥</span>
        <h3 className="font-serif font-bold text-arcana-purple">{t("saju.chart.ohaeng-title")}</h3>
      </div>

      <div className="space-y-3">
        {ohaengOrder.map((el) => {
          const info = OHAENG[el];
          const count = elements[el];
          const pct = (count / maxCount) * 100;
          const isYongsin = el === yongsinElement;

          return (
            <div key={el} className="flex items-center gap-2">
              <span className="w-8 text-right font-serif font-bold text-sm md:text-base" style={{ color: info.color }}>
                {info.hanja}
              </span>
              <div className="flex-1 h-6 md:h-7 bg-arcana-surface/50 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: info.color, opacity: 0.8 }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-white/90">
                  {count}
                </span>
              </div>
              <span className="w-12 text-xs md:text-sm text-arcana-muted">{getOhaengLabel(el, locale)}</span>
              {isYongsin && (
                <span className="text-[10px] md:text-xs text-arcana-gold bg-arcana-gold/10 px-1.5 py-0.5 rounded-full font-bold">{t("saju.chart.yongsin")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
