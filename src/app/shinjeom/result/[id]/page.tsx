import { notFound } from "next/navigation";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { ReadingText } from "@/components/common/ReadingText";
import { ShinjeomResultShareButton } from "./ShinjeomResultShareButton";
import { MysticBackground } from "@/components/effects/MysticBackground";

interface ShinjeomReadingRow {
  id: string;
  session_id: string;
  share_token: string | null;
  overall_reading: string;
  topic_reading: string;
  advice: string;
  created_at: string;
}

export default async function ShinjeomResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const reading = await db.findOne<ShinjeomReadingRow>("shinjeom_readings", { share_token: id });

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const advice = cleanReadingText(reading.advice || "");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MysticBackground service="shinjeom" />
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">신점 결과</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          {overallReading && (
            <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="text-arcana-purple font-serif font-bold text-base md:text-lg">종합 해석</h2>
              </div>
              <ReadingText text={overallReading} />
            </div>
          )}

          {topicReading && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌿</span>
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
            className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
          >
            나도 신점 상담 받기
          </a>
          <ShinjeomResultShareButton shareToken={id} />
        </div>
      </div>
    </div>
  );
}
