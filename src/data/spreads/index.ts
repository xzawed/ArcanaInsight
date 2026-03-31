import { SpreadDefinition, SpreadType, Topic } from "@/types/session";

export const spreads: Record<SpreadType, SpreadDefinition> = {
  "one-card": {
    type: "one-card", name: "One Card", nameKo: "원카드",
    description: "간단한 질문에 대한 직관적인 답을 얻습니다.",
    positions: [{ index: 0, label: "Answer", labelKo: "답", x: 50, y: 50 }],
  },
  "three-card": {
    type: "three-card", name: "Past / Present / Future", nameKo: "과거 / 현재 / 미래",
    description: "시간의 흐름에 따른 상황의 변화를 읽습니다.",
    positions: [
      { index: 0, label: "Past", labelKo: "과거", x: 20, y: 50 },
      { index: 1, label: "Present", labelKo: "현재", x: 50, y: 50 },
      { index: 2, label: "Future", labelKo: "미래", x: 80, y: 50 },
    ],
  },
  "five-card": {
    type: "five-card", name: "Simplified Celtic Cross", nameKo: "간소화된 켈틱 크로스",
    description: "상황을 다각도로 분석합니다.",
    positions: [
      { index: 0, label: "Present", labelKo: "현재 상황", x: 50, y: 60 },
      { index: 1, label: "Challenge", labelKo: "도전/장애물", x: 20, y: 40 },
      { index: 2, label: "Foundation", labelKo: "기반/원인", x: 50, y: 90 },
      { index: 3, label: "Near Future", labelKo: "가까운 미래", x: 80, y: 40 },
      { index: 4, label: "Outcome", labelKo: "최종 결과", x: 50, y: 10 },
    ],
  },
};

export const topicToSpread: Partial<Record<Topic, SpreadType>> = {
  love: "three-card", "love-single": "three-card", "love-couple": "three-card",
  general: "three-card", health: "one-card",
  finance: "five-card", career: "five-card",
};

export function getSpreadForTopic(topic: Topic): SpreadDefinition {
  const spreadType = topicToSpread[topic] ?? "three-card";
  return spreads[spreadType];
}
