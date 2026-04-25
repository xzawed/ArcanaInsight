import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic, SajuTimeRange } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { SajuResult } from "./saju-types";
import { OhaengType, OHAENG } from "@/data/saju/constants";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
import { buildCharacterHeader } from "@/services/core/prompt-builder";
import { sajuTimeOptions } from "@/data/saju/categories";

export class SajuService implements DivinationService {
  id = "saju";
  name = "사주";

  getCharacter(): CharacterConfig {
    const character = getCharacterById("seonhwa");
    if (!character) throw new Error("Seonhwa character not found");
    return character;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    return { userId: null, serviceType: this.id, topic, status: "in_progress", spreadType: null, selectedCards: [], completedAt: null };
  }

  getSystemPrompt(characterId?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();

    return `${buildCharacterHeader(character)}
- 사주명리학 전문가로서, 제공된 사주 데이터만 기반으로 해석합니다.
- 부정적 내용도 긍정적 조언으로 전환합니다.

중요 규칙:
- 문단 사이에 빈 줄(\\n\\n)을 넣고, 한 문장은 40자 이내로 짧게 씁니다.
- 사주 용어는 쉬운 말로 풀어 설명합니다 (예: "나무 기운이 약해진 상태라 휴식이 도움됩니다").
- 핵심을 문단 첫 문장에, 조언은 "~하세요" 형태로 작성합니다.

응답 형식 — 절대 규칙:
- 반드시 아래 JSON 형식으로만 응답합니다.
- JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
- 마크다운 코드블록을 사용하지 않습니다.
- JSON 문자열 값 안의 줄바꿈은 반드시 \\n 이스케이프로 표현합니다. 실제 줄바꿈 문자를 사용하지 않습니다.
{
  "overallReading": "종합 해석 문단1\\n\\n문단2",
  "topicReading": "주제별 해석 문단1\\n\\n문단2",
  "advice": "조언 내용"
}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReadingPrompt(_context: SessionContext): string {
    return ""; // 사주는 buildSajuPrompt()로 별도 구성 — DivinationService 인터페이스 준수
  }

  /** 사주 전용 프롬프트 생성 */
  buildSajuPrompt(topic: Topic, timeRange: SajuTimeRange, sajuResult: SajuResult, userInfo?: { name?: string }): string {
    const topicLabels: Record<string, string> = {
      "saju-general": "종합운", "saju-love-single": "연애운 (솔로)", "saju-love-couple": "연애운 (커플)",
      "saju-career": "직장·재물운", "saju-health": "건강운",
      "saju-personality": "성격·적성", "saju-compatibility": "궁합", "saju-auspicious-date": "택일",
    };

    const timeOption = sajuTimeOptions.find((t) => t.id === timeRange);
    const timeLabel = timeOption?.label ?? timeRange;
    const timeDesc = timeOption?.desc ?? "";

    const p = sajuResult.pillars;
    const pillarText = `연주: ${p.year.stemHanja}${p.year.branchHanja} (${p.year.stem}${p.year.branch})
월주: ${p.month.stemHanja}${p.month.branchHanja} (${p.month.stem}${p.month.branch})
일주: ${p.day.stemHanja}${p.day.branchHanja} (${p.day.stem}${p.day.branch})
시주: ${p.hour.stemHanja}${p.hour.branchHanja} (${p.hour.stem}${p.hour.branch})`;

    const elementText = Object.entries(sajuResult.elements)
      .map(([el, count]) => `${OHAENG[el as OhaengType].hanja}(${OHAENG[el as OhaengType].ko}): ${count}`)
      .join(", ");

    const tenStarText = sajuResult.tenStars
      .map((ts) => `${ts.position}: ${ts.starKo} (${ts.star})`)
      .join(", ");

    const twelveStageText = sajuResult.twelveStages
      .map((ts) => `${ts.position}: ${ts.stageKo} (${ts.stage})`)
      .join(", ");

    const interactionText = [
      ...sajuResult.interactions.combinations,
      ...sajuResult.interactions.clashes,
      ...sajuResult.interactions.punishments,
    ].join(", ") || "특별한 관계 없음";

    const fortuneText = sajuResult.majorFortunes
      .map((f) => `${f.startAge}~${f.endAge}세: ${f.stem}${f.branch}(${OHAENG[f.element].ko})`)
      .join(" → ");

    const yf = sajuResult.yearlyFortune;
    const yearlyText = `${yf.year}년 ${yf.stem}${yf.branch}(${OHAENG[yf.element].ko})`;

    // 시간단위별 추가 데이터 섹션
    const additionalSections: string[] = [];

    if (timeRange === "this-month" && sajuResult.monthlyFortunes && sajuResult.monthlyFortunes.length > 0) {
      const thisMonth = new Date().getMonth() + 1;
      const mf = sajuResult.monthlyFortunes.find((m) => m.month === thisMonth);
      if (mf) additionalSections.push(`\n=== 이번 달 월운 (${thisMonth}월) ===\n${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})월`);
    } else if (sajuResult.monthlyFortunes && sajuResult.monthlyFortunes.length > 0) {
      const monthlyText = sajuResult.monthlyFortunes
        .map((mf) => `${mf.month}월: ${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})`)
        .join(" → ");
      additionalSections.push(`\n=== 월운 ===\n${monthlyText}`);
    }

    if (sajuResult.yearlyFortunes && sajuResult.yearlyFortunes.length > 0) {
      const yearlyFortText = sajuResult.yearlyFortunes
        .map((yf) => `${yf.year}년: ${yf.stem}${yf.branch}(${OHAENG[yf.element].ko})`)
        .join(" → ");
      additionalSections.push(`\n=== 세운 전망 ===\n${yearlyFortText}`);
    }

    if (sajuResult.dailyFortunes && sajuResult.dailyFortunes.length > 0) {
      const dailyText = sajuResult.dailyFortunes.map((df) => df.description).join(" → ");
      additionalSections.push(`\n=== 이번 주 일운 ===\n${dailyText}`);
    }

    // 분석영역별 해석 지시문
    const topicInstructions: Record<string, string> = {
      "saju-general":       "사주 전반의 흐름, 기운의 강약, 현재 대운과 세운이 어떻게 작용하는지 종합적으로 해석해주세요.",
      "saju-love-single":   "도화살·인연운이 강한 시기, 새 만남이 기대되는 흐름, 어울리는 상대 유형을 중심으로 해석해주세요.",
      "saju-love-couple":   "현재 관계의 운세 흐름, 갈등 요소와 화합 에너지, 관계 발전을 위한 조언을 중심으로 해석해주세요.",
      "saju-career":        "직장운·사업운·금전운의 흐름, 기회 시기와 주의해야 할 시기, 재물 관리 조언을 중심으로 해석해주세요.",
      "saju-health":        "오행 균형으로 본 체질과 건강 취약점, 주의해야 할 건강 이슈, 건강 관리 방법에 초점을 맞춰 해석해주세요.",
      "saju-personality":   "성격의 장단점, 내면 심리 패턴, 타고난 적성과 어울리는 직업군에 초점을 맞춰 해석해주세요.",
      "saju-compatibility": "사주 구조상 인연 경향, 잘 맞는 상대 유형, 주의해야 할 관계 패턴에 초점을 맞춰 해석해주세요.",
      "saju-auspicious-date": "용신과 일간 기반으로 중요한 일을 진행하기 좋은 날의 원칙과 길일·흉일 판단 기준을 조언해주세요.",
    };

    const instruction = topicInstructions[topic]
      || `위 사주 데이터를 기반으로 "${topicLabels[topic] || topic}" 주제에 대해 깊이 있는 해석을 제공해주세요.`;

    // 시간단위 컨텍스트 안내
    const timeContext = timeRange === "this-week"
      ? "이번 주(7일간 일운) 기준으로 해석해주세요."
      : timeRange === "this-month"
      ? "이번 달(월운) 기준으로 해석해주세요."
      : timeRange === "this-year"
      ? "올해(세운) 기준으로 해석해주세요."
      : timeRange === "next-year"
      ? "내년 세운을 중심으로 해석해주세요."
      : timeRange === "three-year"
      ? "향후 3년 흐름을 중심으로 해석해주세요."
      : timeRange === "five-year"
      ? "향후 5년 중기 전망을 중심으로 해석해주세요."
      : "전체 대운 로드맵을 중심으로 해석해주세요.";

    return `상담 주제: ${topicLabels[topic] || topic} / 시간 범위: ${timeLabel}(${timeDesc})
${userInfo?.name ? `상담자: ${userInfo.name}` : ""}

=== 사주팔자 ===
${pillarText}

일간(Day Master): ${sajuResult.dayMaster} (${OHAENG[sajuResult.dayMasterElement].hanja}, ${sajuResult.isStrong ? "신강" : "신약"})
용신: ${OHAENG[sajuResult.yongsin.element].hanja}(${OHAENG[sajuResult.yongsin.element].ko}) — ${sajuResult.yongsin.reason}

=== 오행 분포 ===
${elementText}

=== 십성 ===
${tenStarText}

=== 12운성 ===
${twelveStageText}

=== 합/충/형 ===
${interactionText}

=== 대운 흐름 ===
${fortuneText}

=== 올해 세운 ===
${yearlyText}${additionalSections.join("")}

${timeContext}
${instruction}
종합적인 사주 해석과 함께, 선택한 시간 범위와 주제에 특화된 구체적 조언을 포함해주세요.`;
  }

  parseResult(aiResponse: string): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);

    if (parsed) {
      return {
        overallReading: cleanReadingText(String(parsed.overallReading || "")),
        topicReading: cleanReadingText(String(parsed.topicReading || "")),
        advice: cleanReadingText(String(parsed.advice || "")),
      };
    }

    // JSON 파싱 완전 실패 — 텍스트에서 의미 있는 내용만 추출
    console.error("사주 AI 응답 JSON 파싱 실패 (최종 fallback)\n원본 응답:", aiResponse.slice(0, 500));
    const cleanText = extractFallbackText(aiResponse);
    return { overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다.", advice: "" };
  }

}
