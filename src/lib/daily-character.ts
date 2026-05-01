import { CHARACTER_IDS, CharacterId } from "@/types/character";

export const CHARACTER_ORDER: readonly CharacterId[] = CHARACTER_IDS;

export function getDailyCharacterId(now: number = Date.now()): CharacterId {
  return CHARACTER_ORDER[Math.floor(now / 86400000) % CHARACTER_ORDER.length];
}
