"use client";

import { OHAENG } from "@/data/saju/constants";
import type { OhaengType } from "@/data/saju/constants";

interface OhaengGraphProps {
  elements: Record<OhaengType, number>;
  yongsinElement: OhaengType;
}

export function OhaengGraph({ elements, yongsinElement }: OhaengGraphProps) {
  const maxCount = Math.max(...Object.values(elements), 1);
  const ohaengOrder: OhaengType[] = ["wood", "fire", "earth", "metal", "water"];

  return (
    <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔥</span>
        <h3 className="font-serif font-bold text-arcana-purple">오행 분포</h3>
      </div>

      <div className="space-y-2">
        {ohaengOrder.map((el) => {
          const info = OHAENG[el];
          const count = elements[el];
          const pct = (count / maxCount) * 100;
          const isYongsin = el === yongsinElement;

          return (
            <div key={el} className="flex items-center gap-2">
              <span className="w-8 text-right font-serif font-bold text-sm" style={{ color: info.color }}>
                {info.hanja}
              </span>
              <div className="flex-1 h-5 bg-arcana-surface/50 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: info.color, opacity: 0.8 }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
                  {count}
                </span>
              </div>
              <span className="w-6 text-xs text-arcana-muted">{info.ko}</span>
              {isYongsin && (
                <span className="text-[9px] text-arcana-gold bg-arcana-gold/10 px-1.5 py-0.5 rounded-full font-bold">용신</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
