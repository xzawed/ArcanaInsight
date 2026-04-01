export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";
export type Gender = "female" | "male";
export type GenderFilter = "female" | "male" | "all";
export type ParticleStyle = "sparkle" | "flame" | "petal" | "star" | "snowflake" | "lightning" | "bubble" | "rune";

export interface EffectTheme {
  primary: string;
  secondary: string;
  accent: string;
  particleStyle: ParticleStyle;
}

export interface CharacterConfig {
  id: string;
  name: string;
  nameJp: string;
  gender: Gender;
  greeting: string;
  expressions: Record<Mood, string>;
  idleAnimation: string;
  personality: string;
  description: string;
  speciality: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
  effectTheme: EffectTheme;
}
