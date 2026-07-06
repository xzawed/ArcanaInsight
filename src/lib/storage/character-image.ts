/**
 * 캐릭터 이미지(nukki-enhanced) URL 생성.
 *
 * NEXT_PUBLIC_ASSET_BASE_URL(예: https://cdn.xzawed.xyz) 설정 시 R2/CDN을 사용하고,
 * 미설정 시 로컬 public 폴백(`/images/characters/...`)을 사용한다. 카드 자산(card-style.ts)과
 * 동일한 env 토글 패턴 — env만으로 즉시 롤백 가능.
 *
 * 배포 이미지는 `.dockerignore`로 `public/images/characters`를 제외하므로 프로덕션은 R2를 사용한다
 * (프로덕션 env에 NEXT_PUBLIC_ASSET_BASE_URL이 설정되어 있어야 한다 — 카드 자산과 동일 전제).
 * 로컬 개발·CI는 env 미설정 시 repo의 public 폴더에서 서빙한다.
 *
 * @param characterId 캐릭터 id (예: "arcana")
 * @param fileName    확장자 없는 파일명 (예: "idle", "default", "smile", "mystical")
 */
export function getCharacterImageUrl(characterId: string, fileName: string): string {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (base) {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${b}/characters/${characterId}/nukki-enhanced/${fileName}.png`;
  }
  return `/images/characters/${characterId}/nukki-enhanced/${fileName}.png`;
}
