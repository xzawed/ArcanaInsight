import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeckManager } from "@/services/tarot/deck-manager";
import { spreads } from "@/data/spreads";
import { SpreadType } from "@/types/session";

const deckManager = new DeckManager();

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reading } = await supabase.from("readings").select("*, sessions(*)").eq("share_token", id).single();
  if (!reading) notFound();
  const session = reading.sessions;
  const spread = spreads[session.spread_type as SpreadType];
  const interpretations = reading.card_interpretation as { cardId: string; position: number; interpretation: string }[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-bold text-arcana-purple mb-2">타로 리딩 결과</h1>
        <p className="text-arcana-muted text-sm">{spread?.nameKo} 스프레드 ・ {new Date(reading.created_at).toLocaleDateString("ko-KR")}</p>
      </div>
      <div className="space-y-4 mb-8">
        {interpretations.map((interp) => {
          const card = deckManager.getCardById(interp.cardId);
          const pos = spread?.positions[interp.position];
          return (
            <div key={interp.cardId} className="bg-arcana-card border border-arcana-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-arcana-gold text-sm font-display font-bold">{pos?.labelKo}</span>
                <span className="text-arcana-text font-bold">{card?.nameKo}</span>
                <span className="text-arcana-muted text-xs">{card?.name}</span>
              </div>
              <p className="text-arcana-text text-sm leading-relaxed">{interp.interpretation}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-arcana-surface border border-arcana-purple/30 rounded-2xl p-6 mb-4">
        <h2 className="font-display font-bold text-arcana-purple mb-3">종합 해석</h2>
        <p className="text-arcana-text leading-relaxed">{reading.overall_reading}</p>
      </div>
      <div className="bg-arcana-surface border border-arcana-gold/30 rounded-2xl p-6 mb-8">
        <h2 className="font-display font-bold text-arcana-gold mb-3">조언</h2>
        <p className="text-arcana-text leading-relaxed">{reading.advice}</p>
      </div>
      <div className="text-center">
        <a href="/tarot" className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-display font-bold hover:opacity-90 transition-opacity">나도 타로 상담 받기</a>
      </div>
    </div>
  );
}
