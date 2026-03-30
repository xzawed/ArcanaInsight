import { NextRequest } from "next/server";
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

    // Supabase 클라이언트를 스트림 시작 전에 미리 생성 (cookies()는 스트림 밖에서 호출해야 함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;
    if (sessionId) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        supabase = await createClient();
      } catch (e) {
        console.warn("Supabase 클라이언트 생성 실패 (리딩은 계속 진행):", e);
      }
    }

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

          // DB 저장 — Supabase 클라이언트가 있을 때만
          let shareToken: string | null = null;
          let dbSaved = false;
          if (supabase && sessionId) {
            try {
              // readings를 먼저 저장 (핵심 데이터)
              const readingRes = await supabase.from("readings").insert({
                session_id: sessionId, card_interpretation: result.cardInterpretations,
                overall_reading: result.overallReading, advice: result.advice,
              }).select("share_token").single();

              if (readingRes.error) {
                console.error("readings 저장 실패:", readingRes.error.message);
              } else {
                shareToken = readingRes.data?.share_token ?? null;
                dbSaved = true;

                // 부수 데이터 저장 (실패해도 핵심 결과에 영향 없음)
                const [cardsRes, sessionRes] = await Promise.all([
                  supabase.from("session_cards").insert(
                    cards.map((c: { cardId: string; position: number; isReversed: boolean }) => ({
                      session_id: sessionId, card_id: c.cardId, position: c.position, is_reversed: c.isReversed,
                    }))
                  ),
                  supabase.from("sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId),
                ]);
                if (cardsRes.error) console.error("session_cards 저장 실패:", cardsRes.error.message);
                if (sessionRes.error) console.error("sessions 업데이트 실패:", sessionRes.error.message);
              }
            } catch (dbError) {
              console.error("DB 저장 실패:", dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: { ...result, shareToken }, dbSaved })}\n\n`));
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
