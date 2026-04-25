import { NextRequest } from "next/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic } from "@/types/session";
import { SelectedCard } from "@/types/card";
import { buildUserInfoPrompt } from "@/services/core/prompt-builder";
import { getDb } from "@/lib/db";
import { assertSessionOwnership } from "@/lib/auth";
import { TAROT_TOPICS } from "@/data/topics";
import { TarotReadingSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils";
import { saveTarotReading } from "@/lib/db/reading-saver";

const tarotService = new TarotService();
const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

// 카드 수에 따른 max_tokens 상수
const TOKENS_SINGLE_CARD = 2000;
const TOKENS_FEW_CARDS = 3000;
const TOKENS_MEDIUM_CARDS = 4000;
const TOKENS_MANY_CARDS = 6000;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`tarot:${ip}`, 10, 60_000))) return rateLimitResponse();

    const rawBody = await request.json();

    // Zod 입력 검증
    const parsed = TarotReadingSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError("Invalid request");
    const { sessionId, topic, spreadType, characterId, userInfo, cards } = parsed.data as {
      sessionId?: string | null; topic: Topic; spreadType?: string; characterId?: string;
      userInfo?: { name: string; birthDate: string; gender: string; birthHour: string };
      cards: { cardId: string; position: number; isReversed: boolean }[];
    };

    // 입력 검증
    if (!TAROT_TOPICS.includes(topic)) return jsonError("Invalid topic");

    // 세션 소유권 검증 (sessionId 있을 때만 — 익명 리딩은 허용)
    if (sessionId) {
      const ownerErr = await assertSessionOwnership(sessionId);
      if (ownerErr) return ownerErr;
    }

    const selectedCards: SelectedCard[] = cards.map((c) => {
      const card = deckManager.getCardById(c.cardId);
      if (!card) throw new Error(`Card not found: ${c.cardId}`);
      if (typeof c.position !== "number" || c.position < 0) throw new Error(`Invalid position: ${c.position}`);
      return { card, position: c.position, isReversed: c.isReversed, selectedAt: new Date() };
    });

    const rawSystemPrompt = tarotService.getSystemPrompt(characterId);
    const systemPrompt = rawSystemPrompt;
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
          let maxTokens: number;
          if (cardCount <= 1) maxTokens = TOKENS_SINGLE_CARD;
          else if (cardCount <= 3) maxTokens = TOKENS_FEW_CARDS;
          else if (cardCount <= 7) maxTokens = TOKENS_MEDIUM_CARDS;
          else maxTokens = TOKENS_MANY_CARDS;
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt + userInfoPrompt, maxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = tarotService.parseResult(fullResponse);

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 병렬)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));

          // DB 저장 — fire-and-forget (스트림 블로킹 없음, 3회 retry)
          if (db && sessionId) {
            void saveTarotReading(db, sessionId, result, cards).catch(
              (e) => console.error("타로 DB 저장 최종 실패:", e)
            )
          }
        } catch (e) {
          console.error("리딩 생성 실패:", e instanceof Error ? e.message : String(e));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "리딩 생성 중 오류가 발생했습니다." })}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (e) {
    console.error("리딩 API 오류:", e instanceof Error ? e.message : String(e));
    return jsonError("Internal server error", 500);
  }
}
