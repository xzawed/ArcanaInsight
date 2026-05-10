export const REPLICATE_MODEL = 'black-forest-labs/flux-1.1-pro-ultra';
export const CONCURRENT_JOBS = 1;
export const OUTPUT_FORMAT = 'png' as const;
export const OUTPUT_BASE_DIR = 'public/images/cards';
export const BACKGROUNDS_DIR = 'public/images/backgrounds';
export const BACKUP_DIR = `public/images/backup/${new Date().toISOString().slice(0, 10)}`;

export type CardStyleId = 'dark-fantasy' | 'art-nouveau' | 'anime-mystical' | 'modern-digital';

export const STYLE_IDS: CardStyleId[] = [
  'dark-fantasy',
  'art-nouveau',
  'anime-mystical',
  'modern-digital',
];

export const MAJOR_ARCANA_NAMES: Record<number, string> = {
  0: 'The Fool',
  1: 'The Magician',
  2: 'The High Priestess',
  3: 'The Empress',
  4: 'The Emperor',
  5: 'The Hierophant',
  6: 'The Lovers',
  7: 'The Chariot',
  8: 'Strength',
  9: 'The Hermit',
  10: 'The Wheel of Fortune',
  11: 'Justice',
  12: 'The Hanged Man',
  13: 'Death',
  14: 'Temperance',
  15: 'The Devil',
  16: 'The Tower',
  17: 'The Star',
  18: 'The Moon',
  19: 'The Sun',
  20: 'Judgement',
  21: 'The World',
};

export const SUIT_RANK_NAMES: Record<number, string> = {
  1: 'Ace',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Page',
  12: 'Knight',
  13: 'Queen',
  14: 'King',
};

export const SUITS = ['cups', 'wands', 'swords', 'pentacles'] as const;
export type Suit = typeof SUITS[number];

export interface CardTarget {
  styleId: CardStyleId;
  suit: 'major' | Suit;
  number: string;
  cardName: string;
  outputPath: string;
}

export interface BackgroundTarget {
  service: 'tarot' | 'saju' | 'shinjeom';
  theme: string;
  outputPath: string;
}

export interface DecoTarget {
  styleId: CardStyleId;
  outputPath: string;
}
