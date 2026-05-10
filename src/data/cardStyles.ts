// src/data/cardStyles.ts
export type CardStyleId = 'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital';

export interface CardStyle {
  id: CardStyleId;
  name: string;
  nameKo: string;
  nameJa?: string;
  description: string;
  descriptionEn?: string;
  descriptionJa?: string;
  /** 스타일 선택 UI 미리보기용 카드 ID */
  previewCards: string[];
}

export const cardStyles: CardStyle[] = [
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy',
    nameKo: '다크 판타지',
    nameJa: 'ダークファンタジー',
    description: '어둠의 마법과 고딕 판타지가 어우러진 신비로운 세계',
    descriptionEn: 'A mysterious world where dark magic meets gothic fantasy',
    descriptionJa: '闇の魔法とゴシックファンタジーが融合した神秘の世界',
    previewCards: ['major-13', 'major-15', 'major-16', 'major-18'],
  },
  {
    id: 'art-nouveau',
    name: 'Art Nouveau',
    nameKo: '아르누보',
    nameJa: 'アール・ヌーヴォー',
    description: '자연의 곡선과 금빛 장식이 어우러진 세기말 예술 양식',
    descriptionEn: 'Fin-de-siècle art style with flowing natural curves and golden ornaments',
    descriptionJa: '自然の曲線と金の装飾が織りなす世紀末芸術様式',
    previewCards: ['major-02', 'major-03', 'major-17', 'major-21'],
  },
  {
    id: 'anime-mystical',
    name: 'Anime Mystical',
    nameKo: '애니메 미스티컬',
    nameJa: 'アニメ・ミスティカル',
    description: '일본 애니메이션 스타일의 생동감 넘치는 신비로운 타로',
    descriptionEn: 'Vivid and mystical tarot in Japanese anime illustration style',
    descriptionJa: '日本アニメスタイルの生き生きとした神秘的なタロット',
    previewCards: ['major-00', 'major-01', 'major-19', 'major-20'],
  },
  {
    id: 'modern-digital',
    name: 'Modern Digital',
    nameKo: '모던 디지털',
    nameJa: 'モダン・デジタル',
    description: '홀로그램과 디지털 아트가 결합된 미래적 타로 비전',
    descriptionEn: 'Futuristic tarot vision combining holographic and digital art',
    descriptionJa: 'ホログラムとデジタルアートが融合した未来的タロットビジョン',
    previewCards: ['major-01', 'major-07', 'major-10', 'major-16'],
  },
];

export const DEFAULT_STYLE_ID: CardStyleId = 'dark-fantasy';

/** 테마 ID → 카드 스타일 ID 자동 매핑 */
export const THEME_TO_STYLE_MAP: Record<string, CardStyleId> = {
  midnight: 'dark-fantasy',
  dawn: 'art-nouveau',
  sunset: 'modern-digital',
  spring: 'anime-mystical',
  summer: 'anime-mystical',
  autumn: 'dark-fantasy',
  winter: 'art-nouveau',
};

export function getStyleById(id: string): CardStyle | undefined {
  return cardStyles.find((s) => s.id === id);
}

export function getStyleName(style: CardStyle, locale: string): string {
  if (locale === 'en') return style.name;
  if (locale === 'ja' && style.nameJa) return style.nameJa;
  return style.nameKo;
}

export function getStyleDescription(style: CardStyle, locale: string): string {
  if (locale === 'en' && style.descriptionEn) return style.descriptionEn;
  if (locale === 'ja' && style.descriptionJa) return style.descriptionJa;
  return style.description;
}
