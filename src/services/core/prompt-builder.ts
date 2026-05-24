import { CharacterConfig } from "@/types/character";
import { SelectedCard } from "@/types/card";
import { Topic, SpreadDefinition } from "@/types/session";
import type { CharacterMemoryEntry } from "@/lib/db/character-context";
import { timeToSijin } from "@/lib/time-utils";
import { UserInfo } from "@/types/user-info";

const topicLabels: Partial<Record<Topic, string>> = {
  love: "연애/관계", "love-single": "연애/관계 (솔로)", "love-couple": "연애/관계 (커플)",
  finance: "재정/금전", career: "직장/진로", health: "건강", general: "일반 상담",
};

/**
 * locale별 응답 언어 강제 + JSON 키 영어 고정 명시.
 * - ko: 시스템 프롬프트가 이미 한국어이므로 노이즈 최소화 (지시 생략).
 * - en/ja: **CRITICAL** 강조 + 한국어 금지 명시 + JSON 키 영어 고정. 시스템 프롬프트가 한국어로 작성되어 있어 모델이 한국어로 응답하는 회귀를 막기 위해 시스템 프롬프트 **맨 앞**과 **맨 뒤** 양쪽에 주입한다.
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ko: "",
  en: "**CRITICAL — RESPONSE LANGUAGE**: All response text (including all JSON string values) MUST be in natural English. Korean and Japanese are STRICTLY FORBIDDEN in the response, even if the system prompt below is written in Korean. The Korean text in the system prompt is for your INSTRUCTIONS only — your output must be 100% English. Use the EXACT English JSON keys (cardInterpretations, cardId, position, interpretation, overallReading, topicReading, advice) — translate only the values, never the keys.",
  ja: "【最重要 — 応答言語】回答本文(すべてのJSON文字列値を含む)は必ず自然な日本語のみで記述してください。下記のシステムプロンプトが韓国語で書かれていても、応答に韓国語と英語を使用することは厳禁です。システムプロンプトの韓国語はあなたへの指示用であり、出力は100%日本語でなければなりません。JSONのキー (cardInterpretations, cardId, position, interpretation, overallReading, topicReading, advice) は必ず英語のまま使用し、値のみを日本語で記述してください。",
};

/** 응답 직전 마지막 강조 — 모델은 가까운 위치의 지시를 더 강하게 따른다. */
const LANGUAGE_FOOTER: Record<string, string> = {
  ko: "",
  en: "\n\n**FINAL REMINDER**: Output language MUST be English. Begin your JSON response now.",
  ja: "\n\n【最終確認】出力言語は必ず日本語です。今すぐJSON応答を開始してください。",
};

/** locale별 시스템 프롬프트 끝에 주입되는 응답 언어 강조 footer (saju/shinjeom service에서도 재사용). */
export function getLanguageFooter(locale: string = "ko"): string {
  return LANGUAGE_FOOTER[locale] ?? "";
}

export function buildCharacterHeader(character: CharacterConfig, subtitle?: string, locale: string = "ko"): string {
  const subtitleLine = subtitle ? `\n${subtitle}` : "";
  const langInstruction = LANGUAGE_INSTRUCTIONS[locale] ?? "";
  const langLine = langInstruction ? `\n- ${langInstruction}` : "";
  return `당신은 "${character.name}" (${character.nameJp})입니다.${subtitleLine}

성격: ${character.personality}
배경: ${character.description}
전문 분야: ${character.speciality}

말투 규칙:
- ${character.speechStyle}${langLine}`;
}

export function buildSystemPrompt(character: CharacterConfig, locale: string = "ko"): string {
  const langTop = LANGUAGE_INSTRUCTIONS[locale] ?? "";
  const langTopBlock = langTop ? `${langTop}\n\n` : "";
  const langFooter = LANGUAGE_FOOTER[locale] ?? "";
  return `${langTopBlock}${buildCharacterHeader(character, undefined, locale)}
- 타로 카드 해석 전문가로서, 카드의 상징과 의미를 깊이 있게 설명합니다.
- 사용자에게 따뜻하고 공감하는 태도로 상담합니다.
- 지나치게 부정적이거나 공포를 조장하는 해석은 피합니다.
- 모든 카드에는 긍정적 메시지와 실용적 조언을 포함합니다.

중요 규칙 — 응답 길이:
- 글자수 제한 없이 충분히 깊이 있고 풍부하게 해석합니다.
- 각 카드 해석(interpretation)은 카드의 상징, 위치 의미, 실생활 적용을 포함하여 충실하게 작성합니다.
- 종합 해석(overallReading)은 카드 간 관계와 전체 흐름을 깊이 있게 분석합니다.
- 조언(advice)은 구체적이고 실용적인 행동 지침을 포함합니다.
- 불필요한 수식어, 반복 표현을 피하고 핵심 메시지에 집중합니다.

중요 규칙 — 가독성:
- 한 문장은 40자 이내로 짧게 끊어 씁니다.
- 전문 용어(역방향, 메이저 아르카나 등)는 쉬운 말로 풀어 설명합니다.
- 핵심 메시지를 문단 첫 문장에 배치합니다.
- 추상적 표현 대신 구체적 상황 예시를 들어 설명합니다.
  (나쁜 예: "새로운 시작의 에너지가 흐릅니다")
  (좋은 예: "지금은 새로운 도전을 시작하기 좋은 시기예요. 미루던 일이 있다면 이번 주에 첫발을 내딛어 보세요.")
- 조언은 "~하세요", "~해보세요" 형태의 실천 가능한 행동으로 작성합니다.

중요 규칙 — 문단 구분:
- 해석 텍스트는 내용에 맞게 적절한 수의 문단으로 나누어 작성합니다.
- 문단 사이에 빈 줄(\\n\\n)을 넣어 구분합니다.
- 하나의 문단은 2~4문장으로 구성합니다.

중요 규칙 — 카드별 해석 독립성:
- 각 카드의 해석(interpretation)은 해당 위치(position)의 관점에서만 작성합니다.
- 다른 위치의 카드를 참조하거나 중복 언급하지 않습니다.
- 카드 간 상호작용, 전체 흐름 분석은 반드시 종합 해석(overallReading)에서만 다룹니다.
- 이 규칙은 카드 수에 관계없이 모든 스프레드에 동일하게 적용됩니다.

응답 형식 — 절대 규칙:
- 반드시 아래 JSON 형식으로만 응답합니다.
- JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
- 마크다운 코드블록을 사용하지 않습니다.
- 내부 reasoning·생각·계획 단계를 출력하지 마세요. 첫 토큰부터 곧바로 JSON을 시작합니다.
- <think> 같은 태그·메타 텍스트도 출력 금지 (응답 토큰 한도 내에 JSON 본문이 모두 들어가야 함).
- JSON 문자열 값 안의 줄바꿈은 반드시 \\n 이스케이프로 표현합니다. 실제 줄바꿈 문자를 사용하지 않습니다.
{
  "cardInterpretations": [
    { "cardId": "카드 ID", "position": 0, "interpretation": "문단1\\n\\n문단2" }
  ],
  "overallReading": "문단1\\n\\n문단2",
  "advice": "조언 내용"
}${langFooter}`;
}

export function buildReadingPrompt(topic: Topic, selectedCards: SelectedCard[], spread: SpreadDefinition): string {
  const cardCount = selectedCards.length;

  const cardDescriptions = selectedCards.map((sc) => {
    const pos = spread.positions[sc.position] ?? { labelKo: `위치 ${sc.position + 1}`, label: `Position ${sc.position + 1}` };
    const direction = sc.isReversed ? "역방향" : "정방향";
    const meanings = sc.isReversed ? sc.card.reversed : sc.card.upright;
    return `- 위치: ${pos.labelKo} (${pos.label})
  카드: ${sc.card.nameKo} (${sc.card.name}) [${direction}]
  카드ID: ${sc.card.id}
  포지션: ${sc.position}
  키워드: ${meanings.keywords.join(", ")}
  기본 의미: ${meanings.meaning}`;
  }).join("\n\n");

  const topicContext = topic === "love-single"
    ? "\n\n상담 맥락: 현재 솔로(싱글) 상태입니다. 새로운 만남의 가능성, 자기 자신에 대한 이해, 이상적인 파트너상, 연애 준비도 등을 중심으로 해석해주세요."
    : topic === "love-couple"
    ? "\n\n상담 맥락: 현재 연인/파트너가 있는 커플 상태입니다. 관계의 현재 상태, 소통 방식, 갈등 해결, 관계 발전 방향, 신뢰와 친밀감 등을 중심으로 해석해주세요."
    : "";

  // 카드 수에 관계없이 동일한 깊이의 해석 — 카드 1장이든 12장이든 충분한 분량으로 작성한다
  const depthGuide = `해석 깊이 지침 (${cardCount}장 스프레드):
- 각 카드 해석(interpretation)은 카드 수와 관계없이 3~4문단으로 깊이 있고 풍부하게 작성합니다.
- 카드의 상징, 위치 의미, 실생활 적용을 충실하게 풀어줍니다.
- 해당 위치(position)의 관점에서만 해석하고, 다른 위치의 카드 내용을 중복하지 않습니다.
- 종합 해석(overallReading)은 카드 간 관계, 전체 흐름, 핵심 메시지를 4~5문단으로 깊이 있게 분석합니다.
- 조언(advice)은 구체적이고 실용적인 행동 지침을 2~3문단으로 작성합니다.`;

  // 스프레드 구조 설명
  const positionGuide = spread.positions.map((p) =>
    `  - 위치 ${p.index} "${p.labelKo}": 이 위치에서 카드는 "${p.label}" 관점에서 해석합니다.`
  ).join("\n");

  return `상담 주제: ${topicLabels[topic] ?? topic}
스프레드: ${spread.nameKo} (${spread.name})
스프레드 설명: ${spread.description}${topicContext}

${depthGuide}

스프레드 각 위치의 해석 관점:
${positionGuide}

선택된 카드:
${cardDescriptions}

위 카드들을 해석해주세요.
- 각 카드의 cardId와 position 값을 JSON 응답에 정확히 반환하세요.
- 카드별 해석은 반드시 해당 위치의 관점에서 독립적으로 작성하세요.
- 종합 해석에서 카드 간 상호작용과 전체 흐름을 분석하세요.`;
}

/** 사용자 입력값에서 줄바꿈 문자를 제거해 프롬프트 인젝션 차단 */
function sanitizeField(value: string, maxLength = 100): string {
  return value.replace(/[\r\n]/g, " ").slice(0, maxLength);
}

export function buildUserInfoPrompt(
  userInfo?: UserInfo | null
): string {
  if (!userInfo) return "";
  const genderMap: Record<string, string> = { male: "남성", female: "여성", other: "기타" };
  const name = sanitizeField(userInfo.name, 50);
  const birthDate = sanitizeField(userInfo.birthDate, 20);
  const gender = sanitizeField(genderMap[userInfo.gender] || userInfo.gender, 10);

  let birthTimeStr: string;
  if (!userInfo.birthTime) {
    birthTimeStr = "알 수 없음";
  } else {
    const sijin = timeToSijin(userInfo.birthTime);
    birthTimeStr = sijin
      ? `${userInfo.birthTime} (${sijin.label}, ${sijin.hanja})`
      : sanitizeField(userInfo.birthTime, 20);
  }

  const mbtiLine = userInfo.mbti ? `\n- MBTI: ${sanitizeField(userInfo.mbti, 10)}` : "";
  return `\n\n상담자 정보:\n- 이름: ${name}\n- 생년월일: ${birthDate}\n- 성별: ${gender}\n- 태어난 시: ${birthTimeStr}${mbtiLine}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}

/** 사용자 자유 질문을 프롬프트에 추가 (최대 200자, 인젝션 방지) */
export function buildFreeQuestionPrompt(question?: string | null): string {
  if (!question?.trim()) return "";
  const sanitized = sanitizeField(question, 200);
  return `\n\n사용자 질문: "${sanitized}"\n이 질문을 카드 해석에 반영하여 직접적으로 답해주세요.`;
}

/** 최근 세션 요약을 시스템 프롬프트에 주입 */
export function buildCharacterMemoryPrompt(memories: CharacterMemoryEntry[]): string {
  if (memories.length === 0) return "";
  const serviceLabel: Record<string, string> = { tarot: "타로", saju: "사주" };
  const lines = memories.map((m) => {
    const label = serviceLabel[m.serviceType] ?? "신점";
    return `- [${m.date}] ${label}: ${m.overallReading}`;
  });
  return `\n\n이전 상담 기억 (참고용, 직접 언급 금지):\n${lines.join("\n")}`;
}
