import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic, SajuTimeRange } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { SajuResult } from "./saju-types";
import { OhaengType, OHAENG } from "@/data/saju/constants";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
import { buildCharacterHeader, getLanguageFooter } from "@/services/core/prompt-builder";
import { sajuTimeOptions } from "@/data/saju/categories";

const TOPIC_LABELS: Record<string, string> = {
  "saju-general": "종합운", "saju-love-single": "연애운 (솔로)", "saju-love-couple": "연애운 (커플)",
  "saju-career": "직장·재물운", "saju-health": "건강운",
  "saju-personality": "성격·적성", "saju-compatibility": "궁합", "saju-auspicious-date": "택일",
};

const TOPIC_INSTRUCTIONS: Record<string, string> = {
  "saju-general": `사주팔자 전체를 아래 순서로 깊이 있게 분석해주세요.
① 일간(Day Master) 특성과 격국: 타고난 기질, 신강·신약, 삶의 방향성
② 오행 분포 분석: 과한 기운과 부족한 기운이 성격·환경에 미치는 구체적 영향
③ 용신·희신·기신: 삶에서 도움이 되는 에너지와 피해야 할 에너지, 활용법
④ 십성 분석: 관계·재물·직업·심리 패턴 — 각 십성이 어떤 삶의 국면을 지배하는지
⑤ 현재 대운: 대운 간지가 일간에 미치는 영향과 이 대운에서의 기회와 주의점
⑥ 세운과 대운의 교차: 올해 세운이 대운과 어떻게 상호작용하며 어떤 사건을 불러오는지
⑦ 종합 전망: 현재 위치, 앞으로의 큰 흐름, 이 사주가 가장 빛나는 시기`,
  "saju-love-single": `연애·인연운을 아래 항목으로 상세히 분석해주세요.
① 연애 기질: 일간과 십성(정관·정재·식신 등)으로 본 연애 패턴, 표현 방식, 내면 욕구
② 이상형의 특징: 사주 구조상 잘 맞는 상대의 성격·기질·오행
③ 도화살·역마살 등 연애 관련 신살 유무와 실질적 의미
④ 현재 대운·세운의 연애운 흐름: 인연이 열리는 시기와 조건, 구체적 시기 예측
⑤ 반복되기 쉬운 연애 패턴과 심리적 원인: 놓치기 쉬운 함정
⑥ 새로운 인연을 만나기 위한 구체적 환경·행동·마음가짐 조언
⑦ 향후 연애운 전망과 인연·결혼의 좋은 시기`,
  "saju-love-couple": `커플 관계 운세를 아래 항목으로 상세히 분석해주세요.
① 사주로 본 관계 유지 능력: 애정 표현 방식, 집착과 자유 사이의 균형
② 현재 대운·세운이 관계에 미치는 구체적 영향과 흐름
③ 갈등 요소의 심리적 뿌리: 어떤 오행·십성이 마찰을 만드는지, 근본 원인
④ 화합의 에너지: 둘의 관계를 강화하는 시기와 구체적 방법
⑤ 결혼·동거 등 다음 단계로 나아갈 가능성과 적합한 시기 분석
⑥ 상대방과의 기운 차이를 극복하고 시너지를 만드는 방법
⑦ 이 관계를 오래 지속하기 위한 실질적 행동 조언`,
  "saju-career": `직장·재물운을 아래 항목으로 상세히 분석해주세요.
① 타고난 재물 그릇: 재성(財星) 분석, 재물 축적 능력과 한계
② 직업 운세: 관성(官星)으로 본 직장 적응력, 승진·이직 타이밍
③ 현재 대운·세운의 재물·직장 흐름: 기회가 열리는 구간과 손실 위험 구간
④ 사업 vs 직장: 사주 구조상 어느 쪽이 더 유리한지, 그 이유
⑤ 재물 증식·관리 방법: 어떤 방식으로 돈을 다루어야 불어나는지
⑥ 피해야 할 재물 패턴: 손재·투자 실패 경향, 예방법과 대처법
⑦ 최적의 직업군·사업 분야와 향후 5년 커리어 전망`,
  "saju-health": `건강운을 아래 항목으로 상세히 분석해주세요.
① 오행 체질: 선천적 강점과 취약한 신체 부위 (木→간·담, 火→심장·소장, 土→비위·소화, 金→폐·대장, 水→신장·방광)
② 오행 과잉·부족이 건강에 미치는 구체적 영향과 증상
③ 현재 대운·세운이 건강에 미치는 영향: 특히 주의해야 할 시기와 신체 부위
④ 잠재적 만성 건강 위험 요소와 조기 관리 포인트
⑤ 체질에 맞는 식이·운동·수면·생활습관 구체적 조언
⑥ 정신 건강: 스트레스 패턴, 심리적 취약점, 감정 조절법
⑦ 용신 기반의 건강을 강화하는 색깔·방향·음식·활동 제안`,
  "saju-personality": `성격·적성을 아래 항목으로 상세히 분석해주세요.
① 일간 핵심 기질: 타고난 성격의 본질, 삶에서 중요하게 여기는 가치
② 오행 분포로 본 성격의 뚜렷한 장점과 단점, 극단적 성향
③ 십성 분석: 내면 심리 패턴, 인간관계 방식, 무의식적 욕구 구조
④ 12운성으로 본 에너지 흐름: 어떤 환경에서 잠재력이 피어나는지
⑤ 타고난 재능과 잠재력: 어떤 분야에서 두드러지는지 구체적 사례
⑥ 어울리는 직업군·활동 분야 (최소 5가지 이상, 그 이유 설명)
⑦ 성격적 취약점 극복 방법과 잠재력을 최대한 발휘하기 위한 실천 조언`,
  "saju-compatibility": `궁합 운세를 아래 항목으로 상세히 분석해주세요.
① 사주 구조상 인연의 경향: 어떤 에너지·기질의 사람과 자연스럽게 끌리는지
② 십성으로 본 이상적인 파트너: 성격·가치관·생활 방식의 구체적 특징
③ 잘 맞는 상대의 일간·오행 특성과 그 이유
④ 반복되기 쉬운 관계 문제: 충·형 에너지로 인한 갈등 패턴
⑤ 현재 대운·세운의 인연·관계 흐름과 중요한 만남의 시기
⑥ 좋은 인연을 만나기 위한 환경·활동·태도 조언
⑦ 장기적 반려자 운세: 결혼·동반자 관계의 전망과 적합한 시기`,
  "saju-auspicious-date": `택일 조언을 아래 항목으로 상세히 분석해주세요.
① 일간과 용신 기반의 길일 선택 원칙과 판단 기준
② 좋은 날의 간지 패턴: 어떤 천간·지지 조합이 일간에 유리한지
③ 반드시 피해야 할 날의 특징: 충·형·파·해가 있는 날의 유형
④ 현재 월운·세운 맥락에서 특히 길한 시기와 흉한 구간
⑤ 중요한 일별 택일 기준 — 계약, 이사, 결혼, 개업, 시험, 수술 각각
⑥ 현재 대운 흐름에서 가장 강력한 길일이 모이는 시기
⑦ 실용적인 택일 방법과 날짜를 고를 때 체크해야 할 사항 목록`,
};

function resolveTimeContext(timeRange: SajuTimeRange): string {
  if (timeRange === "this-week") return "이번 주(7일간 일운) 기준으로 해석해주세요.";
  if (timeRange === "this-month") return "이번 달(월운) 기준으로 해석해주세요.";
  if (timeRange === "this-year") return "올해(세운) 기준으로 해석해주세요.";
  if (timeRange === "next-year") return "내년 세운을 중심으로 해석해주세요.";
  if (timeRange === "three-year") return "향후 3년 흐름을 중심으로 해석해주세요.";
  if (timeRange === "five-year") return "향후 5년 중기 전망을 중심으로 해석해주세요.";
  return "전체 대운 로드맵을 중심으로 해석해주세요.";
}

function resolveTopicInstruction(topic: Topic): string {
  return TOPIC_INSTRUCTIONS[topic]
    || `위 사주 데이터를 기반으로 "${TOPIC_LABELS[topic] ?? topic}" 주제에 대해 깊이 있는 해석을 제공해주세요.`;
}

function buildAdditionalSections(sajuResult: SajuResult, timeRange: SajuTimeRange): string[] {
  const sections: string[] = [];

  if (timeRange === "this-month" && sajuResult.monthlyFortunes && sajuResult.monthlyFortunes.length > 0) {
    const thisMonth = new Date().getMonth() + 1;
    const mf = sajuResult.monthlyFortunes.find((m) => m.month === thisMonth);
    if (mf) {
      sections.push(`\n=== 이번 달 월운 (${thisMonth}월) ===\n${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})월`);
    }
  } else if (sajuResult.monthlyFortunes && sajuResult.monthlyFortunes.length > 0) {
    const monthlyText = sajuResult.monthlyFortunes
      .map((mf) => `${mf.month}월: ${mf.stem}${mf.branch}(${OHAENG[mf.element].ko})`)
      .join(" → ");
    sections.push(`\n=== 월운 ===\n${monthlyText}`);
  }

  if (sajuResult.yearlyFortunes && sajuResult.yearlyFortunes.length > 0) {
    const yearlyFortText = sajuResult.yearlyFortunes
      .map((yf) => `${yf.year}년: ${yf.stem}${yf.branch}(${OHAENG[yf.element].ko})`)
      .join(" → ");
    sections.push(`\n=== 세운 전망 ===\n${yearlyFortText}`);
  }

  if (sajuResult.dailyFortunes && sajuResult.dailyFortunes.length > 0) {
    const dailyText = sajuResult.dailyFortunes.map((df) => df.description).join(" → ");
    sections.push(`\n=== 이번 주 일운 ===\n${dailyText}`);
  }

  return sections;
}

function buildPillarSection(sajuResult: SajuResult): string {
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

  return `=== 사주팔자 ===
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
${yearlyText}`;
}

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

  getSystemPrompt(characterId?: string, locale?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();

    return `${buildCharacterHeader(character, undefined, locale ?? "ko")}
- 사주명리학 전문가로서, 제공된 사주 데이터만 기반으로 해석합니다.
- 부정적 내용도 긍정적 방향의 조언으로 전환합니다.
- 각 필드는 충분한 깊이와 분량으로 — 짧고 단순한 문장 나열이 아닌, 맥락·이유·구체적 사례를 포함해 서술합니다.

중요 규칙:
- 문단 사이에 빈 줄(\\n\\n)을 넣어 가독성을 높입니다.
- 사주 용어는 쉬운 말로 풀어 설명합니다 (예: "나무(木) 기운이 넘쳐 추진력은 강하지만 유연성이 부족합니다").
- 핵심을 문단 첫 문장에 제시하고, 이유와 구체적 상황으로 이어갑니다.
- 추상적 표현 대신 구체적 시기·상황·행동으로 서술합니다.

응답 형식 — 절대 규칙:
- 반드시 아래 JSON 형식으로만 응답합니다.
- JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
- 마크다운 코드블록을 사용하지 않습니다.
- 내부 reasoning·생각·계획 단계를 출력하지 마세요. 첫 토큰부터 곧바로 JSON을 시작합니다.
- <think> 같은 태그·메타 텍스트도 출력 금지 (응답 토큰 한도 내에 JSON 본문이 모두 들어가야 함).
- JSON 문자열 값 안의 줄바꿈은 반드시 \\n 이스케이프로 표현합니다. 실제 줄바꿈 문자를 사용하지 않습니다.
{
  "overallReading": "【사주 전체 구조】일간 특성·신강신약·격국 → 【오행 분포】과잉·부족 기운의 삶에 대한 영향 → 【용신·희신】핵심 에너지와 활용법 → 【대운 흐름】현재 대운이 일간에 미치는 영향 → 【세운】올해 세운과 대운의 교차 작용 → 【전반 전망】현재 위치와 앞으로의 큰 흐름. 최소 6문단 이상, 각 문단을 충분히 서술.",
  "topicReading": "선택한 주제와 시간 범위에 특화된 심층 분석. 시기별 구체적 흐름(월별·분기별 포함), 기회가 열리는 시기, 주의해야 할 구간, 십성·12운성이 이 주제에 어떻게 작용하는지. 최소 4문단 이상.",
  "advice": "용신·희신 기반의 실용적 행동 지침. 지금 당장 강화해야 할 것, 피해야 할 것, 일상에서 실천 가능한 구체적 방법, 마음가짐 조언. 최소 3문단 이상."
}${getLanguageFooter(locale ?? "ko")}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReadingPrompt(_context: SessionContext): string {
    return ""; // 사주는 buildSajuPrompt()로 별도 구성 — DivinationService 인터페이스 준수
  }

  /** 사주 전용 프롬프트 생성 */
  buildSajuPrompt(
    topic: Topic,
    timeRange: SajuTimeRange,
    sajuResult: SajuResult,
    userInfo?: { name?: string; birthTime?: string | null; mbti?: string }
  ): string {
    const timeOption = sajuTimeOptions.find((t) => t.id === timeRange);
    const timeLabel = timeOption?.label ?? timeRange;
    const timeDesc = timeOption?.desc ?? "";

    const pillarSection = buildPillarSection(sajuResult);
    const additionalSections = buildAdditionalSections(sajuResult, timeRange);
    const timeContext = resolveTimeContext(timeRange);
    const instruction = resolveTopicInstruction(topic);

    const birthTimeNote = userInfo?.birthTime === null
      ? "\n[참고: 출생 시각 미입력 — 시주는 자시(0시) 기준으로 계산됨, 해석 시 참고만 할 것]"
      : "";
    const mbtiNote = userInfo?.mbti
      ? `\n[MBTI: ${userInfo.mbti} — 심리 유형을 사주 해석에 교차 참조할 것]`
      : "";

    return `상담 주제: ${TOPIC_LABELS[topic] ?? topic} / 시간 범위: ${timeLabel}(${timeDesc})
${userInfo?.name ? `상담자: ${userInfo.name}` : ""}${birthTimeNote}${mbtiNote}

${pillarSection}${additionalSections.join("")}

${timeContext}
${instruction}

[분량 기준]
- overallReading: 사주팔자 전체 구조(일간→오행→용신→대운→세운)를 최소 6문단 이상, 각 문단은 3~5문장으로 풍부하게 서술
- topicReading: 위 주제·시간 범위에 맞게 시기별 흐름, 기회·주의 구간, 구체적 상황 예측을 최소 4문단 이상
- advice: 용신·희신 기반의 실용적 행동 지침과 일상 실천 방법을 최소 3문단 이상`;
  }

  parseResult(aiResponse: string): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);

    if (parsed) {
      const overallReading = cleanReadingText(String(parsed.overallReading || ""));
      const advice = cleanReadingText(String(parsed.advice || ""));
      const result: ReadingResult = {
        overallReading,
        topicReading: cleanReadingText(String(parsed.topicReading || "")),
        advice,
      };
      // 핵심 필드(overallReading 또는 advice) 빈 문자 = 부분 파싱
      if (!overallReading || !advice) result.parseError = "missing_fields";
      return result;
    }

    // JSON 파싱 완전 실패 — 텍스트에서 의미 있는 내용만 추출
    console.error("사주 AI 응답 JSON 파싱 실패 (최종 fallback)\n원본 응답:", aiResponse.slice(0, 500));
    const cleanText = extractFallbackText(aiResponse);
    return {
      overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다.",
      advice: "",
      parseError: cleanText ? "fallback_text" : "invalid_json",
    };
  }

}
