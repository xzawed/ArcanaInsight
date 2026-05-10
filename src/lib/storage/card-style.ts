import type { CardStyleId } from '@/data/cardStyles';

interface ParsedCardId {
  suit: string;
  number: string;
}

/**
 * 타로 카드 ID를 suit과 number로 파싱한다.
 * "major-00" → { suit: "major", number: "00" }
 * "cups-01"  → { suit: "cups", number: "01" }
 */
function parseCardId(cardId: string): ParsedCardId {
  const parts = cardId.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid cardId format: "${cardId}". Expected "suit-number".`);
  }
  return { suit: parts[0], number: parts[1] };
}

/**
 * 카드 스타일 이미지 URL을 반환한다.
 * 경로: /images/cards/[styleId]/[suit]/[number].png
 */
export function getCardStyleImageUrl(styleId: CardStyleId, cardId: string): string {
  const { suit, number } = parseCardId(cardId);
  return `/images/cards/${styleId}/${suit}/${number}.png`;
}

/**
 * 카드 뒷면 스타일 이미지 URL을 반환한다.
 * 경로: /images/cards/[styleId]/card-back.png
 */
export function getCardStyleBackUrl(styleId: CardStyleId): string {
  return `/images/cards/${styleId}/card-back.png`;
}
