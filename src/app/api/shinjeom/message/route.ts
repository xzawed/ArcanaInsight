import { NextRequest } from "next/server";
import { ShinjeomService, MAX_TURNS } from "@/services/shinjeom/shinjeom-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { Topic, ChatMessage } from "@/types/session";


const shinjeomService = new ShinjeomService();
const aiProvider = new FallbackProvider();

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

    let supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>> | null = null;
    if (sessionId) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        supabase = await createClient();
      } catch { /* 계속 진행 */ }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of aiProvider.streamReading(systemPrompt, userPrompt)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          if (isFinalTurn) {
            // 최종 결과 — JSON 파싱 시도
            const result = shinjeomService.parseResult(fullResponse);

            // DB 저장
            if (supabase && sessionId) {
              try {
                await supabase.from("shinjeom_readings").insert({
                  session_id: sessionId,
                  overall_reading: result.overallReading,
                  topic_reading: result.topicReading || "",
                  advice: result.advice,
                });
                await supabase.from("sessions").update({
                  status: "completed", completed_at: new Date().toISOString(),
                }).eq("id", sessionId);
              } catch (e) { console.error("신점 결과 저장 실패:", e); }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: true, result })}\n\n`));
          } else {
            // 중간 대화 — 텍스트 그대로
            // DB에 메시지 저장
            if (supabase && sessionId) {
              try {
                await supabase.from("shinjeom_messages").insert([
                  { session_id: sessionId, role: "user", content: currentMessage, message_index: (turnNumber - 1) * 2 },
                  { session_id: sessionId, role: "character", content: fullResponse, message_index: (turnNumber - 1) * 2 + 1 },
                ]);
              } catch (e) { console.error("신점 메시지 저장 실패:", e); }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: false, message: fullResponse })}\n\n`));
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
