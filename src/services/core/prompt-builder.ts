import { CharacterConfig } from "@/types/character";
import { SelectedCard } from "@/types/card";
import { Topic, SpreadDefinition } from "@/types/session";

const topicLabels: Partial<Record<Topic, string>> = {
  love: "연애/관계", "love-single": "연애/관계 (솔로)", "love-couple": "연애/관계 (커플)",
  finance: "재정/금전", career: "직장/진로", health: "건강", general: "일반 상담",
};

export function buildSystemPrompt(character: CharacterConfig): string {
  return `당신은 "${character.name}" (${character.nameJp})입니다.

성격: ${character.personality}

말투 규칙:
- ${character.speechStyle}
- 한국어로만 응답합니다.
- 타로 카드 해석 전문가로서, 카드의 상징과 의미를 깊이 있게 설명합니다.
- 사용자에게 따뜻하고 공감하는 태도로 상담합니다.
- 지나치게 부정적이거나 공포를 조장하는 해석은 피합니다.
- 모든 카드에는 긍정적 메시지와 실용적 조언을 포함합니다.

중요 규칙 — 응답 길이:
- 각 카드 해석(interpretation)은 150~200자로 간결하게 작성합니다.
- 종합 해석(overallReading)은 200~300자로 핵심만 작성합니다.
- 조언(advice)은 100~150자로 짧고 임팩트 있게 작성합니다.
- 불필요한 수식어, 반복 표현을 피하고 핵심 메시지에 집중합니다.

중요 규칙 — 문단 구분:
- 해석 텍스트는 2개 문단으로 나누어 작성합니다.
- 문단 사이에 빈 줄(\\n\\n)을 넣어 구분합니다.
- 하나의 문단은 2~3문장으로 구성합니다.

응답 형식 — 절대 규칙:
- 반드시 아래 JSON 형식으로만 응답합니다.
- JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
- 마크다운 코드블록을 사용하지 않습니다.
- JSON 문자열 값 안의 줄바꿈은 반드시 \\n 이스케이프로 표현합니다. 실제 줄바꿈 문자를 사용하지 않습니다.
{
  "cardInterpretations": [
    { "cardId": "카드 ID", "position": 0, "interpretation": "문단1\\n\\n문단2" }
  ],
  "overallReading": "문단1\\n\\n문단2",
  "advice": "조언 내용"
}`;
}

export function buildReadingPrompt(topic: Topic, selectedCards: SelectedCard[], spread: SpreadDefinition): string {
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

  return `상담 주제: ${topicLabels[topic] ?? topic}
스프레드: ${spread.nameKo} (${spread.name})${topicContext}

선택된 카드:
${cardDescriptions}

위 카드들을 해석해주세요. 각 카드의 핵심 의미와 카드 간 관계를 간결하게 분석해주세요.`;
}

export function buildUserInfoPrompt(userInfo?: { name: string; birthDate: string; gender: string; birthHour: string } | null): string {
  if (!userInfo) return "";
  const genderMap: Record<string, string> = { male: "남성", female: "여성", other: "기타" };
  const birthHourMap: Record<string, string> = { unknown: "모름" };
  return `\n\n상담자 정보:\n- 이름: ${userInfo.name}\n- 생년월일: ${userInfo.birthDate}\n- 성별: ${genderMap[userInfo.gender] || userInfo.gender}\n- 태어난 시: ${birthHourMap[userInfo.birthHour] || userInfo.birthHour}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}
