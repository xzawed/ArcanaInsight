export const CHARACTER_IDS = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
] as const;

export type CharacterId = typeof CHARACTER_IDS[number];

export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";
export type Gender = "female" | "male";
export type GenderFilter = "female" | "male" | "all";
export type ParticleStyle = "sparkle" | "flame" | "petal" | "star" | "snowflake" | "lightning" | "bubble" | "rune";
export type IdleAnimationType = "float" | "float-strong" | "bounce" | "breathe";

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
  expressions: Record<Mood, string>;
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
