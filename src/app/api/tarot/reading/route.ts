import { NextRequest } from "next/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { streamReadingWithParseRetry } from "@/services/core/reading-generator";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic, SpreadType } from "@/types/session";
import { SelectedCard } from "@/types/card";
import { buildUserInfoPrompt, buildFreeQuestionPrompt } from "@/services/core/prompt-builder";
import { assertSessionOwnership } from "@/lib/auth";
import { fetchMemoryPrompt } from "@/lib/db/character-context";
import { getAdminDb } from "@/lib/db";
import { isTarotTopic } from "@/data/topics";
import { TarotReadingSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils";
import { saveTarotReading, logReadingSaveFailure, recordFailedReading, persistDirectAnswer } from "@/lib/db/reading-saver";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";

const tarotService = new TarotService();
const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

/**
 * 카드 수에 비례한 max_tokens 정책.
 *
 * 3-섹션(symbolism/situation/action) + directAnswer(4~5문단) 기준.
 *   - perCard 9000 = 3섹션 × 3~4문단 (한국어 1.3x + JSON 오버헤드 + action 섹션)
 *   - base 15000 = system + overallReading + directAnswer + advice 오버헤드
 *   - reasoningBuffer 15000 = Grok-3 reasoning 흡수 마진
 *   - cap 65000 = Claude 4.x max output 안전마진 (Grok 최대 100K)
 */
function computeReadingMaxTokens(cardCount: number): number {
  return Math.min(15000 + cardCount * 9000 + 15000, 65000);
}

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale();
    // Rate limiting
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`tarot:${ip}`, 10, 60_000))) return rateLimitResponse(locale);
    const rawBody = await request.json();

    // Zod 입력 검증
    const parsed = TarotReadingSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError("Invalid request");
    const { sessionId, topic: rawTopic, spreadType, characterId, userInfo, freeQuestion, cards } = parsed.data;

    // 입력 검증
    if (!isTarotTopic(rawTopic)) return jsonError("Invalid topic");
    const topic: Topic = rawTopic;

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

    const systemPrompt = tarotService.getSystemPrompt(characterId ?? undefined, locale);
    const userInfoPrompt = buildUserInfoPrompt(userInfo);
    const freeQuestionPrompt = buildFreeQuestionPrompt(freeQuestion);
    const resolvedSpreadType: SpreadType = (spreadType && spreadResolver.getSpreadByType(spreadType))
      ? (spreadType as SpreadType)
      : spreadResolver.resolveForTopic(topic as Topic).type;
    const readingPrompt = tarotService.getReadingPrompt({
      session: { id: sessionId || "anonymous", userId: null, serviceType: "tarot", topic, status: "in_progress",
        spreadType: resolvedSpreadType, selectedCards, createdAt: new Date(), completedAt: null },
      selectedCards, chatHistory: [], topic,
    });

    const db = sessionId ? getAdminDb() : null

    // 캐릭터 메모리 조회 (인증된 사용자 + sessionId 있을 때만)
    const memoryPrompt = (sessionId && characterId)
      ? await fetchMemoryPrompt(characterId, locale)
      : "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const cardCount = cards.length;
          const maxTokens = computeReadingMaxTokens(cardCount);
          // 파싱 실패 시 1회 재생성 (간헐적 JSON 형식 위반 흡수)
          const { result } = await streamReadingWithParseRetry({
            provider: grokProvider,
            systemPrompt: systemPrompt + memoryPrompt,
            userPrompt: readingPrompt + userInfoPrompt + freeQuestionPrompt,
            maxTokens,
            parse: (raw) => tarotService.parseResult(raw, cardCount),
            onChunk: (chunk) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)),
            logTag: "tarot-reading",
          });

          // 부분 파싱(누락/잘림)은 운영 로그로 명시 추적
          if (result.parseError) {
            console.warn("[tarot-reading] 부분 파싱:", {
              parseError: result.parseError,
              expected: cardCount,
              got: result.cardInterpretations?.length ?? 0,
              sessionId: sessionId ?? null,
            });
          }
          // 자유질문이 있었는데 directAnswer가 비면 조용한 소실 회귀 — 관측
          if (freeQuestion?.trim() && !result.directAnswer?.trim()) {
            console.warn("[tarot-reading] freeQuestion 있으나 directAnswer 비어있음:", { sessionId: sessionId ?? null });
          }

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 병렬).
          // parseError가 있으면 클라이언트는 result.parseError 시그널로 재시도 안내.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));

          // DB 저장 — 결과(done)는 이미 전송됐으므로 가용성에 영향 없음. 저장 결과를 saved 시그널로 전송.
          // parseError 있는 부분 결과는 영구 저장하지 않는다 (result/[id] 진입 시 빈 화면 방지).
          if (db && sessionId && !result.parseError) {
            const cardsForSave = selectedCards.map((c) => ({
              cardId: c.card.id, position: c.position, isReversed: c.isReversed, selectedAt: c.selectedAt,
            }));
            try {
              await saveTarotReading(db, sessionId, result, cardsForSave, locale);
              // directAnswer는 별도 best-effort UPDATE (마이그 023 미적용 환경에서도 본 저장 무영향)
              await persistDirectAnswer(db, "tarot", sessionId, result.directAnswer);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: true })}\n\n`));
            } catch (e) {
              logReadingSaveFailure("tarot", sessionId, e);
              await recordFailedReading(db, "tarot", sessionId, { reading: result, cards: cardsForSave, locale }, e);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: false })}\n\n`));
            }
          }
        } catch (e) {
          console.error("리딩 생성 실패:", e instanceof Error ? e.message : String(e));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: translate("api.reading-error", locale) })}\n\n`));
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
