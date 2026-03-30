import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { GrokProvider } from "@/services/core/grok-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic } from "@/types/session";
import { SelectedCard } from "@/types/card";
import { buildUserInfoPrompt } from "@/services/core/prompt-builder";

const tarotService = new TarotService();
const grokProvider = new GrokProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, topic, characterId, userInfo, cards } = body as {
      sessionId?: string | null; topic: Topic; characterId?: string;
      userInfo?: { name: string; birthDate: string; gender: string; birthHour: string };
      cards: { cardId: string; position: number; isReversed: boolean }[];
    };

    // 입력 검증 — sessionId는 선택 (Supabase 연결 실패 시에도 리딩 가능)
    if (!topic || !Array.isArray(cards) || cards.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const validTopics = ["love", "love-single", "love-couple", "finance", "career", "health", "general"];
    if (!validTopics.includes(topic)) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const selectedCards: SelectedCard[] = cards.map((c) => {
      const card = deckManager.getCardById(c.cardId);
      if (!card) throw new Error(`Card not found: ${c.cardId}`);
      if (typeof c.position !== "number" || c.position < 0) throw new Error(`Invalid position: ${c.position}`);
      return { card, position: c.position, isReversed: c.isReversed, selectedAt: new Date() };
    });
    const systemPrompt = tarotService.getSystemPrompt(characterId);
    const userInfoPrompt = buildUserInfoPrompt(userInfo);
    const readingPrompt = tarotService.getReadingPrompt({
      session: { id: sessionId || "anonymous", userId: null, serviceType: "tarot", topic, status: "in_progress",
        spreadType: spreadResolver.resolveForTopic(topic).type, selectedCards, createdAt: new Date(), completedAt: null },
      selectedCards, chatHistory: [], topic,
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt + userInfoPrompt)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = tarotService.parseResult(fullResponse);

          // DB 저장 — sessionId가 있을 때만 (Supabase 실패해도 리딩 결과는 전달)
          let shareToken: string | null = null;
          if (sessionId) {
            try {
              const supabase = await createClient();
              const [, readingResult] = await Promise.all([
                supabase.from("session_cards").insert(
                  cards.map((c) => ({ session_id: sessionId, card_id: c.cardId, position: c.position, is_reversed: c.isReversed }))
                ),
                supabase.from("readings").insert({
                  session_id: sessionId, card_interpretation: result.cardInterpretations,
                  overall_reading: result.overallReading, advice: result.advice,
                }).select("share_token").single(),
                supabase.from("sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId),
              ]);
              shareToken = readingResult.data?.share_token ?? null;
            } catch (dbError) {
              console.error("DB 저장 실패 (리딩 결과는 정상 전달):", dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: { ...result, shareToken } })}\n\n`));
        } catch (e) {
          console.error("리딩 생성 실패:", e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Reading generation failed" })}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    console.error("리딩 API 오류:", e);
    return new Response(JSON.stringify({ error: "Failed to generate reading" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
