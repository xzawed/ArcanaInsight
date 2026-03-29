import { CharacterConfig } from "@/types/character";
import { SelectedCard } from "@/types/card";
import { Topic, SpreadDefinition } from "@/types/session";

const topicLabels: Record<Topic, string> = {
  love: "연애/관계", finance: "재정/금전", career: "직장/진로", health: "건강", general: "일반 상담",
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

응답 형식:
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.
{
  "cardInterpretations": [
    { "cardId": "카드 ID", "position": 0, "interpretation": "해석 내용" }
  ],
  "overallReading": "종합 해석",
  "advice": "실용적 조언"
}`;
}

export function buildReadingPrompt(topic: Topic, selectedCards: SelectedCard[], spread: SpreadDefinition): string {
  const cardDescriptions = selectedCards.map((sc) => {
    const pos = spread.positions[sc.position];
    const direction = sc.isReversed ? "역방향" : "정방향";
    const meanings = sc.isReversed ? sc.card.reversed : sc.card.upright;
    return `- 위치: ${pos.labelKo} (${pos.label})
  카드: ${sc.card.nameKo} (${sc.card.name}) [${direction}]
  카드ID: ${sc.card.id}
  포지션: ${sc.position}
  키워드: ${meanings.keywords.join(", ")}
  기본 의미: ${meanings.meaning}`;
  }).join("\n\n");

  return `상담 주제: ${topicLabels[topic]}
스프레드: ${spread.nameKo} (${spread.name})

선택된 카드:
${cardDescriptions}

위 카드들의 조합을 해석해주세요.`;
}

export function buildUserInfoPrompt(userInfo?: { name: string; birthDate: string; gender: string; birthHour: string } | null): string {
  if (!userInfo) return "";
  const genderMap: Record<string, string> = { male: "남성", female: "여성", other: "기타" };
  const birthHourMap: Record<string, string> = { unknown: "모름" };
  return `\n\n상담자 정보:\n- 이름: ${userInfo.name}\n- 생년월일: ${userInfo.birthDate}\n- 성별: ${genderMap[userInfo.gender] || userInfo.gender}\n- 태어난 시: ${birthHourMap[userInfo.birthHour] || userInfo.birthHour}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}
