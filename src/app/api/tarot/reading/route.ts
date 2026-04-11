import { NextRequest } from "next/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic } from "@/types/session";
import { SelectedCard } from "@/types/card";
import { buildUserInfoPrompt } from "@/services/core/prompt-builder";
import { getDb } from "@/lib/db";

const tarotService = new TarotService();
const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, topic, spreadType, characterId, userInfo, cards } = body as {
      sessionId?: string | null; topic: Topic; spreadType?: string; characterId?: string;
      userInfo?: { name: string; birthDate: string; gender: string; birthHour: string };
      cards: { cardId: string; position: number; isReversed: boolean }[];
    };

    // 입력 검증
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
    const resolvedSpreadType = (spreadType === "one-card" || spreadType === "three-card" || spreadType === "five-card")
      ? spreadType
      : spreadResolver.resolveForTopic(topic).type;
    const readingPrompt = tarotService.getReadingPrompt({
      session: { id: sessionId || "anonymous", userId: null, serviceType: "tarot", topic, status: "in_progress",
        spreadType: resolvedSpreadType, selectedCards, createdAt: new Date(), completedAt: null },
      selectedCards, chatHistory: [], topic,
    });

    const db = sessionId ? getDb() : null

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          // 카드 수에 따라 max_tokens 조정 (JSON 구조 오버헤드 감안)
          const cardCount = cards.length;
          const maxTokens = cardCount <= 1 ? 2000 : cardCount <= 3 ? 3000 : cardCount <= 7 ? 4000 : 6000;
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt + userInfoPrompt, maxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = tarotService.parseResult(fullResponse);

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 병렬)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));

          // DB 저장 — fire-and-forget (스트림 블로킹 없음)
          if (db && sessionId) {
            Promise.all([
              db.insert("readings", {
                session_id: sessionId,
                card_interpretation: result.cardInterpretations,
                overall_reading: result.overallReading,
                advice: result.advice,
              }),
              db.update("sessions", { id: sessionId }, {
                status: "completed",
                completed_at: new Date().toISOString(),
              }),
              db.insertMany("session_cards",
                cards.map((c: { cardId: string; position: number; isReversed: boolean }) => ({
                  session_id: sessionId,
                  card_id: c.cardId,
                  position: c.position,
                  is_reversed: c.isReversed,
                }))
              ),
            ]).catch((e) => console.error("타로 DB 저장 실패:", e))
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error("리딩 생성 실패:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("리딩 API 오류:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
