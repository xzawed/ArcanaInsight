export const CHARACTER_IDS = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
] as const;

export type CharacterId = typeof CHARACTER_IDS[number];

/**
 * 캐릭터의 **논리 표정 상태**. 6종이며 `idle`은 여기에 없다.
 *
 * `idle`은 표정이 아니라 `default` 표정이 저장된 **파일 이름**이다
 * (`SpriteAnimator`의 `MOOD_TO_FILE`이 `default → "idle"`로 매핑한다).
 * 파일 이름을 다루는 자리에는 이 타입이 아니라 `CharacterImageFileStem`을 쓴다.
 */
export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";

/**
 * 디스크·R2에 존재하는 캐릭터 이미지 **파일 stem**(확장자 없는 이름).
 *
 * `Mood`와 1:1이 아니다 — 상태 `default`는 파일 `idle`로 저장된다.
 * 레거시 `default` stem은 **R-4로 제거됐다**(2026-08-01). 12명 전원 `idle`과 바이트 동일한
 * 중복이었고 로컬 72파일·R2 동일 키를 삭제했다. 이 타입에서도 빼서 **존재하지 않는 파일을
 * 가리키는 URL이 컴파일 단계에서 막히도록** 한다 — 파일은 없는데 타입만 허용하면 그 조합이
 * 그대로 404가 되고, 그것이 이 타입을 만든 이유(인자가 `string`이던 시절의 드리프트)와 같은 병이다.
 */
export type CharacterImageFileStem =
  | "idle"
  | "smile"
  | "serious"
  | "surprised"
  | "wink"
  | "mystical";
export type Gender = "female" | "male";
export type GenderFilter = "female" | "male" | "all";
export type ParticleStyle = "sparkle" | "flame" | "petal" | "star" | "snowflake" | "lightning" | "bubble" | "rune";
export type IdleAnimationType = "float" | "float-strong" | "bounce" | "breathe" | "drift";

export interface EffectTheme {
  primary: string;
  secondary: string;
  accent: string;
  particleStyle: ParticleStyle;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  nameJp: string;
  gender: Gender;
  greeting: string;
  greetingEn?: string;
  greetingJa?: string;
  idleAnimation: IdleAnimationType;
  personality: string;
  description: string;
  descriptionEn?: string;
  descriptionJa?: string;
  speciality: string;
  specialityEn?: string;
  specialityJa?: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
  effectTheme: EffectTheme;
}
