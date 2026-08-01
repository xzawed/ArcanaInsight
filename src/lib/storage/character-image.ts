import type { CharacterImageFileStem } from "@/types/character";

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
 * @param fileName    **파일 stem**이지 `Mood`가 아니다. 상태 `default`의 파일명은 `idle`이며,
 *                    변환은 `SpriteAnimator`의 `MOOD_TO_FILE`이 담당한다.
 */
export function getCharacterImageUrl(characterId: string, fileName: CharacterImageFileStem): string {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (base) {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${b}/characters/${characterId}/nukki-enhanced/${fileName}.png`;
  }
  return `/images/characters/${characterId}/nukki-enhanced/${fileName}.png`;
}

/**
 * 사전 생성 변형의 폭 사다리 — **정본은 여기 하나다.**
 *
 * 이전에는 이 배열이 `scripts/generate-assets/generate-character-variants.ts`에도 똑같이
 * 복제돼 있었고, 지킴 장치는 "반드시 일치해야 한다"는 주석뿐이었다. 한쪽만 바꾸면
 * 생성되지 않은 폭을 앱이 요청하게 되고, 로더에 폴백이 없어 **조용히 404**가 된다.
 * 이제 생성 스크립트와 `scripts/check-character-image-budget.ts`가 이 값을 import한다.
 */
export const CHARACTER_VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;

/**
 * 사전 생성 변형 사용 여부.
 *
 * 기본은 꺼짐이다. 변형이 R2에 올라가기 전에 켜면 프로덕션 이미지가 전량 404가 되므로,
 * **업로드가 끝난 환경에서만** 켠다. 로컬·CI는 변형이 저장소에 함께 커밋돼 있어 바로 켤 수 있다.
 * 롤백은 이 env 하나를 끄면 끝난다(마스터 PNG 경로는 그대로 살아 있다).
 */
export const CHARACTER_VARIANTS_ENABLED = process.env.NEXT_PUBLIC_CHARACTER_VARIANTS === "1";

/**
 * `next/image` 커스텀 로더 — 런타임 최적화를 **건너뛰고** 사전 생성 WebP를 직접 가리킨다.
 *
 * ## 왜 필요한가 (#521)
 *
 * 마스터는 2816×1536·약 4.8MB PNG다. `next/image` 기본 경로는 요청 폭마다 이 원본을
 * 디코드(≈16.5MiB 비트맵)하는데, 홈에 12장이 깔리면 **이미지 최적화 큐가 포화되어 32px
 * 내비 아이콘까지 굶는다.** App Router는 새 트리 커밋까지 이전 URL을 유지하므로 사용자에게는
 * 홈 탭을 눌러도 URL조차 바뀌지 않는 무응답으로 보인다(2026-08-01 CI trace 실측).
 *
 * 로더가 반환한 URL은 Next가 그대로 사용한다 — 서버 측 디코드·리사이즈가 아예 일어나지 않는다.
 */
export function characterImageLoader({ src, width }: { src: string; width: number }): string {
  const target =
    CHARACTER_VARIANT_WIDTHS.find((w) => w >= width) ??
    CHARACTER_VARIANT_WIDTHS[CHARACTER_VARIANT_WIDTHS.length - 1];
  return src.replace(/\.png$/, `-${target}.webp`);
}

/** 변형이 켜져 있을 때만 로더를 붙인다. 꺼져 있으면 기존 동작(런타임 최적화) 그대로. */
export const characterImageLoaderProp = CHARACTER_VARIANTS_ENABLED
  ? { loader: characterImageLoader }
  : {};
