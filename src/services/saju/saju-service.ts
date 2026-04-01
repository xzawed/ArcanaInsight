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
      // 타로 공용
      love: "연애/관계", "love-single": "연애 (솔로)", "love-couple": "연애 (커플)",
      finance: "재정/금전", career: "직장/진로", health: "건강", general: "종합 상담",
      // 사주 - 시간 기반
      "saju-monthly": "올해 월운", "saju-this-month": "이번 달 운세", "saju-weekly": "이번 주 일운",
      "saju-next-year": "내년 운세", "fortune-3y": "향후 3년 운세", "fortune-5y": "향후 5년 운세", "fortune-full": "전체 대운",
      // 사주 - 관계/이벤트
      "saju-compatibility": "궁합 분석", "saju-love-timing": "연애/결혼 시기", "saju-career-timing": "이직/사업 시기", "saju-auspicious-date": "택일 조언",
      // 사주 - 심층 분석
      "saju-personality": "성격 심층 분석", "saju-aptitude": "적성/직업 분석", "saju-constitution": "오행 체질", "saju-yongsin": "용신 활용법", "saju-relationships": "대인관계 패턴",
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

    // 주제별 추가 데이터 섹션
    const additionalSections: string[] = [];

    if (sajuResult.monthlyFortunes && sajuResult.monthlyFortunes.length > 0) {
      if (topic === "saju-this-month") {
        // 이번 달 운세: 이번 달 데이터만 상세 표시
        const thisMonth = new Date().getMonth() + 1;
        const mf = sajuResult.monthlyFortunes.find((m) => m.month === thisMonth);
        if (mf) {
          additionalSections.push(`\n=== 이번 달 월운 (${thisMonth}월) ===\n${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})월`);
        }
      } else {
        // 올해 월운: 12개월 전체 표시
        const monthlyText = sajuResult.monthlyFortunes
          .map((mf) => `${mf.month}월: ${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})`)
          .join(" → ");
        additionalSections.push(`\n=== 올해 월운 ===\n${monthlyText}`);
      }
    }

    if (sajuResult.yearlyFortunes && sajuResult.yearlyFortunes.length > 0) {
      const yearlyFortText = sajuResult.yearlyFortunes
        .map((yf) => `${yf.year}년: ${yf.stem}${yf.branch}(${OHAENG[yf.element].ko})`)
        .join(" → ");
      additionalSections.push(`\n=== 세운 전망 ===\n${yearlyFortText}`);
    }

    if (sajuResult.dailyFortunes && sajuResult.dailyFortunes.length > 0) {
      const dailyText = sajuResult.dailyFortunes
        .map((df) => df.description)
        .join(" → ");
      additionalSections.push(`\n=== 이번 주 일운 ===\n${dailyText}`);
    }

    // 주제별 해석 지시문
    const topicInstructions: Record<string, string> = {
      "saju-personality": "성격의 장단점, 내면 심리, 행동 패턴, 강점과 약점에 초점을 맞춰 해석해주세요.",
      "saju-aptitude": "타고난 적성, 어울리는 직업군, 직업적 강점과 주의할 점에 초점을 맞춰 해석해주세요.",
      "saju-constitution": "오행 균형으로 본 체질과 건강 경향, 보완해야 할 오행, 건강 관리 방법에 초점을 맞춰 해석해주세요.",
      "saju-yongsin": "용신을 일상에서 실천하는 구체적 방법(길한 색상, 방위, 음식, 직업 환경)을 중심으로 해석해주세요.",
      "saju-compatibility": "사주 구조상 인연 경향, 잘 맞는 상대 유형, 주의해야 할 관계 패턴에 초점을 맞춰 해석해주세요.",
      "saju-love-timing": "대운과 세운에서 도화살·인연운이 강한 시기, 연애와 결혼에 유리한 시기를 중심으로 분석해주세요.",
      "saju-career-timing": "이직·창업·사업 확장에 유리한 시기와 주의해야 할 시기를 대운·세운 기반으로 분석해주세요.",
      "saju-auspicious-date": "용신과 일간 기반으로 중요한 일을 진행하기 좋은 날의 원칙과 가까운 시일 내 길일을 조언해주세요.",
      "saju-monthly": "제공된 월운 데이터를 기반으로 각 달의 운세 흐름과 특히 중요한 달을 중심으로 해석해주세요.",
      "saju-this-month": "이번 달 월운 데이터를 기반으로 이번 달의 운세, 주의사항, 적극 활용할 포인트를 상세히 해석해주세요.",
      "saju-weekly": "이번 주 일운 데이터를 기반으로 요일별 운세 흐름과 특히 좋거나 주의해야 할 날을 해석해주세요.",
      "saju-next-year": "내년 세운과 기존 대운의 상호작용을 중심으로 내년의 전반적인 운세 흐름을 해석해주세요.",
      "fortune-3y": "제공된 세운 데이터를 기반으로 향후 3년간의 운세 흐름과 각 연도의 핵심 변화 포인트를 해석해주세요.",
      "fortune-5y": "제공된 세운 데이터를 기반으로 향후 5년간의 중기 전망과 대운의 상호작용을 중심으로 해석해주세요.",
      "fortune-full": "전체 대운 흐름과 각 대운 시기의 특징, 현재 대운의 의미와 앞으로의 변화 방향을 중심으로 해석해주세요.",
      "saju-relationships": "사주로 보는 대인관계 성향, 관계에서 강점과 약점, 인간관계 개선을 위한 실천 조언에 초점을 맞춰 해석해주세요.",
    };

    const instruction = topicInstructions[topic]
      || `위 사주 데이터를 기반으로 "${topicLabels[topic] || topic}" 주제에 대해 깊이 있는 해석을 제공해주세요.`;

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
${yearlyText}${additionalSections.join("")}

${instruction}
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
