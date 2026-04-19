const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const CARD_SKINS_BUCKET = "card-skins";
const BUCKET_NAME = CARD_SKINS_BUCKET;

function getStorageBaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;
}

export function getCardImageUrl(skinId: string, cardId: string): string {
  return `${getStorageBaseUrl()}/${skinId}/front/${cardId}.png`;
}

export function getCardBackUrl(skinId: string): string {
  return `${getStorageBaseUrl()}/${skinId}/back.png`;
}

export function getCardThumbnailUrl(
  skinId: string,
  cardId: string,
  width: number = 200,
  height: number = 320
): string {
  return `${getStorageBaseUrl()}/${skinId}/front/${cardId}.png?width=${width}&height=${height}&resize=contain`;
}
