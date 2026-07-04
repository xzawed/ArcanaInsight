"use client";

import { SajuChart } from "@/components/saju/SajuChart";
import { OhaengGraph } from "@/components/saju/OhaengGraph";
import { DaeunTimeline } from "@/components/saju/DaeunTimeline";
import type { SajuResult } from "@/services/saju/saju-types";
import type { OhaengType } from "@/data/saju/constants";

interface SajuResultClientProps {
  sajuData: SajuResult;
  birthYear: number;
}

export function SajuResultClient({ sajuData, birthYear }: Readonly<SajuResultClientProps>) {
  return (
    <>
      <SajuChart
        pillars={sajuData.pillars}
        dayMaster={sajuData.dayMaster}
        dayMasterElement={sajuData.dayMasterElement as OhaengType}
        isStrong={sajuData.isStrong}
        yongsin={sajuData.yongsin}
      />
      <OhaengGraph elements={sajuData.elements} yongsinElement={sajuData.yongsin.element as OhaengType} />
      <DaeunTimeline majorFortunes={sajuData.majorFortunes} yearlyFortune={sajuData.yearlyFortune} birthYear={birthYear} />
    </>
  );
}
