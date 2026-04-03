import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { SajuResultClient } from "./SajuResultClient";
import { SajuResultShareButton } from "./SajuResultShareButton";
import type { SajuResult } from "@/services/saju/saju-types";

export default async function SajuResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reading } = await supabase
    .from("saju_readings")
    .select("*")
    .eq("share_token", id)
    .single();

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const advice = cleanReadingText(reading.advice || "");
  const birthYear = new Date(reading.birth_date).getFullYear();

  const sajuData: SajuResult = {
    pillars: reading.pillars,
    dayMaster: reading.day_master,
    dayMasterElement: reading.day_master_element,
    isStrong: reading.is_strong,
    elements: reading.elements,
    tenStars: reading.ten_stars,
    twelveStages: reading.twelve_stages,
    interactions: reading.interactions,
    yongsin: reading.yongsin,
    majorFortunes: reading.major_fortunes,
    yearlyFortune: reading.yearly_fortune,
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">사주 분석 결과</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          <SajuResultClient sajuData={sajuData} birthYear={birthYear} />

          {overallReading && (
            <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">☯</span>
                <h2 className="text-arcana-purple font-serif font-bold text-base md:text-lg">종합 해석</h2>
              </div>
              <p className="text-arcana-text reading-text">{overallReading}</p>
            </div>
          )}

          {topicReading && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔍</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">주제별 해석</h2>
              </div>
              <p className="text-arcana-text reading-text">{topicReading}</p>
            </div>
          )}

          {advice && (
            <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">조언</h2>
              </div>
              <p className="text-arcana-text reading-text">{advice}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <a
            href="/saju"
            className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
          >
            나도 사주 분석 받기
          </a>
          <SajuResultShareButton shareToken={id} />
        </div>
      </div>
    </div>
  );
}
