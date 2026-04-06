import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { ReadingText } from "@/components/common/ReadingText";
import { ShinjeomResultShareButton } from "./ShinjeomResultShareButton";

export default async function ShinjeomResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reading } = await supabase
    .from("shinjeom_readings")
    .select("*")
    .eq("share_token", id)
    .single();

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const advice = cleanReadingText(reading.advice || "");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-400 mb-2 drop-shadow-md">신점 상담 결과</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          {overallReading && (
            <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="text-amber-400 font-serif font-bold text-base md:text-lg">종합 해석</h2>
              </div>
              <ReadingText text={overallReading} />
            </div>
          )}

          {topicReading && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔍</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">주제별 해석</h2>
              </div>
              <ReadingText text={topicReading} />
            </div>
          )}

          {advice && (
            <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">조언</h2>
              </div>
              <ReadingText text={advice} />
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <a
            href="/shinjeom"
            className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20"
          >
            나도 신점 상담 받기
          </a>
          <ShinjeomResultShareButton shareToken={id} />
        </div>
      </div>
    </div>
  );
}
