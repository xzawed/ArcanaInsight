import type { CardStyleId, Suit } from './config';
import { MAJOR_ARCANA_NAMES, SUIT_RANK_NAMES } from './config';

const NEGATIVE_SUFFIX = ', no text, no letters, no watermarks, no signatures, no borders';

const STYLE_BASE_PROMPTS: Record<CardStyleId, string> = {
  'dark-fantasy':
    'dark gothic fantasy illustration, oil painting style, dramatic lighting, deep shadows, rich textures, dark purple and crimson palette, mysterious atmosphere, highly detailed fantasy art',
  'art-nouveau':
    'art nouveau illustration style, elegant flowing lines, botanical decorative elements, gold and ivory palette, ornate borders, Gustav Klimt inspired, fin-de-siecle aesthetic, detailed linework',
  'anime-mystical':
    'Japanese anime illustration style, vibrant colors, magical atmosphere, detailed character art, cel shading, mystical sparkles and light effects, pastel and jewel tones, Studio Ghibli inspired',
  'modern-digital':
    'modern digital art, holographic effects, neon accents, futuristic aesthetic, clean geometric shapes, glitch art elements, cyberpunk inspired, high contrast, electric blues and magentas',
};

function getSuitSubjectPrefix(suit: 'major' | Suit): string {
  switch (suit) {
    case 'major': return '';
    case 'cups': return 'water, chalice, emotions, intuition,';
    case 'wands': return 'fire, wooden staff, passion, creativity,';
    case 'swords': return 'air, sword, intellect, conflict,';
    case 'pentacles': return 'earth, pentacle coin, material wealth, nature,';
  }
}

export function buildCardPrompt(
  styleId: CardStyleId,
  suit: 'major' | Suit,
  number: string,
  cardName: string
): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  const suitPrefix = getSuitSubjectPrefix(suit);
  const subject = `tarot card "${cardName}", ${suitPrefix} symbolic tarot imagery`;
  return `${base}, ${subject}, tarot card illustration, portrait orientation${NEGATIVE_SUFFIX}`;
}

export function buildBackPrompt(styleId: CardStyleId): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  return `${base}, tarot card back design, symmetrical mandala pattern, mystical geometric ornament, no face cards, abstract decorative pattern, portrait orientation${NEGATIVE_SUFFIX}`;
}

export function buildBackgroundPrompt(
  service: 'tarot' | 'saju' | 'shinjeom',
  theme: string
): string {
  const serviceDescriptions: Record<string, string> = {
    tarot: 'mystical tarot reading room, tarot cards on dark velvet',
    saju: 'Korean fortune telling, zodiac symbols, traditional celestial map',
    shinjeom: 'shamanic divination altar, spirit artifacts, sacred ritual space',
  };

  const themeDescriptions: Record<string, string> = {
    midnight: 'deep midnight blue, stars, moonlight, dark mystical atmosphere',
    dawn: 'purple predawn sky, gentle glow, misty morning, soft lavender tones',
    sunset: 'warm amber and orange sunset, golden hour light, dusk atmosphere',
    spring: 'cherry blossoms, soft pink and green, gentle spring breeze',
    summer: 'vivid blue sky, summer stars, electric atmosphere, warm deep night',
    autumn: 'fallen red and orange leaves, autumn mist, warm earth tones',
    winter: 'frozen landscape, moonlit snow, cold blue and white tones',
  };

  const serviceDesc = serviceDescriptions[service] ?? 'fortune telling space';
  const themeDesc = themeDescriptions[theme] ?? 'mystical atmosphere';

  return `wide landscape background illustration, ${serviceDesc}, ${themeDesc}, no characters, no people, atmospheric depth, cinematic composition, landscape orientation${NEGATIVE_SUFFIX}`;
}

export function buildDecoPrompt(styleId: CardStyleId): string {
  const base = STYLE_BASE_PROMPTS[styleId];
  return `${base}, decorative ornamental element, tarot deck box cover design, intricate mandala, mystical symbol cluster, square composition, transparent background if possible${NEGATIVE_SUFFIX}`;
}

export function getCardNameForPrompt(suit: 'major' | Suit, numberStr: string): string {
  const num = parseInt(numberStr, 10);
  if (suit === 'major') {
    return MAJOR_ARCANA_NAMES[num] ?? `Major Arcana ${num}`;
  }
  const rankName = SUIT_RANK_NAMES[num] ?? String(num);
  const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
  return num === 1 ? `Ace of ${suitName}` : `${rankName} of ${suitName}`;
}
