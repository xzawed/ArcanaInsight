import type { ThemeId } from "@/hooks/useTheme";

type DriftParticleKind =
  | "star" | "mist" | "dust" | "petal" | "firefly" | "leaf" | "snow" | "ember"
  | "rune" | "meteor" | "butterfly" | "hexagon" | "sparkle" | "lantern" | "snowflake";

export interface AtmosphereParticle {
  readonly id: string;
  readonly kind: DriftParticleKind;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly opacity: number;
  readonly delay: number;
  readonly duration: number;
  readonly color?: string;
  readonly rotate?: number;
  readonly text?: string;
}

export interface AtmosphereLine {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly opacity: number;
}

export interface AtmosphereRibbon {
  readonly id: string;
  readonly path: string;
  readonly color: string;
  readonly opacity: number;
  readonly delay: number;
  readonly duration: number;
}

export interface AtmosphereRay {
  readonly id: string;
  readonly left: number;
  readonly width: number;
  readonly rotate: number;
  readonly opacity: number;
  readonly color: string;
  readonly delay: number;
}

export interface ThemeAtmosphereConfig {
  readonly baseGlow: string;
  readonly texture?: string;
  readonly particles: readonly AtmosphereParticle[];
  readonly lines?: readonly AtmosphereLine[];
  readonly ribbons?: readonly AtmosphereRibbon[];
  readonly rays?: readonly AtmosphereRay[];
}

// ── midnight ───────────────────────────────────────────────────────────────

const STAR_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "m-star-1",  kind: "star", x: 9,  y: 14, size: 2,   opacity: 0.76, delay: 0.1, duration: 3.6 },
  { id: "m-star-2",  kind: "star", x: 19, y: 24, size: 1.4, opacity: 0.56, delay: 0.8, duration: 4.2 },
  { id: "m-star-3",  kind: "star", x: 31, y: 11, size: 2.8, opacity: 0.72, delay: 1.2, duration: 5 },
  { id: "m-star-4",  kind: "star", x: 49, y: 19, size: 1.8, opacity: 0.62, delay: 0.4, duration: 3.8 },
  { id: "m-star-5",  kind: "star", x: 66, y: 10, size: 2.2, opacity: 0.7,  delay: 1.6, duration: 4.8 },
  { id: "m-star-6",  kind: "star", x: 84, y: 23, size: 1.6, opacity: 0.6,  delay: 0.6, duration: 3.4 },
  { id: "m-star-7",  kind: "star", x: 91, y: 44, size: 2.4, opacity: 0.64, delay: 1.1, duration: 4.6 },
  { id: "m-star-8",  kind: "star", x: 14, y: 68, size: 1.5, opacity: 0.48, delay: 0.2, duration: 4.4 },
  { id: "m-star-9",  kind: "star", x: 72, y: 74, size: 1.7, opacity: 0.5,  delay: 1.9, duration: 5.4 },
  { id: "m-star-10", kind: "star", x: 26, y: 42, size: 1.9, opacity: 0.54, delay: 2.3, duration: 4.2 },
  { id: "m-star-11", kind: "star", x: 43, y: 62, size: 1.6, opacity: 0.48, delay: 0.9, duration: 3.8 },
  { id: "m-star-12", kind: "star", x: 58, y: 34, size: 2.1, opacity: 0.58, delay: 1.7, duration: 5.2 },
  { id: "m-star-13", kind: "star", x: 76, y: 52, size: 1.8, opacity: 0.5,  delay: 3.4, duration: 4.6 },
  { id: "m-star-14", kind: "star", x: 12, y: 82, size: 2.3, opacity: 0.52, delay: 0.4, duration: 5.8 },
];

const RUNE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "m-rune-1", kind: "rune", x: 6,  y: 30, size: 14, opacity: 0.22, delay: 0,   duration: 8,    text: "✦" },
  { id: "m-rune-2", kind: "rune", x: 27, y: 55, size: 12, opacity: 0.18, delay: 2.4, duration: 9,    text: "◈" },
  { id: "m-rune-3", kind: "rune", x: 58, y: 38, size: 16, opacity: 0.2,  delay: 1.1, duration: 10,   text: "⊕" },
  { id: "m-rune-4", kind: "rune", x: 78, y: 60, size: 13, opacity: 0.18, delay: 3.2, duration: 8.5,  text: "❋" },
  { id: "m-rune-5", kind: "rune", x: 92, y: 32, size: 14, opacity: 0.2,  delay: 0.8, duration: 9.5,  text: "✦" },
  { id: "m-rune-6", kind: "rune", x: 44, y: 72, size: 11, opacity: 0.16, delay: 4.1, duration: 11,   text: "◈" },
];

const METEOR_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "m-meteor-1", kind: "meteor", x: 12, y: 8,  size: 6, opacity: 0.54, delay: 0,   duration: 4.5, rotate: 45 },
  { id: "m-meteor-2", kind: "meteor", x: 52, y: 14, size: 5, opacity: 0.46, delay: 2.8, duration: 5,   rotate: 42 },
  { id: "m-meteor-3", kind: "meteor", x: 74, y: 6,  size: 4, opacity: 0.38, delay: 5.5, duration: 4.8, rotate: 48 },
];

// ── dawn ──────────────────────────────────────────────────────────────────

const MIST_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "d-mist-1", kind: "mist", x: 11, y: 62, size: 34, opacity: 0.2,  delay: 0,   duration: 8,  color: "rgba(248,187,217,0.34)" },
  { id: "d-mist-2", kind: "mist", x: 33, y: 72, size: 42, opacity: 0.18, delay: 1.5, duration: 10, color: "rgba(147,197,253,0.28)" },
  { id: "d-mist-3", kind: "mist", x: 64, y: 58, size: 38, opacity: 0.2,  delay: 0.8, duration: 9,  color: "rgba(251,191,36,0.18)" },
  { id: "d-mist-4", kind: "mist", x: 84, y: 76, size: 46, opacity: 0.16, delay: 2.2, duration: 11, color: "rgba(192,132,252,0.28)" },
  { id: "d-mist-5", kind: "mist", x: 48, y: 44, size: 36, opacity: 0.16, delay: 3.1, duration: 12, color: "rgba(248,187,217,0.24)" },
  { id: "d-mist-6", kind: "mist", x: 72, y: 82, size: 40, opacity: 0.14, delay: 1.8, duration: 13, color: "rgba(167,243,208,0.18)" },
];

const SPARKLE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "d-sparkle-1", kind: "sparkle", x: 14, y: 26, size: 8, opacity: 0.52, delay: 0,   duration: 3.2, text: "✦" },
  { id: "d-sparkle-2", kind: "sparkle", x: 38, y: 48, size: 6, opacity: 0.44, delay: 1.1, duration: 2.8, text: "✧" },
  { id: "d-sparkle-3", kind: "sparkle", x: 61, y: 22, size: 9, opacity: 0.5,  delay: 0.6, duration: 3.5, text: "✦" },
  { id: "d-sparkle-4", kind: "sparkle", x: 82, y: 44, size: 7, opacity: 0.46, delay: 2,   duration: 3,   text: "✧" },
  { id: "d-sparkle-5", kind: "sparkle", x: 26, y: 68, size: 7, opacity: 0.42, delay: 1.7, duration: 4,   text: "✦" },
];

const DAWN_BUTTERFLY_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "d-butterfly-1", kind: "butterfly", x: 18, y: 42, size: 10, opacity: 0.36, delay: 0,   duration: 8,  rotate: 12 },
  { id: "d-butterfly-2", kind: "butterfly", x: 44, y: 62, size: 8,  opacity: 0.3,  delay: 2.1, duration: 9,  rotate: -8 },
  { id: "d-butterfly-3", kind: "butterfly", x: 72, y: 34, size: 9,  opacity: 0.34, delay: 1.4, duration: 10, rotate: 18 },
];

// ── sunset ────────────────────────────────────────────────────────────────

const DUST_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "s-dust-1", kind: "dust", x: 12, y: 40, size: 2,   opacity: 0.36, delay: 0.1, duration: 7 },
  { id: "s-dust-2", kind: "dust", x: 24, y: 61, size: 1.4, opacity: 0.3,  delay: 1.3, duration: 8 },
  { id: "s-dust-3", kind: "dust", x: 38, y: 28, size: 2.2, opacity: 0.34, delay: 0.7, duration: 6.5 },
  { id: "s-dust-4", kind: "dust", x: 52, y: 52, size: 1.6, opacity: 0.32, delay: 2.1, duration: 7.8 },
  { id: "s-dust-5", kind: "dust", x: 70, y: 34, size: 2.4, opacity: 0.34, delay: 1.6, duration: 8.4 },
  { id: "s-dust-6", kind: "dust", x: 83, y: 66, size: 1.8, opacity: 0.3,  delay: 0.4, duration: 7.2 },
  { id: "s-dust-7", kind: "dust", x: 91, y: 43, size: 2,   opacity: 0.32, delay: 2.6, duration: 9 },
  { id: "s-dust-8", kind: "dust", x: 6,  y: 58, size: 2.2, opacity: 0.3,  delay: 3.4, duration: 8.6 },
  { id: "s-dust-9", kind: "dust", x: 62, y: 74, size: 1.6, opacity: 0.28, delay: 1.9, duration: 7.4 },
];

const SUNSET_LANTERNS: readonly AtmosphereParticle[] = [
  { id: "s-lantern-1", kind: "lantern", x: 18, y: 58, size: 14, opacity: 0.4,  delay: 0,   duration: 7,   color: "rgba(252,211,77,0.72)" },
  { id: "s-lantern-2", kind: "lantern", x: 44, y: 72, size: 11, opacity: 0.34, delay: 1.8, duration: 8,   color: "rgba(251,146,60,0.68)" },
  { id: "s-lantern-3", kind: "lantern", x: 78, y: 64, size: 12, opacity: 0.38, delay: 3.2, duration: 7.5, color: "rgba(244,114,182,0.56)" },
];

// ── spring ────────────────────────────────────────────────────────────────

const PETALS: readonly AtmosphereParticle[] = [
  { id: "sp-petal-1", kind: "petal", x: 8,  y: 20, size: 12, opacity: 0.42, delay: 0,   duration: 10, rotate: -18 },
  { id: "sp-petal-2", kind: "petal", x: 22, y: 46, size: 9,  opacity: 0.34, delay: 1.8, duration: 12, rotate: 26 },
  { id: "sp-petal-3", kind: "petal", x: 39, y: 18, size: 11, opacity: 0.4,  delay: 3.1, duration: 11, rotate: 12 },
  { id: "sp-petal-4", kind: "petal", x: 56, y: 58, size: 8,  opacity: 0.32, delay: 0.9, duration: 13, rotate: -30 },
  { id: "sp-petal-5", kind: "petal", x: 74, y: 29, size: 12, opacity: 0.38, delay: 2.4, duration: 12, rotate: 18 },
  { id: "sp-petal-6", kind: "petal", x: 89, y: 51, size: 10, opacity: 0.34, delay: 4,   duration: 14, rotate: -10 },
  { id: "sp-petal-7", kind: "petal", x: 30, y: 74, size: 9,  opacity: 0.3,  delay: 1.4, duration: 11, rotate: 34 },
  { id: "sp-petal-8", kind: "petal", x: 65, y: 68, size: 11, opacity: 0.36, delay: 3.7, duration: 13, rotate: -22 },
];

const SPRING_BUTTERFLY_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "sp-butterfly-1", kind: "butterfly", x: 14, y: 32, size: 12, opacity: 0.38, delay: 0.5, duration: 9,    rotate: 10 },
  { id: "sp-butterfly-2", kind: "butterfly", x: 32, y: 58, size: 9,  opacity: 0.32, delay: 2.8, duration: 10,   rotate: -15 },
  { id: "sp-butterfly-3", kind: "butterfly", x: 62, y: 40, size: 11, opacity: 0.36, delay: 1.6, duration: 8.5,  rotate: 22 },
  { id: "sp-butterfly-4", kind: "butterfly", x: 82, y: 62, size: 10, opacity: 0.3,  delay: 3.8, duration: 11,   rotate: -8 },
];

const SPRING_SPARKLE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "sp-sparkle-1", kind: "sparkle", x: 10, y: 52, size: 7, opacity: 0.48, delay: 0,   duration: 2.8, text: "✦", color: "rgba(249,168,212,0.9)" },
  { id: "sp-sparkle-2", kind: "sparkle", x: 35, y: 28, size: 6, opacity: 0.42, delay: 1.4, duration: 3.2, text: "✧", color: "rgba(167,243,208,0.9)" },
  { id: "sp-sparkle-3", kind: "sparkle", x: 68, y: 54, size: 8, opacity: 0.46, delay: 0.8, duration: 3,   text: "✦", color: "rgba(249,168,212,0.9)" },
  { id: "sp-sparkle-4", kind: "sparkle", x: 88, y: 30, size: 6, opacity: 0.4,  delay: 2.3, duration: 3.5, text: "✧", color: "rgba(167,243,208,0.9)" },
];

// ── summer ────────────────────────────────────────────────────────────────

const FIREFLIES: readonly AtmosphereParticle[] = [
  { id: "su-firefly-1",  kind: "firefly", x: 12, y: 72, size: 5,   opacity: 0.58, delay: 0,   duration: 5.4 },
  { id: "su-firefly-2",  kind: "firefly", x: 29, y: 38, size: 3,   opacity: 0.48, delay: 1.3, duration: 6.2 },
  { id: "su-firefly-3",  kind: "firefly", x: 43, y: 66, size: 4,   opacity: 0.52, delay: 2.1, duration: 5.8 },
  { id: "su-firefly-4",  kind: "firefly", x: 63, y: 32, size: 3,   opacity: 0.48, delay: 0.7, duration: 6.5 },
  { id: "su-firefly-5",  kind: "firefly", x: 78, y: 70, size: 5,   opacity: 0.56, delay: 1.8, duration: 5.6 },
  { id: "su-firefly-6",  kind: "firefly", x: 19, y: 52, size: 4,   opacity: 0.5,  delay: 0.6, duration: 5 },
  { id: "su-firefly-7",  kind: "firefly", x: 48, y: 44, size: 3,   opacity: 0.44, delay: 2.4, duration: 6.8 },
  { id: "su-firefly-8",  kind: "firefly", x: 71, y: 55, size: 5,   opacity: 0.54, delay: 1.1, duration: 5.4 },
  { id: "su-firefly-9",  kind: "firefly", x: 84, y: 46, size: 3,   opacity: 0.44, delay: 3.2, duration: 6.2 },
  { id: "su-firefly-10", kind: "firefly", x: 57, y: 72, size: 4,   opacity: 0.48, delay: 0.3, duration: 5.6 },
  { id: "su-glint-1",    kind: "star",    x: 87, y: 18, size: 2,   opacity: 0.58, delay: 0.4, duration: 3.8 },
  { id: "su-glint-2",    kind: "star",    x: 55, y: 15, size: 1.6, opacity: 0.48, delay: 1.5, duration: 4.4 },
];

const HEXAGON_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "su-hex-1", kind: "hexagon", x: 8,  y: 48, size: 16, opacity: 0.18, delay: 0,   duration: 7 },
  { id: "su-hex-2", kind: "hexagon", x: 34, y: 22, size: 12, opacity: 0.16, delay: 1.6, duration: 8 },
  { id: "su-hex-3", kind: "hexagon", x: 68, y: 58, size: 14, opacity: 0.2,  delay: 0.9, duration: 7.5 },
  { id: "su-hex-4", kind: "hexagon", x: 88, y: 36, size: 11, opacity: 0.15, delay: 2.8, duration: 9 },
  { id: "su-hex-5", kind: "hexagon", x: 52, y: 82, size: 13, opacity: 0.14, delay: 4.1, duration: 8.5 },
];

// ── autumn ────────────────────────────────────────────────────────────────

const LEAVES_AND_EMBERS: readonly AtmosphereParticle[] = [
  { id: "a-leaf-1",  kind: "leaf",  x: 10, y: 18, size: 14, opacity: 0.38, delay: 0,   duration: 13, color: "rgba(245,158,11,0.72)",  rotate: -24 },
  { id: "a-leaf-2",  kind: "leaf",  x: 26, y: 48, size: 11, opacity: 0.34, delay: 2,   duration: 15, color: "rgba(220,38,38,0.58)",   rotate: 18 },
  { id: "a-leaf-3",  kind: "leaf",  x: 48, y: 26, size: 13, opacity: 0.36, delay: 3.6, duration: 14, color: "rgba(180,83,9,0.7)",     rotate: 34 },
  { id: "a-leaf-4",  kind: "leaf",  x: 76, y: 42, size: 12, opacity: 0.34, delay: 1.1, duration: 16, color: "rgba(251,191,36,0.55)",  rotate: -12 },
  { id: "a-leaf-5",  kind: "leaf",  x: 62, y: 22, size: 10, opacity: 0.3,  delay: 4.8, duration: 12, color: "rgba(245,158,11,0.6)",   rotate: 26 },
  { id: "a-leaf-6",  kind: "leaf",  x: 38, y: 64, size: 12, opacity: 0.32, delay: 2.8, duration: 14, color: "rgba(220,38,38,0.5)",    rotate: -18 },
  { id: "a-ember-1", kind: "ember", x: 18, y: 80, size: 2,   opacity: 0.42, delay: 0.4, duration: 5.8 },
  { id: "a-ember-2", kind: "ember", x: 61, y: 74, size: 2.4, opacity: 0.46, delay: 1.8, duration: 6.4 },
  { id: "a-ember-3", kind: "ember", x: 88, y: 78, size: 1.8, opacity: 0.38, delay: 2.7, duration: 5.2 },
  { id: "a-ember-4", kind: "ember", x: 32, y: 82, size: 2.2, opacity: 0.44, delay: 0.8, duration: 6 },
  { id: "a-ember-5", kind: "ember", x: 48, y: 76, size: 1.6, opacity: 0.38, delay: 3.4, duration: 5.6 },
  { id: "a-ember-6", kind: "ember", x: 72, y: 80, size: 2,   opacity: 0.4,  delay: 1.6, duration: 6.8 },
  { id: "a-ember-7", kind: "ember", x: 94, y: 72, size: 2.4, opacity: 0.42, delay: 2.2, duration: 5.4 },
];

const AUTUMN_LANTERNS: readonly AtmosphereParticle[] = [
  { id: "a-lantern-1", kind: "lantern", x: 22, y: 56, size: 13, opacity: 0.38, delay: 0.6, duration: 8,   color: "rgba(245,158,11,0.68)" },
  { id: "a-lantern-2", kind: "lantern", x: 56, y: 70, size: 10, opacity: 0.32, delay: 2.4, duration: 9,   color: "rgba(220,38,38,0.58)" },
  { id: "a-lantern-3", kind: "lantern", x: 84, y: 60, size: 12, opacity: 0.36, delay: 1.2, duration: 7.5, color: "rgba(180,83,9,0.64)" },
];

// ── winter ────────────────────────────────────────────────────────────────

const SNOW: readonly AtmosphereParticle[] = [
  { id: "w-snow-1",  kind: "snow", x: 8,  y: 12, size: 3,   opacity: 0.54, delay: 0,   duration: 10 },
  { id: "w-snow-2",  kind: "snow", x: 19, y: 36, size: 2,   opacity: 0.42, delay: 2,   duration: 12 },
  { id: "w-snow-3",  kind: "snow", x: 32, y: 18, size: 2.8, opacity: 0.48, delay: 1.1, duration: 11 },
  { id: "w-snow-4",  kind: "snow", x: 47, y: 54, size: 2,   opacity: 0.4,  delay: 3,   duration: 13 },
  { id: "w-snow-5",  kind: "snow", x: 63, y: 24, size: 3.2, opacity: 0.5,  delay: 1.7, duration: 12 },
  { id: "w-snow-6",  kind: "snow", x: 79, y: 46, size: 2.4, opacity: 0.44, delay: 2.8, duration: 14 },
  { id: "w-snow-7",  kind: "snow", x: 91, y: 16, size: 2,   opacity: 0.4,  delay: 0.6, duration: 11 },
  { id: "w-snow-8",  kind: "snow", x: 86, y: 72, size: 3,   opacity: 0.46, delay: 3.8, duration: 15 },
  { id: "w-snow-9",  kind: "snow", x: 22, y: 64, size: 2.2, opacity: 0.38, delay: 1.4, duration: 12 },
  { id: "w-snow-10", kind: "snow", x: 54, y: 40, size: 2.6, opacity: 0.44, delay: 4.2, duration: 13 },
  { id: "w-snow-11", kind: "snow", x: 38, y: 78, size: 1.8, opacity: 0.36, delay: 2.1, duration: 14 },
];

const SNOWFLAKE_PARTICLES: readonly AtmosphereParticle[] = [
  { id: "w-flake-1", kind: "snowflake", x: 14, y: 22, size: 14, opacity: 0.48, delay: 0,   duration: 14, text: "❄" },
  { id: "w-flake-2", kind: "snowflake", x: 31, y: 54, size: 11, opacity: 0.42, delay: 2.6, duration: 16, text: "❄" },
  { id: "w-flake-3", kind: "snowflake", x: 56, y: 30, size: 16, opacity: 0.44, delay: 1.4, duration: 15, text: "❄" },
  { id: "w-flake-4", kind: "snowflake", x: 76, y: 62, size: 12, opacity: 0.4,  delay: 3.8, duration: 17, text: "❄" },
  { id: "w-flake-5", kind: "snowflake", x: 92, y: 38, size: 13, opacity: 0.46, delay: 0.9, duration: 13, text: "❄" },
];

const WINTER_METEORS: readonly AtmosphereParticle[] = [
  { id: "w-meteor-1", kind: "meteor", x: 8,  y: 12, size: 4,   opacity: 0.38, delay: 1.2, duration: 5.5, rotate: 44, color: "rgba(147,197,253,0.82)" },
  { id: "w-meteor-2", kind: "meteor", x: 62, y: 8,  size: 3.5, opacity: 0.32, delay: 4.8, duration: 6,   rotate: 46, color: "rgba(226,232,240,0.78)" },
];

// ──────────────────────────────────────────────────────────────────────────

export const THEME_ATMOSPHERES: Record<ThemeId, ThemeAtmosphereConfig> = {
  midnight: {
    baseGlow:
      "radial-gradient(circle at 18% 18%, rgba(167,139,250,0.18), transparent 28%), radial-gradient(circle at 78% 12%, rgba(245,158,11,0.12), transparent 24%)",
    texture:
      "linear-gradient(115deg, transparent 0 32%, rgba(167,139,250,0.08) 32.5%, transparent 34%), linear-gradient(68deg, transparent 0 58%, rgba(245,158,11,0.07) 58.4%, transparent 60%)",
    particles: [...STAR_PARTICLES, ...RUNE_PARTICLES, ...METEOR_PARTICLES],
    lines: [
      { id: "m-line-1", x1: 9,  y1: 14, x2: 31, y2: 11, opacity: 0.34 },
      { id: "m-line-2", x1: 31, y1: 11, x2: 49, y2: 19, opacity: 0.28 },
      { id: "m-line-3", x1: 49, y1: 19, x2: 66, y2: 10, opacity: 0.3 },
      { id: "m-line-4", x1: 66, y1: 10, x2: 84, y2: 23, opacity: 0.26 },
    ],
  },
  dawn: {
    baseGlow:
      "linear-gradient(180deg, rgba(244,114,182,0.16) 0%, rgba(96,165,250,0.08) 42%, transparent 72%), radial-gradient(ellipse at 50% 82%, rgba(251,191,36,0.16), transparent 48%)",
    particles: [...MIST_PARTICLES, ...SPARKLE_PARTICLES, ...DAWN_BUTTERFLY_PARTICLES],
    ribbons: [
      { id: "d-ribbon-1", path: "M-5 38 C18 20 38 42 58 27 C78 12 94 26 106 12",  color: "rgba(244,114,182,0.24)", opacity: 0.8,  delay: 0,   duration: 10 },
      { id: "d-ribbon-2", path: "M-6 48 C20 35 32 54 54 39 C76 24 91 42 108 28",  color: "rgba(96,165,250,0.2)",   opacity: 0.7,  delay: 1.4, duration: 12 },
      { id: "d-ribbon-3", path: "M-4 58 C19 49 40 63 61 50 C82 37 95 52 106 44",  color: "rgba(251,191,36,0.14)",  opacity: 0.62, delay: 2.5, duration: 11 },
    ],
  },
  sunset: {
    baseGlow:
      "radial-gradient(ellipse at 48% 82%, rgba(251,146,60,0.22), transparent 54%), radial-gradient(circle at 82% 22%, rgba(252,211,77,0.14), transparent 28%)",
    particles: [...DUST_PARTICLES, ...SUNSET_LANTERNS],
    rays: [
      { id: "s-ray-1", left: 8,  width: 14, rotate: 16,  opacity: 0.2,  color: "rgba(252,211,77,0.4)",   delay: 0 },
      { id: "s-ray-2", left: 34, width: 18, rotate: -10, opacity: 0.16, color: "rgba(251,146,60,0.42)",  delay: 0.8 },
      { id: "s-ray-3", left: 67, width: 16, rotate: 12,  opacity: 0.14, color: "rgba(244,114,182,0.28)", delay: 1.6 },
    ],
  },
  spring: {
    baseGlow:
      "radial-gradient(circle at 18% 24%, rgba(249,168,212,0.16), transparent 26%), radial-gradient(circle at 72% 34%, rgba(167,243,208,0.11), transparent 30%)",
    particles: [...PETALS, ...SPRING_BUTTERFLY_PARTICLES, ...SPRING_SPARKLE_PARTICLES],
  },
  summer: {
    baseGlow:
      "radial-gradient(circle at 22% 80%, rgba(251,191,36,0.12), transparent 24%), radial-gradient(circle at 76% 28%, rgba(56,189,248,0.14), transparent 32%)",
    texture:
      "radial-gradient(circle at 50% 50%, rgba(125,211,252,0.08) 0 1px, transparent 1.5px)",
    particles: [...FIREFLIES, ...HEXAGON_PARTICLES],
  },
  autumn: {
    baseGlow:
      "radial-gradient(ellipse at 50% 84%, rgba(217,119,6,0.2), transparent 50%), radial-gradient(circle at 18% 26%, rgba(220,38,38,0.12), transparent 26%)",
    particles: [...LEAVES_AND_EMBERS, ...AUTUMN_LANTERNS],
  },
  winter: {
    baseGlow:
      "radial-gradient(circle at 18% 20%, rgba(226,232,240,0.14), transparent 26%), radial-gradient(circle at 78% 72%, rgba(147,197,253,0.12), transparent 32%)",
    texture:
      "linear-gradient(135deg, transparent 0 46%, rgba(226,232,240,0.08) 46.4%, transparent 47%), linear-gradient(45deg, transparent 0 64%, rgba(147,197,253,0.07) 64.4%, transparent 65%)",
    particles: [...SNOW, ...SNOWFLAKE_PARTICLES, ...WINTER_METEORS],
  },
};
