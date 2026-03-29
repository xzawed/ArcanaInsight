import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { GrokProvider } from "@/services/core/grok-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic } from "@/types/session";
import { SelectedCard } from "@/types/card";

const tarotService = new TarotService();
const grokProvider = new GrokProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, topic, characterId, cards } = (await request.json()) as {
      sessionId: string; topic: Topic; characterId?: string;
      cards: { cardId: string; position: number; isReversed: boolean }[];
    };
    const selectedCards: SelectedCard[] = cards.map((c) => {
      const card = deckManager.getCardById(c.cardId);
      if (!card) throw new Error(`Card not found: ${c.cardId}`);
      return { card, position: c.position, isReversed: c.isReversed, selectedAt: new Date() };
    });
    const systemPrompt = tarotService.getSystemPrompt(characterId);
    const readingPrompt = tarotService.getReadingPrompt({
      session: { id: sessionId, userId: null, serviceType: "tarot", topic, status: "in_progress",
        spreadType: spreadResolver.resolveForTopic(topic).type, selectedCards, createdAt: new Date(), completedAt: null },
      selectedCards, chatHistory: [], topic,
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = tarotService.parseResult(fullResponse);
          const supabase = await createClient();
          await supabase.from("session_cards").insert(
            cards.map((c) => ({ session_id: sessionId, card_id: c.cardId, position: c.position, is_reversed: c.isReversed }))
          );
          const { data: readingData } = await supabase.from("readings").insert({
            session_id: sessionId, card_interpretation: result.cardInterpretations,
            overall_reading: result.overallReading, advice: result.advice,
          }).select("share_token").single();
          await supabase.from("sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId);
          const shareToken = readingData?.share_token ?? null;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: { ...result, shareToken } })}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Reading generation failed" })}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to generate reading" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
