export interface CardSkin {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    background: string;
  };
  sampleCards: string[];
}

export const cardSkins: CardSkin[] = [
  {
    id: "gold-luxury",
    name: "Gold Luxury",
    nameKo: "골드 럭셔리",
    description: "미드나잇 블루와 금박의 최고급 아르데코 타로",
    palette: {
      primary: "#d4af37",
      secondary: "#1a1a3e",
      background: "#08081a",
    },
    sampleCards: ["major-00", "major-02", "major-17", "major-21"],
  },
  {
    id: "dark-gothic",
    name: "Dark Gothic",
    nameKo: "다크 고딕",
    description: "핏빛 악센트의 어둡고 강렬한 중세 오컬트",
    palette: {
      primary: "#8b3030",
      secondary: "#1a0a14",
      background: "#0a0408",
    },
    sampleCards: ["major-13", "major-15", "major-16", "major-18"],
  },
  {
    id: "celestial-mystic",
    name: "Celestial Mystic",
    nameKo: "셀레스티얼 미스틱",
    description: "별자리와 달빛의 고요한 천상 세계",
    palette: {
      primary: "#6880cc",
      secondary: "#162454",
      background: "#0a1228",
    },
    sampleCards: ["major-02", "major-17", "major-18", "major-21"],
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    nameKo: "파스텔 드림",
    description: "수채화처럼 번지는 몽환적 라벤더 세계",
    palette: {
      primary: "#b898e0",
      secondary: "#efe4ff",
      background: "#f5eeff",
    },
    sampleCards: ["major-00", "major-03", "major-17", "major-19"],
  },
  {
    id: "neon-cyberpunk",
    name: "Neon Cyberpunk",
    nameKo: "네온 사이버펑크",
    description: "홀로그램 회로와 네온의 미래적 디지털 오라클",
    palette: {
      primary: "#00ffff",
      secondary: "#ff00ff",
      background: "#05050f",
    },
    sampleCards: ["major-01", "major-07", "major-10", "major-16"],
  },
  {
    id: "emerald-enchant",
    name: "Emerald Enchant",
    nameKo: "에메랄드 인챈트",
    description: "에메랄드 보석과 숲의 자연 마법",
    palette: {
      primary: "#3a9a70",
      secondary: "#1a5040",
      background: "#040d0a",
    },
    sampleCards: ["major-02", "major-03", "major-08", "major-14"],
  },
];

export const DEFAULT_SKIN_ID = "gold-luxury";

export function getSkinById(id: string): CardSkin | undefined {
  return cardSkins.find((s) => s.id === id);
}
