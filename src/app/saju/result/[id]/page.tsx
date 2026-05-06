import { notFound } from "next/navigation";
import Image from "next/image";
import { getAdminDb } from "@/lib/db";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { getRequestLocale } from "@/i18n/server-locale";
import { t } from "@/i18n/translations";
import { SajuResultClient } from "./SajuResultClient";
import { ReadingText } from "@/components/common/ReadingText";
import { SajuResultShareButton } from "./SajuResultShareButton";
import type { SajuResult } from "@/services/saju/saju-types";
import { MysticBackground } from "@/components/effects/MysticBackground";

export default async function SajuResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  interface SajuReadingRow {
    id: string;
    session_id: string;
    share_token: string | null;
    birth_date: string;
    birth_hour: string;
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
    advice: string;
    created_at: string;
  }

  const locale = await getRequestLocale();
  const db = getAdminDb();
  const reading = await db.findOne<SajuReadingRow>("saju_readings", { share_token: id });

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const advice = cleanReadingText(reading.advice || "");
  const birthYear = new Date(reading.birth_date).getFullYear();

  const sajuData: SajuResult = {
    pillars: reading.pillars as SajuResult["pillars"],
    dayMaster: reading.day_master,
    dayMasterElement: reading.day_master_element as unknown as SajuResult["dayMasterElement"],
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
    <div className="relative min-h-screen overflow-hidden">
      <MysticBackground service="saju" />
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">{t("saju.result.title", locale)}</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          <SajuResultClient sajuData={sajuData} birthYear={birthYear} />

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
          <SajuResultShareButton shareToken={id} />
        </div>
      </div>
    </div>
  );
}
