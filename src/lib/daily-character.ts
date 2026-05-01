import { CHARACTER_IDS, CharacterId } from "@/types/character";

export function getDailyCharacterId(now: number = Date.now()): CharacterId {
  return CHARACTER_IDS[Math.floor(now / 86400000) % CHARACTER_IDS.length];
}
