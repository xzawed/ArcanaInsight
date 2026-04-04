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
  "celtic-cross": {
    type: "celtic-cross", name: "Celtic Cross", nameKo: "켈틱 크로스",
    description: "가장 전통적인 10장 배열법으로 인생의 복합적인 상황을 깊이 분석합니다.",
    positions: [
      { index: 0, label: "Present Situation", labelKo: "현재 상황", x: 35, y: 50 },
      { index: 1, label: "Challenge", labelKo: "도전/방해 요소", x: 35, y: 50 },
      { index: 2, label: "Foundation", labelKo: "기반/원인", x: 35, y: 80 },
      { index: 3, label: "Recent Past", labelKo: "최근 과거", x: 15, y: 50 },
      { index: 4, label: "Crown", labelKo: "의식적 목표", x: 35, y: 20 },
      { index: 5, label: "Near Future", labelKo: "가까운 미래", x: 55, y: 50 },
      { index: 6, label: "Self", labelKo: "자아/태도", x: 80, y: 80 },
      { index: 7, label: "Environment", labelKo: "환경/외부 영향", x: 80, y: 60 },
      { index: 8, label: "Hopes & Fears", labelKo: "희망과 두려움", x: 80, y: 40 },
      { index: 9, label: "Final Outcome", labelKo: "최종 결과", x: 80, y: 20 },
    ],
  },
  "relationship": {
    type: "relationship", name: "Relationship Spread", nameKo: "관계 스프레드",
    description: "두 사람 사이의 관계를 양면에서 거울처럼 분석합니다.",
    positions: [
      { index: 0, label: "You", labelKo: "나", x: 20, y: 50 },
      { index: 1, label: "Your View", labelKo: "내가 보는 상대", x: 20, y: 25 },
      { index: 2, label: "Their View", labelKo: "상대가 보는 나", x: 80, y: 25 },
      { index: 3, label: "Relationship Meaning", labelKo: "관계의 의미", x: 50, y: 50 },
      { index: 4, label: "Obstacles", labelKo: "장애물", x: 50, y: 80 },
      { index: 5, label: "Strengths", labelKo: "강점", x: 50, y: 20 },
      { index: 6, label: "Outcome", labelKo: "결과", x: 80, y: 50 },
    ],
  },
  "horseshoe": {
    type: "horseshoe", name: "Horseshoe Spread", nameKo: "말굽 스프레드",
    description: "시간의 흐름과 내외부 요인을 함께 분석하는 7장 배열법입니다.",
    positions: [
      { index: 0, label: "Past", labelKo: "과거", x: 10, y: 80 },
      { index: 1, label: "Present", labelKo: "현재", x: 10, y: 50 },
      { index: 2, label: "Near Future", labelKo: "가까운 미래", x: 10, y: 20 },
      { index: 3, label: "State of Mind", labelKo: "심리 상태", x: 50, y: 10 },
      { index: 4, label: "Environment", labelKo: "환경/외부 영향", x: 90, y: 20 },
      { index: 5, label: "Obstacles", labelKo: "장애물", x: 90, y: 50 },
      { index: 6, label: "Outcome", labelKo: "결과", x: 90, y: 80 },
    ],
  },
  "decision": {
    type: "decision", name: "Decision Making Spread", nameKo: "의사결정 스프레드",
    description: "두 가지 선택지와 각각의 결과를 비교하여 중요한 결정을 돕습니다.",
    positions: [
      { index: 0, label: "Heart of the Matter", labelKo: "문제의 핵심", x: 50, y: 80 },
      { index: 1, label: "Option A", labelKo: "선택지 A", x: 25, y: 50 },
      { index: 2, label: "Option B", labelKo: "선택지 B", x: 75, y: 50 },
      { index: 3, label: "Result A", labelKo: "A 선택 시 결과", x: 25, y: 15 },
      { index: 4, label: "Result B", labelKo: "B 선택 시 결과", x: 75, y: 15 },
    ],
  },
  "week-ahead": {
    type: "week-ahead", name: "Week Ahead Spread", nameKo: "한 주 전망",
    description: "이번 주 7일간의 에너지와 테마를 하루씩 읽어드립니다.",
    positions: [
      { index: 0, label: "Monday", labelKo: "월요일", x: 8, y: 50 },
      { index: 1, label: "Tuesday", labelKo: "화요일", x: 22, y: 50 },
      { index: 2, label: "Wednesday", labelKo: "수요일", x: 36, y: 50 },
      { index: 3, label: "Thursday", labelKo: "목요일", x: 50, y: 50 },
      { index: 4, label: "Friday", labelKo: "금요일", x: 64, y: 50 },
      { index: 5, label: "Saturday", labelKo: "토요일", x: 78, y: 50 },
      { index: 6, label: "Sunday", labelKo: "일요일", x: 92, y: 50 },
    ],
  },
  "zodiac": {
    type: "zodiac", name: "Zodiac Wheel Spread", nameKo: "조디악 휠",
    description: "점성술 12하우스에 카드를 배치하여 인생 전반을 종합 분석합니다.",
    positions: [
      { index: 0, label: "1st House — Self", labelKo: "1하우스 — 자아", x: 50, y: 2 },
      { index: 1, label: "2nd House — Finance", labelKo: "2하우스 — 재정", x: 73, y: 12 },
      { index: 2, label: "3rd House — Communication", labelKo: "3하우스 — 소통", x: 90, y: 30 },
      { index: 3, label: "4th House — Home", labelKo: "4하우스 — 가정", x: 95, y: 55 },
      { index: 4, label: "5th House — Creativity", labelKo: "5하우스 — 창의/사랑", x: 83, y: 78 },
      { index: 5, label: "6th House — Health", labelKo: "6하우스 — 건강", x: 63, y: 93 },
      { index: 6, label: "7th House — Partnership", labelKo: "7하우스 — 관계", x: 37, y: 93 },
      { index: 7, label: "8th House — Transformation", labelKo: "8하우스 — 변화/깊은유대", x: 17, y: 78 },
      { index: 8, label: "9th House — Philosophy", labelKo: "9하우스 — 철학/여행", x: 5, y: 55 },
      { index: 9, label: "10th House — Career", labelKo: "10하우스 — 커리어", x: 10, y: 30 },
      { index: 10, label: "11th House — Community", labelKo: "11하우스 — 우정/커뮤니티", x: 27, y: 12 },
      { index: 11, label: "12th House — Spirituality", labelKo: "12하우스 — 영성/카르마", x: 30, y: 5 },
    ],
  },
  "tree-of-life": {
    type: "tree-of-life", name: "Tree of Life Spread", nameKo: "생명의 나무",
    description: "카발라의 세피로트 10개에 카드를 배치하는 심층 영적 탐구 배열법입니다.",
    positions: [
      { index: 0, label: "Kether — Crown", labelKo: "케테르 — 왕관/영적 목표", x: 50, y: 5 },
      { index: 1, label: "Chokmah — Wisdom", labelKo: "호크마 — 지혜", x: 75, y: 20 },
      { index: 2, label: "Binah — Understanding", labelKo: "비나 — 이해", x: 25, y: 20 },
      { index: 3, label: "Chesed — Mercy", labelKo: "헤세드 — 자비/풍요", x: 75, y: 40 },
      { index: 4, label: "Geburah — Severity", labelKo: "게부라 — 도전/엄격", x: 25, y: 40 },
      { index: 5, label: "Tiphareth — Beauty", labelKo: "티파레트 — 아름다움/균형", x: 50, y: 50 },
      { index: 6, label: "Netzach — Victory", labelKo: "네짜흐 — 승리/감정", x: 75, y: 65 },
      { index: 7, label: "Hod — Splendor", labelKo: "호드 — 영광/지성", x: 25, y: 65 },
      { index: 8, label: "Yesod — Foundation", labelKo: "예소드 — 기반/잠재의식", x: 50, y: 80 },
      { index: 9, label: "Malkuth — Kingdom", labelKo: "말쿠트 — 왕국/현실", x: 50, y: 95 },
    ],
  },
};

export const topicToSpread: Partial<Record<Topic, SpreadType>> = {
  love: "three-card", "love-single": "three-card", "love-couple": "relationship",
  general: "celtic-cross", health: "one-card",
  finance: "horseshoe", career: "horseshoe",
};

export function getSpreadForTopic(topic: Topic): SpreadDefinition {
  const spreadType = topicToSpread[topic] ?? "three-card";
  return spreads[spreadType];
}
