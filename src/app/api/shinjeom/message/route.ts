import { NextRequest } from "next/server";
import { ShinjeomService } from "@/services/shinjeom/shinjeom-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { streamReadingWithParseRetry } from "@/services/core/reading-generator";
import { Topic, ChatMessage } from "@/types/session";
import type { ReadingResult } from "@/types/service";
import { getAdminDb } from "@/lib/db";
import { assertSessionOwnership } from "@/lib/auth";
import { fetchMemoryPrompt } from "@/lib/db/character-context";
import { ShinjeomMessageSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils"
import { saveShinjeomFinalReading, saveShinjeomMessages, logReadingSaveFailure, recordFailedReading, persistDirectAnswer, logReadingParseError, recordParseFailure } from "@/lib/db/reading-saver";
import type { DbClient } from "@/lib/db/types";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";
import { isShinjeomTopic } from "@/data/topics";

const shinjeomService = new ShinjeomService();
const aiProvider = new FallbackProvider();

// 최종 턴(결과 요청) vs 일반 대화 max_tokens 상수
// 한국어 토큰 비효율 + JSON 오버헤드 + Grok 내부 reasoning(thinking) 토큰 흡수까지 고려한 안전 마진.
const SHINJEOM_TOKENS_FINAL = 48000;
const SHINJEOM_TOKENS_CHAT = 6000;

/** 신점 최종 리딩: 파싱 + 저장 + done/saved SSE 이벤트 전송.
 *  결과(done)는 항상 전송(가용성 유지). 저장 시도한 경우에만 후속 saved 시그널 전송. */
async function emitShinjeomFinalResult(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  result: ReadingResult,
  db: DbClient | null,
  sessionId: string | null | undefined,
  locale: string,
): Promise<void> {
  // parseError 있는 부분 결과는 영구 저장하지 않는다 (result/[id] 빈 화면 방지).
  let shareToken: string | null = null;
  let saveStatus: boolean | null = null; // null = 저장 시도 안 함 (익명/parseError)
  if (db && sessionId && !result.parseError) {
    try {
      const saved = await saveShinjeomFinalReading(db, sessionId, result, locale);
      // directAnswer는 별도 best-effort UPDATE (마이그 023 미적용 환경에서도 본 저장 무영향)
      await persistDirectAnswer(db, "shinjeom", sessionId, result.directAnswer);
      shareToken = saved.shareToken;
      saveStatus = true;
    } catch (e) {
      logReadingSaveFailure("shinjeom", sessionId, e);
      await recordFailedReading(db, "shinjeom", sessionId, { result, locale }, e);
      saveStatus = false;
    }
  }

  // 결과를 먼저 전송 (share_token 포함). parseError 시 클라이언트는 result.parseError로 재시도 안내.
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: true, result: { ...result, shareToken } })}\n\n`));

  // parseError(부분 파싱/무결과)는 [reading-parse-error] 마커로 관측성 로깅 (저장 게이트와 무관, best-effort)
  if (result.parseError) {
    logReadingParseError("shinjeom", result.parseError, sessionId ?? null);
    if (db) await recordParseFailure(db, "shinjeom", result.parseError, sessionId ?? null, locale);
  }

  // 저장 시그널 (done 이후 후속 이벤트). onSaveStatus 소비자만 수신.
  if (saveStatus !== null) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: saveStatus })}\n\n`));
  }
}

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale();
    // Rate limiting
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`shinjeom:${ip}`, 20, 60_000))) return rateLimitResponse(locale);
    const rawBody = await request.json();

    // Zod 입력 검증 (chatHistory 100개 상한으로 토큰 과소비 방어)
    const parsed = ShinjeomMessageSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError("Invalid request");
    const { sessionId, characterId, userInfo, currentMessage, isFinalTurn, messageIndex, topic: rawTopic } = parsed.data;
    if (!isShinjeomTopic(rawTopic)) return jsonError("Invalid topic");
    const topic: Topic = rawTopic;
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
    const userPrompt = shinjeomService.buildConversationPrompt(topic, currentMessage, chatHistory, isFinalTurn, userInfo);

    const db = sessionId ? getAdminDb() : null;

    // 최종 턴에만 캐릭터 메모리 주입 (중간 대화는 토큰 절약)
    const memoryPrompt = (sessionId && characterId && isFinalTurn)
      ? await fetchMemoryPrompt(characterId, locale)
      : "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const enqueueChunk = (chunk: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          if (isFinalTurn) {
            // 최종 결과만 JSON 파싱 대상 — 파싱 실패 시 1회 재생성 (간헐적 형식 위반 흡수)
            const { result } = await streamReadingWithParseRetry({
              provider: aiProvider,
              systemPrompt: systemPrompt + memoryPrompt,
              userPrompt,
              maxTokens: SHINJEOM_TOKENS_FINAL,
              parse: (raw) => shinjeomService.parseResult(raw),
              onChunk: enqueueChunk,
              logTag: "shinjeom-message",
            });
            await emitShinjeomFinalResult(controller, encoder, result, db, sessionId, locale);
          } else {
            // 중간 대화 — 일반 텍스트 스트리밍 (JSON 파싱 없음, 재생성 불필요)
            let fullResponse = "";
            for await (const chunk of aiProvider.streamReading(systemPrompt + memoryPrompt, userPrompt, SHINJEOM_TOKENS_CHAT)) {
              fullResponse += chunk;
              enqueueChunk(chunk);
            }
            // 응답 먼저 전송, DB 저장은 비동기 fire-and-forget (3회 retry). 실패는 구조적 로깅만.
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isFinal: false, message: fullResponse })}\n\n`));
            if (db && sessionId && currentMessage && messageIndex !== undefined) {
              void saveShinjeomMessages(db, sessionId, currentMessage, fullResponse, messageIndex).catch(
                (e) => logReadingSaveFailure("shinjeom-message", sessionId, e)
              );
            }
          }
        } catch (e) {
          console.error("[shinjeom-message] 스트림 오류:", e instanceof Error ? e.message : String(e));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: translate("api.reading-error", locale) })}\n\n`));
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
