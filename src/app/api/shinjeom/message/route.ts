import { NextRequest } from "next/server";
import { ShinjeomService } from "@/services/shinjeom/shinjeom-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { Topic, ChatMessage } from "@/types/session";
import { getDb } from "@/lib/db";
import { assertSessionOwnership } from "@/lib/auth";

import { ShinjeomMessageSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { saveShinjeomFinalReading, saveShinjeomMessages } from "@/lib/db/reading-saver";


const shinjeomService = new ShinjeomService();
const aiProvider = new FallbackProvider();

// 최종 턴(결과 요청) vs 일반 대화 max_tokens 상수
const SHINJEOM_TOKENS_FINAL = 4000;
const SHINJEOM_TOKENS_CHAT = 1000;


export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anon";
    if (!(await checkRateLimit(`shinjeom:${ip}`, 20, 60_000))) return rateLimitResponse();

    const rawBody = await request.json();

    // Zod 입력 검증 (chatHistory 100개 상한으로 토큰 과소비 방어)
    const parsed = ShinjeomMessageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const { sessionId, characterId, currentMessage, isFinalTurn, messageIndex } = parsed.data;
    const topic = parsed.data.topic as Topic;
    // timestamp는 네트워크 전송 시 문자열/숫자로 직렬화되므로 Date로 복원
    const chatHistory: ChatMessage[] = parsed.data.chatHistory.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    if (!isFinalTurn && !currentMessage) {
      return new Response(JSON.stringify({ error: "Message required for non-final turns" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 세션 소유권 검증 (sessionId 있을 때만)
    if (sessionId) {
      const ownerErr = await assertSessionOwnership(sessionId);
      if (ownerErr) return ownerErr;
    }

    const systemPrompt = shinjeomService.getSystemPrompt(characterId ?? undefined);
    const userPrompt = shinjeomService.buildConversationPrompt(topic, currentMessage, chatHistory, isFinalTurn);

    const db = sessionId ? getDb() : null;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          const shinjeomMaxTokens = isFinalTurn ? SHINJEOM_TOKENS_FINAL : SHINJEOM_TOKENS_CHAT;
          for await (const chunk of aiProvider.streamReading(systemPrompt, userPrompt, shinjeomMaxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          if (isFinalTurn) {
            const result = shinjeomService.parseResult(fullResponse);

            // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 fire-and-forget, 3회 retry)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: true, result })}\n\n`));
            if (db && sessionId) {
              saveShinjeomFinalReading(db, sessionId, result).catch(
                (e) => console.error("신점 최종 DB 저장 최종 실패:", e)
              );
            }
          } else {
            // 중간 대화 — 응답 먼저 전송, DB 저장은 비동기 (3회 retry)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: false, message: fullResponse })}\n\n`));
            if (db && sessionId && currentMessage && messageIndex !== undefined) {
              saveShinjeomMessages(db, sessionId, currentMessage, fullResponse, messageIndex).catch(
                (e) => console.error("신점 메시지 DB 저장 최종 실패:", e)
              );
            }
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
