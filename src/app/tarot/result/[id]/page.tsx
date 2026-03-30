import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { DeckManager } from "@/services/tarot/deck-manager";
import { CardFace } from "@/components/card/CardFace";
import { spreads } from "@/data/spreads";
import { SpreadType } from "@/types/session";
import { ResultShareButton } from "./ResultShareButton";

const deckManager = new DeckManager();

/** DB에서 읽은 텍스트의 이스케이프 잔여물 정리 */
function cleanText(text: string): string {
  return text
    .replace(/\\n\\n/g, "\n\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reading } = await supabase.from("readings").select("*, sessions(*)").eq("share_token", id).single();
  if (!reading) notFound();
  const session = reading.sessions;
  const spread = spreads[session.spread_type as SpreadType];
  const rawInterpretations = reading.card_interpretation as { cardId: string; position: number; interpretation: string; isReversed?: boolean }[];
  const interpretations = rawInterpretations.map((interp) => ({
    ...interp,
    interpretation: cleanText(interp.interpretation),
  }));
  const overallReading = cleanText(reading.overall_reading || "");
  const advice = cleanText(reading.advice || "");

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        {/* 장식 - 떠다니는 카드 */}
        <div className="absolute -top-4 -right-8 w-32 h-32 opacity-20 pointer-events-none">
          <Image src="/images/backgrounds/deco-floating-cards.jpg" alt="" fill className="object-contain" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2 drop-shadow-md">타로 리딩 결과</h1>
          <p className="text-arcana-muted text-sm">{spread?.nameKo} 스프레드 ・ {new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
        </div>

        {/* 데스크탑 5:5 레이아웃 / 모바일 세로 배치 */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* 왼쪽: 스프레드 요약 + 선택된 카드 시각화 */}
          <div className="w-full md:w-[50%] space-y-4">
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-6">
              <h2 className="font-serif font-bold text-lg text-arcana-gold mb-4">{spread?.nameKo} 스프레드</h2>
              <div className="flex flex-wrap justify-center gap-4">
                {interpretations.map((interp) => {
                  const card = deckManager.getCardById(interp.cardId);
                  const pos = spread?.positions[interp.position];
                  if (!card) return null;
                  return (
                    <div key={interp.cardId} className="flex flex-col items-center gap-2">
                      <CardFace card={card} isReversed={!!interp.isReversed} size="sm" />
                      <span className="text-arcana-gold text-xs font-serif font-bold">{pos?.labelKo}</span>
                      <span className="text-arcana-text text-xs text-center max-w-[80px] truncate">{card.nameKo}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 종합 해석 */}
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-purple/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="font-serif font-bold text-xl text-arcana-purple">종합 해석</h2>
              </div>
              <p className="text-arcana-text leading-relaxed whitespace-pre-wrap">{overallReading}</p>
            </div>

            {/* 조언 */}
            <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-gold/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="font-serif font-bold text-xl text-arcana-gold">조언</h2>
              </div>
              <p className="text-arcana-text leading-relaxed whitespace-pre-wrap">{advice}</p>
            </div>
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
                        <CardFace card={card} isReversed={!!interp.isReversed} size="sm" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-arcana-gold text-sm font-serif font-bold mb-1">{pos?.labelKo}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-arcana-text font-bold">{card?.nameKo}</span>
                        <span className="text-arcana-muted text-xs">{card?.name}</span>
                        {interp.isReversed && <span className="text-red-400 text-xs bg-red-900/30 px-1.5 py-0.5 rounded">역방향</span>}
                      </div>
                    </div>
                  </div>
                  <p className="text-arcana-text text-sm leading-relaxed whitespace-pre-wrap">{interp.interpretation}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex justify-center gap-4 mt-8">
          <a href="/tarot" className="px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20">
            나도 타로 상담 받기
          </a>
          <ResultShareButton shareToken={id} spreadName={spread?.nameKo ?? "타로"} />
        </div>
      </div>
    </div>
  );
}
