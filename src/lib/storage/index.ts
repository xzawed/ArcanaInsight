const BUCKET = "card-skins"

function supabaseBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  return `${url}/storage/v1/object/public/${BUCKET}`
}

export function getCardImageUrl(skinId: string, cardId: string): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/front/${cardId}.png`
  }
  return `${supabaseBase()}/${skinId}/front/${cardId}.png`
}

export function getCardBackUrl(skinId: string): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/back.png`
  }
  return `${supabaseBase()}/${skinId}/back.png`
}

export function getCardThumbnailUrl(
  skinId: string,
  cardId: string,
  width = 200,
  height = 320
): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/front/${cardId}.png`
  }
  return `${supabaseBase()}/${skinId}/front/${cardId}.png?width=${width}&height=${height}&resize=contain`
}
