import { NextRequest } from "next/server";
import { SajuService } from "@/services/saju/saju-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { calculateSaju } from "@/services/saju/saju-calculator";
import { Topic, SajuTimeRange } from "@/types/session";
import { sajuTimeOptions } from "@/data/saju/categories";
import { getAdminDb } from "@/lib/db";
import { assertSessionOwnership } from "@/lib/auth";
import { fetchMemoryPrompt } from "@/lib/db/character-context";
import { buildFreeQuestionPrompt } from "@/services/core/prompt-builder";
import { SajuReadingSchema } from "@/lib/validation/api-schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp, jsonError, SSE_HEADERS } from "@/lib/request-utils"
import { saveSajuReading } from "@/lib/db/reading-saver";
import { getRequestLocale } from "@/i18n/server-locale";
import { t as translate } from "@/i18n/translations";

const sajuService = new SajuService();
const grokProvider = new FallbackProvider();

/**
 * 사주 max_tokens 정책 — 한국어 토큰 비효율(영어 대비 1.3배) + JSON 오버헤드 + 사주명리 깊이 반영.
 * Grok 내부 reasoning(thinking) 토큰 소비까지 흡수하도록 안전 마진 +30~40% 추가.
 * 출력 토큰만 과금되므로 상한 자체는 비용 영향이 없다.
 */
function computeSajuReadingMaxTokens(timeRange: SajuTimeRange, includeMonthly: boolean): number {
  // 3-섹션(sajuSections) 기준 3배 확장, 모델 cap 60000 적용
  if (includeMonthly) return 60000;          // 월운 12개월 상세 포함 (84000 → cap 60000)
  if (timeRange === "five-year") return 60000;
  if (timeRange === "full-fortune") return 60000;
  if (timeRange === "three-year" || timeRange === "next-year") return 60000;
  return 48000;                              // this-week / this-month / this-year 기본
}

const VALID_TOPICS: Topic[] = [
  "saju-general", "saju-love-single", "saju-love-couple",
  "saju-career", "saju-health", "saju-personality",
  "saju-compatibility", "saju-auspicious-date",
];

const VALID_TIME_RANGES: SajuTimeRange[] = [
  "this-week", "this-month", "this-year", "next-year", "three-year", "five-year", "full-fortune",
];

/** timeRange + includeMonthly 기반 calculator options 결정 */
function resolveCalcOptions(timeRange: SajuTimeRange, includeMonthly: boolean) {
  const timeOption = sajuTimeOptions.find((t) => t.id === timeRange);
  const opts = { ...timeOption?.calcOption };
  if (includeMonthly && timeOption?.allowMonthly) {
    opts.monthly = true;
  }
  return opts;
}

export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale();
    // Rate limiting
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`saju:${ip}`, 10, 60_000))) return rateLimitResponse(locale);
    const rawBody = await request.json();

    // Zod 입력 검증
    const parsed = SajuReadingSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError("Invalid request");
    const { sessionId, topic: rawTopic, timeRange: rawTimeRange, includeMonthly, characterId, freeQuestion, userInfo } = parsed.data;

    if (!VALID_TOPICS.includes(rawTopic as Topic)) return jsonError("Invalid topic");
    if (!VALID_TIME_RANGES.includes(rawTimeRange as SajuTimeRange)) return jsonError("Invalid timeRange");
    const topic = rawTopic as Topic;
    const timeRange = rawTimeRange as SajuTimeRange;

    // 세션 소유권 검증 (sessionId 있을 때만 — 익명 리딩은 허용)
    if (sessionId) {
      const ownerErr = await assertSessionOwnership(sessionId);
      if (ownerErr) return ownerErr;
    }

    // 사주팔자 계산 (서버 사이드)
    const calcOptions = resolveCalcOptions(timeRange, includeMonthly ?? false);
    const sajuResult = calculateSaju({
      birthDate: userInfo.birthDate,
      birthTime: userInfo.birthTime,
      gender: userInfo.gender,
      name: userInfo.name,
      mbti: userInfo.mbti,
    }, calcOptions);

    const systemPrompt = sajuService.getSystemPrompt(characterId ?? undefined, locale);
    const readingPrompt = sajuService.buildSajuPrompt(topic, timeRange, sajuResult, {
      name: userInfo.name,
      birthTime: userInfo.birthTime,
      mbti: userInfo.mbti,
    }) + buildFreeQuestionPrompt(freeQuestion);

    const db = sessionId ? getAdminDb() : null

    // 캐릭터 메모리 조회 (인증된 사용자 + sessionId 있을 때만)
    const memoryPrompt = (sessionId && characterId)
      ? await fetchMemoryPrompt(characterId, locale)
      : "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          // timeRange·includeMonthly 기반 동적 max_tokens (truncated 방지)
          const sajuMaxTokens = computeSajuReadingMaxTokens(timeRange, includeMonthly ?? false);
          for await (const chunk of grokProvider.streamReading(systemPrompt + memoryPrompt, readingPrompt, sajuMaxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = sajuService.parseResult(fullResponse);

          // 부분 파싱(누락/잘림)은 운영 로그로 명시 추적
          if (result.parseError) {
            console.warn("[saju-reading] 부분 파싱:", {
              parseError: result.parseError,
              olen: result.overallReading?.length ?? 0,
              alen: result.advice?.length ?? 0,
              sessionId: sessionId ?? null,
            });
          }

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 fire-and-forget).
          // parseError가 있으면 클라이언트는 result.parseError 시그널로 재시도 안내.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            result,
            sajuData: sajuResult,
          })}\n\n`));

          // DB 저장 — fire-and-forget. parseError 있는 부분 결과는 영구 저장하지 않는다
          // (result/[id] 진입 시 빈 화면 방지). 클라이언트는 in_progress 세션을 재시도 가능.
          if (db && sessionId && !result.parseError) {
            void saveSajuReading(db, sessionId, {
              session_id: sessionId,
              birth_date: userInfo.birthDate,
              birth_hour: userInfo.birthTime ?? null,
              gender: userInfo.gender,
              birth_name: userInfo.name || null,
              mbti: userInfo.mbti ?? null,
              pillars: sajuResult.pillars,
              day_master: sajuResult.dayMaster,
              day_master_element: sajuResult.dayMasterElement,
              is_strong: sajuResult.isStrong,
              elements: sajuResult.elements,
              ten_stars: sajuResult.tenStars,
              twelve_stages: sajuResult.twelveStages,
              interactions: sajuResult.interactions,
              yongsin: sajuResult.yongsin,
              major_fortunes: sajuResult.majorFortunes,
              yearly_fortune: sajuResult.yearlyFortune,
              overall_reading: result.overallReading,
              topic_reading: result.topicReading || "",
              advice: result.advice,
            }, locale).catch((e) => console.error("사주 DB 저장 최종 실패:", e))
          }
        } catch (e) {
          console.error("사주 리딩 생성 실패:", e instanceof Error ? e.message : String(e));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: translate("api.reading-error", locale) })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (e) {
    console.error("사주 API 오류:", e instanceof Error ? e.message : String(e));
    return jsonError("Internal server error", 500);
  }
}
