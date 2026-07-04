import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/db";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { getRequestLocale } from "@/i18n/server-locale";
import { t } from "@/i18n/translations";
import { ReadingText } from "@/components/common/ReadingText";
import { ResultShareButton } from "@/components/common/ResultShareButton";
import { ResultPageShell } from "@/components/common/ResultPageShell";

interface ShinjeomReadingRow {
  id: string;
  session_id: string;
  share_token: string | null;
  overall_reading: string;
  topic_reading: string;
  direct_answer: string | null;
  advice: string;
  created_at: string;
}

export default async function ShinjeomResultPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const db = getAdminDb();
  const reading = await db.findOne<ShinjeomReadingRow>("shinjeom_readings", { share_token: id });

  if (!reading) notFound();

  const overallReading = cleanReadingText(reading.overall_reading || "");
  const topicReading = cleanReadingText(reading.topic_reading || "");
  const directAnswer = cleanReadingText(reading.direct_answer || "");
  const advice = cleanReadingText(reading.advice || "");

  let dateLocale = "en-US";
  if (locale === "ko") dateLocale = "ko-KR";
  else if (locale === "ja") dateLocale = "ja-JP";

  return (
    <ResultPageShell service="shinjeom">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">{t("shinjeom.result.title", locale)}</h1>
          <p className="text-arcana-muted text-sm">{new Date(reading.created_at).toLocaleDateString(dateLocale)}</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          {directAnswer && (
            <div className="bg-arcana-gold/10 backdrop-blur-sm border border-arcana-gold/40 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("shinjeom.result.direct-answer", locale)}</h2>
              </div>
              <ReadingText text={directAnswer} />
            </div>
          )}

          {overallReading && (
            <div className="bg-arcana-purple/10 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="text-arcana-purple font-serif font-bold text-base md:text-lg">{t("shinjeom.result.overall", locale)}</h2>
              </div>
              <ReadingText text={overallReading} />
            </div>
          )}

          {topicReading && (
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌿</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("shinjeom.result.topic", locale)}</h2>
              </div>
              <ReadingText text={topicReading} />
            </div>
          )}

          {advice && (
            <div className="bg-arcana-gold/5 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="text-arcana-gold font-serif font-bold text-base md:text-lg">{t("shinjeom.result.advice", locale)}</h2>
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
            {t("shinjeom.result.cta", locale)}
          </a>
          <ResultShareButton service="shinjeom" shareToken={id} />
        </div>
    </ResultPageShell>
  );
}
