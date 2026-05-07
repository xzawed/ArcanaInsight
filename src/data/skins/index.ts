export interface CardSkin {
  id: string;
  name: string;
  nameKo: string;
  /** 일본어 카드 스킨명 (옵션 — 미지정 시 nameKo 사용). */
  nameJa?: string;
  /** 한국어 설명 (기본). 영어/일본어는 별도 필드로. */
  description: string;
  descriptionEn?: string;
  descriptionJa?: string;
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
    nameJa: "ゴールドラグジュアリー",
    description: "미드나잇 블루와 금박의 최고급 아르데코 타로",
    descriptionEn: "Midnight blue and gold leaf — premium Art Deco tarot",
    descriptionJa: "ミッドナイトブルーと金箔の最高級アール・デコ・タロット",
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
    nameJa: "ダークゴシック",
    description: "핏빛 악센트의 어둡고 강렬한 중세 오컬트",
    descriptionEn: "Blood-red accents in a dark, intense medieval occult style",
    descriptionJa: "血の赤を効かせた闇の中世オカルト",
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
    nameJa: "セレスティアル・ミスティック",
    description: "별자리와 달빛의 고요한 천상 세계",
    descriptionEn: "A serene celestial realm of constellations and moonlight",
    descriptionJa: "星座と月光の静謐な天上の世界",
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
    nameJa: "パステルドリーム",
    description: "수채화처럼 번지는 몽환적 라벤더 세계",
    descriptionEn: "A dreamy lavender world that bleeds like watercolor",
    descriptionJa: "水彩画のように滲む夢幻のラベンダーワールド",
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
    nameJa: "ネオンサイバーパンク",
    description: "홀로그램 회로와 네온의 미래적 디지털 오라클",
    descriptionEn: "A futuristic digital oracle of holographic circuits and neon",
    descriptionJa: "ホログラム回路とネオンが織りなす未来的デジタル神託",
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
    nameJa: "エメラルドエンチャント",
    description: "에메랄드 보석과 숲의 자연 마법",
    descriptionEn: "Natural magic of emerald gems and forest depths",
    descriptionJa: "エメラルドの宝石と森の自然魔法",
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

// ─── locale 헬퍼 ─────────────────────────────────────────────────────────────

/** 카드 스킨 이름 — locale별 (en: name 필드 / ja: nameJa / ko: nameKo). */
export function getSkinName(skin: CardSkin, locale: string): string {
  if (locale === "en") return skin.name;
  if (locale === "ja" && skin.nameJa) return skin.nameJa;
  return skin.nameKo;
}

/** 카드 스킨 설명 — locale별. en/ja 미설정 시 ko description 사용. */
export function getSkinDescription(skin: CardSkin, locale: string): string {
  if (locale === "en" && skin.descriptionEn) return skin.descriptionEn;
  if (locale === "ja" && skin.descriptionJa) return skin.descriptionJa;
  return skin.description;
}
