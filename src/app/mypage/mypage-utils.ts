import { characters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { getCardName } from "@/data/cards/locale-helpers";
import { t } from "@/i18n/translations";
import type { Locale } from "@/i18n/config";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface ReadingData {
  id: string;
  session_id?: string;
  share_token?: string | null;
  overall_reading?: string | null;
}

export interface SessionRow {
  id: string;
  service_type: string;
  topic: string;
  status: string;
  created_at: string;
  character_id?: string | null;
  readings: ReadingData | ReadingData[] | null;
  saju_readings: ReadingData | ReadingData[] | null;
  shinjeom_readings: ReadingData | ReadingData[] | null;
}

export interface SessionCard {
  card_id: string;
}

export interface Profile {
  id: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  provider?: string;
  favorite_character_id?: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

export const topicColors: Record<string, string> = {
  love: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "love-single": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "love-couple": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  finance: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  career: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  health: "bg-green-500/20 text-green-300 border-green-500/30",
  general: "bg-arcana-purple/20 text-arcana-purple border-arcana-purple/30",
};

export const serviceColors: Record<string, string> = {
  tarot: "text-arcana-purple",
  saju: "text-cyan-400",
  shinjeom: "text-amber-400",
};

// ─── 유틸리티 함수 ─────────────────────────────────────────────────────────────

const deckManager = new DeckManager();

export function formatRelativeDate(dateStr: string, locale: Locale): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("mypage.date.today", locale);
  if (diffDays === 1) return t("mypage.date.yesterday", locale);
  if (diffDays < 7) return t("mypage.date.days-ago", locale).replace("{n}", String(diffDays));
  if (diffDays < 30) return t("mypage.date.weeks-ago", locale).replace("{n}", String(Math.floor(diffDays / 7)));
  // 월 단위 이상은 locale 별 toLocaleDateString
  const localeMap: Record<Locale, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };
  return date.toLocaleDateString(localeMap[locale]);
}

export function getCharacterName(characterId?: string | null): string | null {
  if (!characterId) return null;
  const char = characters.find((c) => c.id === characterId);
  return char?.name ?? null;
}

/** PostgREST 1:1 관계: 객체 또는 배열 모두 처리 */
export function normalizeReading(readings: ReadingData | ReadingData[] | null | undefined): ReadingData | undefined {
  if (!readings) return undefined;
  if (Array.isArray(readings)) return readings[0];
  return readings;
}

/** 3개 리딩 테이블 중 데이터가 있는 것 반환 */
export function getReadingFromSession(session: SessionRow): ReadingData | undefined {
  return normalizeReading(session.readings)
    ?? normalizeReading(session.saju_readings)
    ?? normalizeReading(session.shinjeom_readings);
}

/** 카드 빈도 집계 → 가장 많이 뽑은 카드명 반환 */
export function getMostFrequentCard(sessionCards: SessionCard[], locale: Locale): string | null {
  if (sessionCards.length === 0) return null;
  const freq: Record<string, number> = {};
  for (const sc of sessionCards) {
    freq[sc.card_id] = (freq[sc.card_id] || 0) + 1;
  }
  const topCardId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  const card = deckManager.getCardById(topCardId);
  return card ? getCardName(card, locale) : topCardId;
}

export function getServiceLabel(serviceType: string, locale: Locale): string {
  if (serviceType === "saju") return t("mypage.service.saju", locale);
  if (serviceType === "shinjeom") return t("mypage.service.shinjeom", locale);
  return t("mypage.service.tarot", locale);
}
