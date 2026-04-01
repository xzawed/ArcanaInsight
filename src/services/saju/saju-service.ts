import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { SajuResult } from "./saju-types";
import { OhaengType, OHAENG } from "@/data/saju/constants";
import { cleanReadingText } from "@/services/core/text-cleaner";

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

    return `당신은 "${character.name}" (${character.nameJp})입니다.

성격: ${character.personality}

말투 규칙:
- ${character.speechStyle}
- 한국어로만 응답합니다.
- 사주명리학 전문가로서, 주어진 사주 데이터를 기반으로 해석합니다.
- 사주를 직접 계산하지 않고, 제공된 데이터만 해석합니다.
- 부정적 내용도 긍정적 방향으로 조언합니다.
- 따뜻하고 공감하는 태도로 상담합니다.

중요 규칙 — 응답 길이:
- 종합 해석(overallReading)은 300~400자로 작성합니다.
- 주제별 해석(topicReading)은 300~400자로 작성합니다.
- 조언(advice)은 150~200자로 작성합니다.
- 문단은 2~3개로 나누고, 문단 사이에 빈 줄(\\n\\n)을 넣습니다.

응답 형식:
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.
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
  buildSajuPrompt(topic: Topic, sajuResult: SajuResult, userInfo?: { name?: string }): string {
    const topicLabels: Record<string, string> = {
      love: "연애/관계", "love-single": "연애 (솔로)", "love-couple": "연애 (커플)",
      finance: "재정/금전", career: "직장/진로", health: "건강", general: "종합 상담",
      "fortune-3y": "향후 3년 운세", "fortune-5y": "향후 5년 운세", "fortune-full": "전체 운세",
    };

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

    return `상담 주제: ${topicLabels[topic] || topic}
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
${yearlyText}

위 사주 데이터를 기반으로 "${topicLabels[topic] || topic}" 주제에 대해 깊이 있는 해석을 제공해주세요.
종합적인 사주 해석과 함께, 선택한 주제에 특화된 구체적 조언을 포함해주세요.`;
  }

  parseResult(aiResponse: string): ReadingResult {
    let jsonStr = aiResponse.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) jsonStr = jsonObjMatch[0];

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        overallReading: cleanReadingText(parsed.overallReading || ""),
        topicReading: cleanReadingText(parsed.topicReading || ""),
        advice: cleanReadingText(parsed.advice || ""),
      };
    } catch {
      const cleanText = aiResponse
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[{}[\]"]/g, "")
        .replace(/\b(overallReading|topicReading|advice)\b\s*:/g, "")
        .replace(/,\s*,+/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return { overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다.", advice: "" };
    }
  }

}
