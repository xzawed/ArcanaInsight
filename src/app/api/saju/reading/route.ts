import { NextRequest } from "next/server";
import { SajuService } from "@/services/saju/saju-service";
import { GrokProvider } from "@/services/core/grok-provider";
import { calculateSaju } from "@/services/saju/saju-calculator";
import { Topic, SajuTimeRange } from "@/types/session";
import { sajuTimeOptions } from "@/data/saju/categories";

const sajuService = new SajuService();
const grokProvider = new GrokProvider();

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

    // Supabase 클라이언트 (스트림 밖에서 미리 생성)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;
    if (sessionId) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        supabase = await createClient();
      } catch (e) {
        console.warn("Supabase 클라이언트 생성 실패:", e);
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of grokProvider.streamReading(systemPrompt, readingPrompt)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          const result = sajuService.parseResult(fullResponse);

          let shareToken: string | null = null;
          if (supabase && sessionId) {
            try {
              const readingRes = await supabase.from("saju_readings").insert({
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
              }).select("share_token").single();

              if (readingRes?.error) {
                console.error("saju_readings 저장 실패:", readingRes.error.message);
              } else {
                shareToken = readingRes?.data?.share_token ?? null;
              }

              const sessionRes = await supabase.from("sessions").update({
                status: "completed", completed_at: new Date().toISOString(),
              }).eq("id", sessionId);
              if (sessionRes.error) console.error("sessions 업데이트 실패:", sessionRes.error.message);
            } catch (dbError) {
              console.error("DB 저장 실패:", dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            done: true,
            result: { ...result, shareToken },
            sajuData: sajuResult,
          })}\n\n`));
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error("사주 리딩 생성 실패:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("사주 API 오류:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
