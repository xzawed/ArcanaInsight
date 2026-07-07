import { CARD_SKINS_BUCKET } from "@/lib/supabase/storage"
import { getDbProvider } from "@/lib/env"

const BUCKET = CARD_SKINS_BUCKET

/**
 * 카드 스킨 이미지의 베이스 URL을 결정한다 (card-style.ts storageBase와 동일 토글).
 *   1) NEXT_PUBLIC_ASSET_BASE_URL(예: https://cdn.xzawed.xyz) 설정 시 R2/CDN 우선.
 *   2) postgres(self-host) 모드 → 로컬 public 폴백(/images/skins).
 *   3) supabase 모드 → Supabase Storage public(폴백, env 미설정 시).
 * env 토글만으로 R2↔Supabase 즉시 전환/롤백 가능.
 * 설계: docs/superpowers/plans/2026-06-26-supabase-storage-r2-migration.md(card-styles 선례)
 */
function skinBase(): string {
  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL
  if (assetBase) {
    // 끝 슬래시 정규화(이중 슬래시 방지). 정규식 백트래킹 회피 위해 문자열 API 사용.
    const base = assetBase.endsWith("/") ? assetBase.slice(0, -1) : assetBase
    return `${base}/${BUCKET}`
  }
  if (getDbProvider() === "postgres") return "/images/skins"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  return `${url}/storage/v1/object/public/${BUCKET}`
}

export function getCardImageUrl(skinId: string, cardId: string): string {
  return `${skinBase()}/${skinId}/front/${cardId}.png`
}

export function getCardBackUrl(skinId: string): string {
  return `${skinBase()}/${skinId}/back.png`
}

/**
 * 썸네일 URL. 과거 Supabase 변환 파라미터(?width=&height=&resize=)는 object/public·R2·로컬
 * 어느 경로에서도 무시되어 실제로는 원본이 서빙됐다 → 파라미터를 제거하고 원본 URL을 반환한다.
 */
export function getCardThumbnailUrl(skinId: string, cardId: string): string {
  return getCardImageUrl(skinId, cardId)
}
