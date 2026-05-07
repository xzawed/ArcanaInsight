import { NextRequest } from "next/server";
import { TarotService } from "@/services/tarot/tarot-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { DeckManager } from "@/services/tarot/deck-manager";
import { SpreadResolver } from "@/services/tarot/spread-resolver";
import { Topic, SpreadType } from "@/types/session";
import { SelectedCard } from "@/types/card";
import { buildUserInfoPrompt, buildFreeQuestionPrompt, buildCharacterMemoryPrompt } from "@/services/core/prompt-builder";
import { getCurrentUser, assertSessionOwnership } from "@/lib/auth";
import { getRecentCharacterMemory } from "@/lib/db/character-context";
import { getDb } from "@/lib/db";
import { TAROT_TOPICS } from "@/data/topics";
import { TarotReadingSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils";
import { saveTarotReading } from "@/lib/db/reading-saver";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";

const tarotService = new TarotService();
const grokProvider = new FallbackProvider();
const deckManager = new DeckManager();
const spreadResolver = new SpreadResolver();

/**
 * 카드 수에 비례한 max_tokens 정책.
 *
 * 한국어는 영어 대비 토큰 효율이 약 1.3배 낮고, JSON 구조 오버헤드(~10%)도 더해진다.
 * 또한 Grok 모델이 응답 전 내부 reasoning(thinking) 토큰을 소비할 수 있어,
 * 첫 PR(#245) 이후에도 celtic-cross(10장)에서 truncated 사례가 보고됨.
 * 출력 토큰만 과금되므로 상한 자체는 비용 영향이 없다 — 안전 마진을 +30~40% 추가.
 */
function computeReadingMaxTokens(cardCount: number): number {
  if (cardCount <= 1) return 2600;
  if (cardCount <= 3) return 4500;
  if (cardCount <= 5) return 6500;
  if (cardCount <= 7) return 8500;
  if (cardCount <= 9) return 10500;
  if (cardCount <= 10) return 14000; // celtic-cross (10장)
  return 16000;                      // zodiac(12장) 등 대형 스프레드
}

/** 캐릭터 메모리 조회 — 실패해도 빈 문자열 반환 (리딩 계속) */
async function fetchMemoryPrompt(characterId: string, locale: string): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return "";
    const memories = await getRecentCharacterMemory(getDb(), currentUser.id, characterId, 3, locale);
    return buildCharacterMemoryPrompt(memories);
  } catch {
    return "";
  }
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
    if (!TAROT_TOPICS.includes(rawTopic as Topic)) return jsonError("Invalid topic");
    const topic = rawTopic as Topic;

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

    const db = sessionId ? getDb() : null

    // 캐릭터 메모리 조회 (인증된 사용자 + sessionId 있을 때만)
    const memoryPrompt = (sessionId && characterId)
      ? await fetchMemoryPrompt(characterId, locale)
      : "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          const cardCount = cards.length;
          const maxTokens = computeReadingMaxTokens(cardCount);
          for await (const chunk of grokProvider.streamReading(systemPrompt + memoryPrompt, readingPrompt + userInfoPrompt + freeQuestionPrompt, maxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = tarotService.parseResult(fullResponse, cardCount);

          // 부분 파싱(누락/잘림)은 운영 로그로 명시 추적
          if (result.parseError) {
            console.warn("[tarot-reading] 부분 파싱:", {
              parseError: result.parseError,
              expected: cardCount,
              got: result.cardInterpretations?.length ?? 0,
              sessionId: sessionId ?? null,
            });
          }

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 병렬).
          // parseError가 있으면 클라이언트는 result.parseError 시그널로 재시도 안내.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));

          // DB 저장 — fire-and-forget. parseError 있는 부분 결과는 영구 저장하지 않는다
          // (result/[id] 진입 시 빈 화면 방지). 클라이언트는 in_progress 세션을 재시도 가능.
          if (db && sessionId && !result.parseError) {
            void saveTarotReading(db, sessionId, result, cards, locale).catch(
              (e) => console.error("타로 DB 저장 최종 실패:", e)
            )
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
