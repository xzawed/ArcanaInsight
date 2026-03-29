export interface CardSymbol {
  id: string;
  paths: string[];
  strokeWidth?: number;
}

export const majorSymbols: Record<string, CardSymbol> = {
  "major-00": { // The Fool — 별 + 절벽
    id: "major-00",
    paths: [
      "M24 6 L26.5 18 L38 20.5 L28 25 L30.5 37 L24 28.5 L17.5 37 L20 25 L10 20.5 L21.5 18 Z",
      "M6 42 Q14 36 24 40 Q34 36 42 42",
    ],
  },
  "major-01": { // The Magician — 무한대 + 지팡이
    id: "major-01",
    paths: [
      "M14 16 C14 10 24 10 24 16 C24 22 34 22 34 16 C34 10 24 10 24 16 C24 22 14 22 14 16",
      "M24 22 L24 40",
      "M20 40 L28 40",
    ],
  },
  "major-02": { // High Priestess — 초승달 + 기둥
    id: "major-02",
    paths: [
      "M24 10 A10 10 0 0 1 24 30 A6 6 0 0 0 24 10",
      "M12 14 L12 38",
      "M36 14 L36 38",
    ],
  },
  "major-03": { // The Empress — 비너스 심볼
    id: "major-03",
    paths: [
      "M24 8 A10 10 0 1 0 24 28 A10 10 0 1 0 24 8",
      "M24 28 L24 42",
      "M18 36 L30 36",
    ],
  },
  "major-04": { // The Emperor — 앙크 + 왕좌
    id: "major-04",
    paths: [
      "M24 8 A6 6 0 1 0 24 20 A6 6 0 1 0 24 8",
      "M24 20 L24 38",
      "M18 28 L30 28",
      "M14 38 L34 38",
    ],
  },
  "major-05": { // The Hierophant — 삼중 십자가
    id: "major-05",
    paths: [
      "M24 6 L24 42",
      "M18 14 L30 14",
      "M16 24 L32 24",
      "M18 34 L30 34",
    ],
  },
  "major-06": { // The Lovers — 하트 + 화살
    id: "major-06",
    paths: [
      "M24 16 C16 6 4 14 24 30 C44 14 32 6 24 16",
      "M24 4 L24 14",
      "M20 8 L24 4 L28 8",
    ],
  },
  "major-07": { // The Chariot — 전차 바퀴
    id: "major-07",
    paths: [
      "M12 28 A8 8 0 1 0 12 28.01",
      "M36 28 A8 8 0 1 0 36 28.01",
      "M12 20 L24 8 L36 20",
      "M12 20 L36 20",
    ],
  },
  "major-08": { // Strength — 무한대 + 사자
    id: "major-08",
    paths: [
      "M16 12 C16 8 24 8 24 12 C24 16 32 16 32 12 C32 8 24 8 24 12 C24 16 16 16 16 12",
      "M16 24 C10 24 8 32 14 38 C18 42 30 42 34 38 C40 32 38 24 32 24 C28 24 24 28 24 32",
    ],
  },
  "major-09": { // The Hermit — 랜턴 + 지팡이
    id: "major-09",
    paths: [
      "M24 6 L20 14 L28 14 Z",
      "M24 14 L24 42",
      "M22 10 L26 10",
    ],
    strokeWidth: 1.5,
  },
  "major-10": { // Wheel of Fortune — 바퀴
    id: "major-10",
    paths: [
      "M24 6 A18 18 0 1 0 24 42 A18 18 0 1 0 24 6",
      "M24 12 A12 12 0 1 0 24 36 A12 12 0 1 0 24 12",
      "M24 6 L24 42", "M6 24 L42 24",
    ],
  },
  "major-11": { // Justice — 천칭
    id: "major-11",
    paths: [
      "M24 6 L24 36",
      "M8 16 L40 16",
      "M8 16 L4 28 L12 28 Z",
      "M40 16 L36 28 L44 28 Z",
      "M18 36 L30 36",
    ],
  },
  "major-12": { // The Hanged Man — 거꾸로 매달린 사람
    id: "major-12",
    paths: [
      "M16 6 L32 6",
      "M24 6 L24 16",
      "M24 16 A5 5 0 1 0 24 26",
      "M24 26 L24 36",
      "M24 30 L18 34", "M24 30 L30 34",
      "M24 36 L20 42", "M24 36 L28 42",
    ],
    strokeWidth: 1.2,
  },
  "major-13": { // Death — 해골 + 낫
    id: "major-13",
    paths: [
      "M24 10 A6 6 0 1 0 24 22 A6 6 0 1 0 24 10",
      "M20 14 L20 14.01", "M28 14 L28 14.01",
      "M20 18 Q24 22 28 18",
      "M10 8 Q8 24 24 32 L24 42",
    ],
  },
  "major-14": { // Temperance — 삼각형 + 물 흐름
    id: "major-14",
    paths: [
      "M24 8 L38 36 L10 36 Z",
      "M18 24 Q24 20 30 24",
      "M16 30 Q24 26 32 30",
    ],
  },
  "major-15": { // The Devil — 역오각별
    id: "major-15",
    paths: [
      "M24 38 L14 12 L40 28 L8 28 L34 12 Z",
    ],
  },
  "major-16": { // The Tower — 탑 + 번개
    id: "major-16",
    paths: [
      "M18 42 L18 14 L24 8 L30 14 L30 42",
      "M24 8 L20 2",
      "M36 6 L28 16 L34 16 L26 26",
    ],
  },
  "major-17": { // The Star — 8각 별
    id: "major-17",
    paths: [
      "M24 4 L26 18 L40 14 L30 22 L40 34 L26 28 L24 44 L22 28 L8 34 L18 22 L8 14 L22 18 Z",
    ],
  },
  "major-18": { // The Moon — 달 + 물
    id: "major-18",
    paths: [
      "M24 6 A12 12 0 0 1 24 30 A8 8 0 0 0 24 6",
      "M4 38 Q12 32 20 38 Q28 32 36 38 Q44 32 48 38",
    ],
  },
  "major-19": { // The Sun — 태양
    id: "major-19",
    paths: [
      "M24 14 A10 10 0 1 0 24 34 A10 10 0 1 0 24 14",
      "M24 2 L24 10", "M24 38 L24 46",
      "M12 24 L4 24", "M44 24 L36 24",
      "M15 15 L10 10", "M33 15 L38 10",
      "M15 33 L10 38", "M33 33 L38 38",
    ],
    strokeWidth: 1.5,
  },
  "major-20": { // Judgement — 트럼펫
    id: "major-20",
    paths: [
      "M24 6 L24 20",
      "M18 20 L30 20 L34 36 L14 36 Z",
      "M20 36 L20 42", "M28 36 L28 42",
    ],
  },
  "major-21": { // The World — 월계관 + 원
    id: "major-21",
    paths: [
      "M24 4 A20 20 0 1 0 24 44 A20 20 0 1 0 24 4",
      "M24 10 A14 14 0 1 0 24 38 A14 14 0 1 0 24 10",
      "M24 18 L24 30",
      "M20 22 L28 22",
    ],
  },
};

export const suitSymbols: Record<string, CardSymbol> = {
  wands: {
    id: "wands",
    paths: [
      "M24 6 L24 42",
      "M20 12 Q24 8 28 12",
      "M18 18 Q24 14 30 18",
    ],
  },
  cups: {
    id: "cups",
    paths: [
      "M14 12 Q14 30 24 34 Q34 30 34 12",
      "M14 12 L34 12",
      "M20 34 L28 34",
      "M24 34 L24 40",
      "M18 40 L30 40",
    ],
  },
  swords: {
    id: "swords",
    paths: [
      "M24 4 L24 40",
      "M18 14 L30 14",
      "M22 14 L22 20 L26 20 L26 14",
    ],
  },
  pentacles: {
    id: "pentacles",
    paths: [
      "M24 4 A20 20 0 1 0 24 44 A20 20 0 1 0 24 4",
      "M24 8 L28 20 L38 20 L30 28 L33 40 L24 32 L15 40 L18 28 L10 20 L20 20 Z",
    ],
  },
};
