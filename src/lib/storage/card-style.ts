import type { CardStyleId } from '@/data/cardStyles';

const BUCKET = 'card-styles';

type ServiceType = 'tarot' | 'saju' | 'shinjeom';

function storageBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return `${url}/storage/v1/object/public/${BUCKET}`;
}

interface ParsedCardId {
  suit: string;
  number: string;
}

function parseCardId(cardId: string): ParsedCardId {
  const parts = cardId.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid cardId format: "${cardId}". Expected "suit-number".`);
  }
  return { suit: parts[0], number: parts[1] };
}

export function getCardStyleImageUrl(styleId: CardStyleId, cardId: string): string {
  const { suit, number } = parseCardId(cardId);
  return `${storageBase()}/cards/${styleId}/${suit}/${number}.png`;
}

export function getCardStyleBackUrl(styleId: CardStyleId): string {
  return `${storageBase()}/cards/${styleId}/card-back.png`;
}

export function getServiceBackgroundUrl(service: ServiceType, theme: string): string {
  return `${storageBase()}/backgrounds/${service}/${theme}.png`;
}
