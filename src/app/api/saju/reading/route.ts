import { NextRequest } from "next/server";
import { SajuService, detectSajuTimeHorizon, type SajuQuestionHorizon } from "@/services/saju/saju-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { streamReadingWithParseRetry } from "@/services/core/reading-generator";
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
import { saveSajuReading, logReadingSaveFailure, recordFailedReading, persistDirectAnswer, logReadingParseError, recordParseFailure } from "@/lib/db/reading-saver";
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
  // 프리미엄 리딩(3배 확장 분량) 기준, 모델 cap 60000 적용
  if (includeMonthly) return 60000;          // 월운 12개월 상세 포함 (84000 → cap 60000)
  if (timeRange === "five-year") return 60000;
  if (timeRange === "full-fortune") return 60000;
  if (timeRange === "three-year" || timeRange === "next-year") return 60000;
  return 48000;                              // this-week / this-month / this-year 기본
}

const VALID_TOPICS: ReadonlySet<Topic> = new Set([
  "saju-general", "saju-love-single", "saju-love-couple",
  "saju-career", "saju-health", "saju-personality",
  "saju-compatibility", "saju-auspicious-date",
]);

const VALID_TIME_RANGES: ReadonlySet<SajuTimeRange> = new Set([
  "this-week", "this-month", "this-year", "next-year", "three-year", "five-year", "full-fortune",
]);

/** timeRange + includeMonthly 기반 calculator options 결정 */
function resolveCalcOptions(timeRange: SajuTimeRange, includeMonthly: boolean) {
  const timeOption = sajuTimeOptions.find((t) => t.id === timeRange);
  const opts = { ...timeOption?.calcOption };
  if (includeMonthly && timeOption?.allowMonthly) {
    opts.monthly = true;
  }
  return opts;
}

/** 자유질문의 시간 지평이 드롭다운 timeRange와 달라도 해당 시기 데이터를 계산하도록 calc 옵션을 병합.
 *  시기 판정 근거를 데이터에서 결정론적으로 확보(모델은 narration만 → SSE 재생성 플레이키 방지). */
function applyHorizonToCalcOptions(
  opts: ReturnType<typeof resolveCalcOptions>,
  horizon: SajuQuestionHorizon | null,
) {
  if (!horizon) return opts;
  const next = { ...opts };
  if (horizon === "this-week") next.daily = true;
  else if (horizon === "this-month") next.monthly = true;
  else if (horizon === "next-year") next.yearlyMulti = Math.max(next.yearlyMulti ?? 0, 1);
  // this-year: 올해 세운은 pillar 섹션에 항상 포함되므로 추가 계산 불필요
  return next;
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

    if (!VALID_TOPICS.has(rawTopic as Topic)) return jsonError("Invalid topic");
    if (!VALID_TIME_RANGES.has(rawTimeRange as SajuTimeRange)) return jsonError("Invalid timeRange");
    const topic = rawTopic as Topic;
    const timeRange = rawTimeRange as SajuTimeRange;

    // 세션 소유권 검증 (sessionId 있을 때만 — 익명 리딩은 허용)
    if (sessionId) {
      const ownerErr = await assertSessionOwnership(sessionId);
      if (ownerErr) return ownerErr;
    }

    // 자유질문의 시간 지평 감지 → 드롭다운과 무관하게 해당 시기 데이터를 계산·주입 (#6)
    const questionHorizon: SajuQuestionHorizon | null = detectSajuTimeHorizon(freeQuestion);

    // 사주팔자 계산 (서버 사이드)
    const calcOptions = applyHorizonToCalcOptions(
      resolveCalcOptions(timeRange, includeMonthly ?? false),
      questionHorizon,
    );
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
    }, questionHorizon) + buildFreeQuestionPrompt(freeQuestion);

    const db = sessionId ? getAdminDb() : null

    // 캐릭터 메모리 조회 (인증된 사용자 + sessionId 있을 때만)
    const memoryPrompt = (sessionId && characterId)
      ? await fetchMemoryPrompt(characterId, locale)
      : "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // timeRange·includeMonthly 기반 동적 max_tokens (truncated 방지)
          const sajuMaxTokens = computeSajuReadingMaxTokens(timeRange, includeMonthly ?? false);
          // 파싱 실패 시 1회 재생성 (간헐적 JSON 형식 위반 흡수)
          const { result } = await streamReadingWithParseRetry({
            provider: grokProvider,
            systemPrompt: systemPrompt + memoryPrompt,
            userPrompt: readingPrompt,
            maxTokens: sajuMaxTokens,
            parse: (raw) => sajuService.parseResult(raw),
            onChunk: (chunk) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)),
            logTag: "saju-reading",
          });

          // 자유질문이 있었는데 directAnswer가 비면 조용한 소실 회귀 — 관측(RC3 재발 감시)
          if (freeQuestion?.trim() && !result.directAnswer?.trim()) {
            console.warn("[saju-reading] freeQuestion 있으나 directAnswer 비어있음:", { sessionId: sessionId ?? null });
          }

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 fire-and-forget).
          // parseError가 있으면 클라이언트는 result.parseError 시그널로 재시도 안내.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            result,
            sajuData: sajuResult,
          })}\n\n`));

          // parseError(부분 파싱/무결과)는 [reading-parse-error] 마커로 관측성 로깅 (저장 게이트와 무관, best-effort)
          if (result.parseError) {
            logReadingParseError("saju", result.parseError, sessionId ?? null);
            if (db) await recordParseFailure(db, "saju", result.parseError, sessionId ?? null, locale);
          }

          // DB 저장 — 결과(done)는 이미 전송됐으므로 가용성에 영향 없음. 저장 결과를 saved 시그널로 전송.
          // parseError 있는 부분 결과는 영구 저장하지 않는다 (result/[id] 진입 시 빈 화면 방지).
          if (db && sessionId && !result.parseError) {
            const sajuReadingData = {
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
            };
            try {
              await saveSajuReading(db, sessionId, sajuReadingData, locale);
              // directAnswer는 별도 best-effort UPDATE (마이그 023 미적용 환경에서도 본 저장 무영향)
              await persistDirectAnswer(db, "saju", sessionId, result.directAnswer);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: true })}\n\n`));
            } catch (e) {
              logReadingSaveFailure("saju", sessionId, e);
              await recordFailedReading(db, "saju", sessionId, { sajuReadingData, locale }, e);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: false })}\n\n`));
            }
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
