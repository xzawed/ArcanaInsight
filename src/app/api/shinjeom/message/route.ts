import { NextRequest } from "next/server";
import { ShinjeomService } from "@/services/shinjeom/shinjeom-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { Topic, ChatMessage } from "@/types/session";
import { getDb } from "@/lib/db";
import { getCurrentUser, assertSessionOwnership } from "@/lib/auth";
import { getRecentCharacterMemory } from "@/lib/db/character-context";
import { buildCharacterMemoryPrompt } from "@/services/core/prompt-builder";
import { ShinjeomMessageSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils"
import { saveShinjeomFinalReading, saveShinjeomMessages } from "@/lib/db/reading-saver";
import { getRequestLocale } from "@/i18n/server-locale";

const shinjeomService = new ShinjeomService();
const aiProvider = new FallbackProvider();

// 최종 턴(결과 요청) vs 일반 대화 max_tokens 상수
const SHINJEOM_TOKENS_FINAL = 4000;
const SHINJEOM_TOKENS_CHAT = 1000;

/** 캐릭터 메모리 조회 — 실패해도 빈 문자열 반환 (리딩 계속) */
async function fetchMemoryPrompt(characterId: string): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return "";
    const memories = await getRecentCharacterMemory(getDb(), currentUser.id, characterId);
    return buildCharacterMemoryPrompt(memories);
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`shinjeom:${ip}`, 20, 60_000))) return rateLimitResponse();

    const locale = await getRequestLocale();
    const rawBody = await request.json();

    // Zod 입력 검증 (chatHistory 100개 상한으로 토큰 과소비 방어)
    const parsed = ShinjeomMessageSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError("Invalid request");
    const { sessionId, characterId, currentMessage, isFinalTurn, messageIndex } = parsed.data;
    const topic = parsed.data.topic as Topic;
    // timestamp는 네트워크 전송 시 문자열/숫자로 직렬화되므로 Date로 복원
    const chatHistory: ChatMessage[] = parsed.data.chatHistory.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    if (!isFinalTurn && !currentMessage) return jsonError("Message required for non-final turns");

    // 세션 소유권 검증 (sessionId 있을 때만)
    if (sessionId) {
      const ownerErr = await assertSessionOwnership(sessionId);
      if (ownerErr) return ownerErr;
    }

    const systemPrompt = shinjeomService.getSystemPrompt(characterId ?? undefined, locale);
    const userPrompt = shinjeomService.buildConversationPrompt(topic, currentMessage, chatHistory, isFinalTurn);

    const db = sessionId ? getDb() : null;

    // 최종 턴에만 캐릭터 메모리 주입 (중간 대화는 토큰 절약)
    const memoryPrompt = (sessionId && characterId && isFinalTurn)
      ? await fetchMemoryPrompt(characterId)
      : "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          const shinjeomMaxTokens = isFinalTurn ? SHINJEOM_TOKENS_FINAL : SHINJEOM_TOKENS_CHAT;
          for await (const chunk of aiProvider.streamReading(systemPrompt + memoryPrompt, userPrompt, shinjeomMaxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          if (isFinalTurn) {
            const result = shinjeomService.parseResult(fullResponse);

            // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 fire-and-forget, 3회 retry)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: true, result })}\n\n`));
            if (db && sessionId) {
              void saveShinjeomFinalReading(db, sessionId, result, locale).catch(
                (e) => console.error("신점 최종 DB 저장 최종 실패:", e)
              );
            }
          } else {
            // 중간 대화 — 응답 먼저 전송, DB 저장은 비동기 (3회 retry)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: false, message: fullResponse })}\n\n`));
            if (db && sessionId && currentMessage && messageIndex !== undefined) {
              void saveShinjeomMessages(db, sessionId, currentMessage, fullResponse, messageIndex).catch(
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

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error("[shinjeom-message] internal error:", err instanceof Error ? err.message : String(err));
    return jsonError("Internal server error", 500);
  }
}
