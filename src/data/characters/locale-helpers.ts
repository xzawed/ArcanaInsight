import type { CharacterConfig } from "@/types/character";

export function getCharacterGreeting(char: CharacterConfig, locale: string): string {
  if (locale === "en" && char.greetingEn) return char.greetingEn;
  if (locale === "ja" && char.greetingJa) return char.greetingJa;
  return char.greeting;
}

export function getCharacterDescription(char: CharacterConfig, locale: string): string {
  if (locale === "en" && char.descriptionEn) return char.descriptionEn;
  if (locale === "ja" && char.descriptionJa) return char.descriptionJa;
  return char.description;
}

export function getCharacterSpeciality(char: CharacterConfig, locale: string): string {
  if (locale === "en" && char.specialityEn) return char.specialityEn;
  if (locale === "ja" && char.specialityJa) return char.specialityJa;
  return char.speciality;
}
