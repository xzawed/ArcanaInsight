import { NextRequest } from "next/server";
import { ShinjeomService, MAX_TURNS } from "@/services/shinjeom/shinjeom-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { Topic, ChatMessage } from "@/types/session";


const shinjeomService = new ShinjeomService();
const aiProvider = new FallbackProvider();

/** DB 저장 — 최종 턴에서 share_token 반환 */
async function saveToDb(sessionId: string | null | undefined, params: {
  isFinalTurn: boolean;
  result?: { overallReading: string; topicReading?: string; advice: string; shareToken?: string | null };
  currentMessage?: string;
  fullResponse?: string;
  turnNumber?: number;
}): Promise<string | null> {
  if (!sessionId) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    if (params.isFinalTurn && params.result) {
      const [readingRes] = await Promise.all([
        supabase.from("shinjeom_readings").insert({
          session_id: sessionId,
          overall_reading: params.result.overallReading,
          topic_reading: params.result.topicReading || "",
          advice: params.result.advice,
        }).select("share_token").single(),
        supabase.from("sessions").update({
          status: "completed", completed_at: new Date().toISOString(),
        }).eq("id", sessionId),
      ]);
      return readingRes.data?.share_token ?? null;
    } else if (params.currentMessage && params.fullResponse && params.turnNumber) {
      await supabase.from("shinjeom_messages").insert([
        { session_id: sessionId, role: "user", content: params.currentMessage, message_index: (params.turnNumber - 1) * 2 },
        { session_id: sessionId, role: "character", content: params.fullResponse, message_index: (params.turnNumber - 1) * 2 + 1 },
      ]);
    }
  } catch (e) { console.error("신점 DB 저장 실패:", e); }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, topic, characterId, currentMessage, chatHistory, turnNumber } = body as {
      sessionId?: string | null;
      topic: Topic;
      characterId?: string;
      currentMessage: string;
      chatHistory: ChatMessage[];
      turnNumber: number;
    };

    if (!topic || !currentMessage) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const systemPrompt = shinjeomService.getSystemPrompt(characterId);
    const userPrompt = shinjeomService.buildConversationPrompt(topic, currentMessage, chatHistory, turnNumber);
    const isFinalTurn = turnNumber >= MAX_TURNS;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          const shinjeomMaxTokens = isFinalTurn ? 4000 : 1000;
          for await (const chunk of aiProvider.streamReading(systemPrompt, userPrompt, shinjeomMaxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          if (isFinalTurn) {
            const result = shinjeomService.parseResult(fullResponse);

            // DB 저장 후 share_token 포함하여 done 이벤트 전송
            const shareToken = await saveToDb(sessionId, { isFinalTurn: true, result });
            result.shareToken = shareToken;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: true, result })}\n\n`));
          } else {
            // 중간 대화 — 응답 전송 후 DB 저장
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: false, message: fullResponse })}\n\n`));
            await saveToDb(sessionId, { isFinalTurn: false, currentMessage, fullResponse, turnNumber });
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
