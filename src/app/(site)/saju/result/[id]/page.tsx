import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/db";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { getRequestLocale } from "@/i18n/server-locale";
import { t } from "@/i18n/translations";
import { SajuResultClient } from "./SajuResultClient";
import { ReadingText } from "@/components/common/ReadingText";
import { ReadingSectionBlock } from "@/components/session/ReadingSectionBlock";
import { ResultShareButton } from "@/components/common/ResultShareButton";
import { ResultPageShell } from "@/components/common/ResultPageShell";
import type { SajuResult } from "@/services/saju/saju-types";
import type { OhaengType } from "@/data/saju/constants";

const OHAENG_VALUES = ["wood", "fire", "earth", "metal", "water"] as const;

function toOhaengType(v: string): OhaengType {
  if ((OHAENG_VALUES as readonly string[]).includes(v)) return v as OhaengType;
  return "wood";
}

export default async function SajuResultPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  interface SajuReadingRow {
    id: string;
    session_id: string;
    share_token: string | null;
    birth_date: string;
    birth_hour: string | null;
    gender: string;
    birth_name: string | null;
    pillars: unknown;
    day_master: string;
    day_master_element: string;
    is_strong: boolean;
    elements: unknown;
    ten_stars: unknown;
    twelve_stages: unknown;
    interactions: unknown;
    yongsin: unknown;
    major_fortunes: unknown;
    yearly_fortune: unknown;
    overall_reading: string;
    topic_reading: string;
    direct_answer: string | null;
    saju_sections: { structure?: string; elements?: string; fortune?: string; guidance?: string } | null;
    advice: string;
    created_at: string;
  }

  const locale = await getRequestLocale();
  const db = getAdminDb();
  const reading = await db.findOne<SajuReadingRow>("saju_readings", { share_token: id });

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const directAnswer = cleanReadingText(reading.direct_answer || "");
  const advice = cleanReadingText(reading.advice || "");
  const birthYear = new Date(reading.birth_date).getFullYear();
  const s = reading.saju_sections;
  const hasSajuSections = Boolean(s && (s.structure || s.elements || s.fortune || s.guidance));

  let dateLocale = "en-US";
  if (locale === "ko") dateLocale = "ko-KR";
  else if (locale === "ja") dateLocale = "ja-JP";

  const sajuData: SajuResult = {
    pillars: reading.pillars as SajuResult["pillars"],
    dayMaster: reading.day_master,
    dayMasterElement: toOhaengType(reading.day_master_element),
    isStrong: reading.is_strong,
    elements: reading.elements as SajuResult["elements"],
    tenStars: reading.ten_stars as SajuResult["tenStars"],
    twelveStages: reading.twelve_stages as SajuResult["twelveStages"],
    interactions: reading.interactions as SajuResult["interactions"],
    yongsin: reading.yongsin as SajuResult["yongsin"],
    majorFortunes: reading.major_fortunes as SajuResult["majorFortunes"],
    yearlyFortune: reading.yearly_fortune as SajuResult["yearlyFortune"],
  };

  return (
    <ResultPageShell service="saju">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">{t("saju.result.title", locale)}</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString(dateLocale)}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          <SajuResultClient sajuData={sajuData} birthYear={birthYear} />

          {directAnswer && (
            <div className="bg-arcana-gold/10 backdrop-blur-sm border border-arcana-gold/40 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("saju.result.direct-answer", locale)}</h2>
              </div>
              <ReadingText text={directAnswer} />
            </div>
          )}

          {hasSajuSections && s && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6 space-y-1">
              <ReadingSectionBlock icon="🏛" label={t("saju.section.structure", locale)} content={s.structure ?? ""} />
              <ReadingSectionBlock icon="⚡" label={t("saju.section.elements", locale)} content={s.elements ?? ""} />
              <ReadingSectionBlock icon="🌊" label={t("saju.section.fortune", locale)} content={s.fortune ?? ""} />
              <ReadingSectionBlock icon="🧭" label={t("saju.section.guidance", locale)} content={s.guidance ?? ""} />
            </div>
          )}

          {overallReading && (
            <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">☯</span>
                <h2 className="text-arcana-purple font-serif font-bold text-base md:text-lg">{t("saju.result.overall", locale)}</h2>
              </div>
              <ReadingText text={overallReading} />
            </div>
          )}

          {topicReading && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔍</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("saju.result.topic", locale)}</h2>
              </div>
              <ReadingText text={topicReading} />
            </div>
          )}

          {advice && (
            <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("saju.result.advice", locale)}</h2>
              </div>
              <ReadingText text={advice} />
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <a
            href="/saju"
            className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
          >
            {t("saju.result.cta", locale)}
          </a>
          <ResultShareButton service="saju" shareToken={id} />
        </div>
    </ResultPageShell>
  );
}
