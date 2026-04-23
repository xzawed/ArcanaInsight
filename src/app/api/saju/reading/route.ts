import { NextRequest } from "next/server";
import { SajuService } from "@/services/saju/saju-service";
import { FallbackProvider } from "@/services/core/fallback-provider";
import { calculateSaju } from "@/services/saju/saju-calculator";
import { Topic, SajuTimeRange } from "@/types/session";
import { sajuTimeOptions } from "@/data/saju/categories";
import { getDb } from "@/lib/db";
import { saveReadingAsync } from "@/lib/db/reading-saver";

const sajuService = new SajuService();
const grokProvider = new FallbackProvider();

// 월별 상세 포함 여부에 따른 max_tokens 상수
const SAJU_TOKENS_WITH_MONTHLY = 8000;
const SAJU_TOKENS_BASE = 4000;

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
    const body = await request.json();
    const { sessionId, topic, timeRange, includeMonthly, characterId, userInfo } = body as {
      sessionId?: string | null;
      topic: Topic;
      timeRange: SajuTimeRange;
      includeMonthly: boolean;
      characterId?: string;
      userInfo: { name?: string; birthDate: string; birthHour: string; gender: "male" | "female" | "other" };
    };

    if (!topic || !timeRange || !userInfo?.birthDate || !userInfo?.birthHour || !userInfo?.gender) {
      return new Response(JSON.stringify({ error: "생년월일, 출생시간, 성별, 분석 설정은 필수입니다." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!VALID_TOPICS.includes(topic)) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!VALID_TIME_RANGES.includes(timeRange)) {
      return new Response(JSON.stringify({ error: "Invalid timeRange" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 사주팔자 계산 (서버 사이드)
    const calcOptions = resolveCalcOptions(timeRange, includeMonthly ?? false);
    const sajuResult = calculateSaju({
      birthDate: userInfo.birthDate,
      birthHour: userInfo.birthHour,
      gender: userInfo.gender,
      name: userInfo.name,
    }, calcOptions);

    const systemPrompt = sajuService.getSystemPrompt(characterId);
    const readingPrompt = sajuService.buildSajuPrompt(topic, timeRange, sajuResult, userInfo);

    const db = sessionId ? getDb() : null

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          // 월별 상세 포함 여부에 따라 max_tokens 조정 (월별 12개월 상세 보장)
          const sajuMaxTokens = includeMonthly ? SAJU_TOKENS_WITH_MONTHLY : SAJU_TOKENS_BASE;
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt, sajuMaxTokens)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = sajuService.parseResult(fullResponse);

          // 결과를 먼저 클라이언트에 전송 (DB 저장은 비동기 fire-and-forget)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            result,
            sajuData: sajuResult,
          })}\n\n`));

          if (db && sessionId) {
            saveReadingAsync(sessionId, "saju", [
              db.insert("saju_readings", {
                session_id: sessionId,
                birth_date: userInfo.birthDate,
                birth_hour: userInfo.birthHour,
                gender: userInfo.gender,
                birth_name: userInfo.name || null,
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
              }),
            ]);
          }
        } catch (e) {
          console.error("사주 리딩 생성 실패:", e instanceof Error ? e.message : String(e));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "리딩 생성 중 오류가 발생했습니다." })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    console.error("사주 API 오류:", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
