import type { CardStyleId } from '@/data/cardStyles';
import type { ThemeId } from '@/hooks/useTheme';

const BUCKET = 'card-styles';

type ServiceType = 'tarot' | 'saju' | 'shinjeom';

function storageBase(): string {
  // NEXT_PUBLIC_ASSET_BASE_URL(예: https://cdn.xzawed.xyz) 설정 시 R2/CDN 우선 사용,
  // 미설정 시 Supabase Storage로 폴백한다. env 토글만으로 즉시 롤백 가능.
  // 설계: docs/superpowers/plans/2026-06-26-supabase-storage-r2-migration.md
  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (assetBase) {
    // 끝 슬래시 정규화(이중 슬래시 방지). 정규식 백트래킹 회피 위해 문자열 API 사용.
    const base = assetBase.endsWith('/') ? assetBase.slice(0, -1) : assetBase;
    return `${base}/${BUCKET}`;
  }
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
  return `${storageBase()}/cards/${styleId}/card-back.webp`;
}

export function getServiceBackgroundUrl(service: ServiceType, theme: ThemeId): string {
  return `${storageBase()}/backgrounds/${service}/${theme}.png`;
}
