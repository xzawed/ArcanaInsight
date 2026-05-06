import { notFound } from "next/navigation";
import Image from "next/image";
import { getAdminDb } from "@/lib/db";
import { DeckManager } from "@/services/tarot/deck-manager";
import { cleanReadingText } from "@/services/core/text-cleaner";
import { spreads } from "@/data/spreads";
import { SpreadType } from "@/types/session";
import { ResultShareButton } from "./ResultShareButton";
import { ResultCardFace } from "./ResultCardFace";
import { ReadingText } from "@/components/common/ReadingText";
import { MysticBackground } from "@/components/effects/MysticBackground";
import { getRequestLocale } from "@/i18n/server-locale";
import { t } from "@/i18n/translations";
import { getCardName } from "@/data/cards/locale-helpers";

const deckManager = new DeckManager();

interface ReadingRow {
  id: string;
  session_id: string;
  share_token: string | null;
  card_interpretation: unknown;
  overall_reading: string | null;
  advice: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  spread_type: string | null;
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const db = getAdminDb();
  const reading = await db.findOne<ReadingRow>("readings", { share_token: id });
  if (!reading) notFound();
  const session = await db.findOne<SessionRow>("sessions", { id: reading.session_id });
  const spreadType = (session?.spread_type ?? undefined) as SpreadType | undefined;
  const spread = spreadType ? spreads[spreadType] : undefined;
  const rawInterpretations = Array.isArray(reading.card_interpretation)
    ? (reading.card_interpretation as { cardId: string; position: number; interpretation: string; isReversed?: boolean }[])
    : [];
  const interpretations = rawInterpretations.map((interp) => ({
    ...interp,
    interpretation: cleanReadingText(interp.interpretation),
  }));
  const overallReading = cleanReadingText(reading.overall_reading || "");
  const advice = cleanReadingText(reading.advice || "");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MysticBackground service="tarot" />
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        {/* 장식 - 떠다니는 카드 */}
        <div className="absolute -top-4 -right-8 w-32 h-32 opacity-20 pointer-events-none">
          <Image src="/images/backgrounds/deco-floating-cards.jpg" alt="" fill className="object-contain"  sizes="100vw" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">{t("tarot.result.title", locale)}</h1>
          <p className="text-arcana-muted text-sm">{locale === "ko" ? spread?.nameKo : spread?.name} ・ {new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        {/* 데스크탑 5:5 레이아웃 / 모바일 세로 배치 */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* 왼쪽: 스프레드 요약 + 선택된 카드 시각화 */}
          <div className="w-full md:w-[50%] space-y-4">
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-6">
              <h2 className="font-serif font-bold text-lg text-arcana-gold mb-4">{locale === "ko" ? spread?.nameKo : spread?.name}</h2>
              <div className={
                interpretations.length <= 5
                  ? "flex flex-wrap justify-center gap-4"
                  : interpretations.length <= 10
                    ? "grid grid-cols-5 gap-2 justify-items-center"
                    : "grid grid-cols-6 gap-2 justify-items-center"
              }>
                {interpretations.map((interp) => {
                  const card = deckManager.getCardById(interp.cardId);
                  const pos = spread?.positions[interp.position];
                  if (!card) return null;
                  return (
                    <div key={interp.cardId} className="flex flex-col items-center gap-1">
                      <ResultCardFace card={card} isReversed={!!interp.isReversed} />
                      <span className="text-arcana-gold text-[10px] font-serif font-bold text-center leading-tight">{pos?.labelKo}</span>
                      <span className="text-arcana-text text-[10px] text-center max-w-[60px] truncate">{getCardName(card, locale)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 종합 해석 */}
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="font-serif font-bold text-xl text-arcana-purple">{t("tarot.result.overall", locale)}</h2>
              </div>
              {overallReading
                ? <ReadingText text={overallReading} />
                : <p className="text-arcana-muted text-sm">{t("tarot.result.no-reading", locale)}</p>
              }
            </div>

            {/* 조언 */}
            {advice && (
              <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <h2 className="font-serif font-bold text-xl text-arcana-gold">{t("tarot.result.advice", locale)}</h2>
                </div>
                <ReadingText text={advice} />
              </div>
            )}
          </div>

          {/* 오른쪽: 카드별 해석 */}
          <div className="w-full md:w-[50%] space-y-4">
            {interpretations.map((interp) => {
              const card = deckManager.getCardById(interp.cardId);
              const pos = spread?.positions[interp.position];
              return (
                <div key={interp.cardId} className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
                  <div className="flex items-start gap-4 mb-3">
                    {card && (
                      <div className="flex-shrink-0">
                        <ResultCardFace card={card} isReversed={!!interp.isReversed} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-arcana-gold text-sm font-serif font-bold mb-1">{pos?.labelKo}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-arcana-text font-bold">{card ? getCardName(card, locale) : undefined}</span>
                        <span className="text-arcana-muted text-xs md:text-sm">{card?.name}</span>
                        {interp.isReversed && <span className="text-red-400 text-xs bg-red-900/30 px-1.5 py-0.5 rounded">{t("tarot.result.card.reversed", locale)}</span>}
                      </div>
                    </div>
                  </div>
                  <ReadingText text={interp.interpretation} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex justify-center gap-4 mt-8">
          <a href="/tarot" className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20">
            {t("tarot.result.cta", locale)}
          </a>
          <ResultShareButton shareToken={id} spreadName={spread?.nameKo ?? "타로"} />
        </div>
      </div>
    </div>
  );
}
