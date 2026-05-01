export const CHARACTER_ORDER = [
  "arcana", "miko", "seonhwa", "hoshi", "luna", "rei",
  "cairn", "zero", "haru", "ren", "lix", "ethan",
] as const;

export type DailyCharacterId = typeof CHARACTER_ORDER[number];

export function getDailyCharacterId(now: number = Date.now()): string {
  return CHARACTER_ORDER[Math.floor(now / 86400000) % CHARACTER_ORDER.length];
}
