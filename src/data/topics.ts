import type { Topic } from "@/types/session";

/** 타로 유효 토픽 목록 */
export const TAROT_TOPICS: Topic[] = [
  "love",
  "love-single",
  "love-couple",
  "finance",
  "career",
  "health",
  "general",
]

/** 사주 유효 토픽 목록 */
export const SAJU_TOPICS: Topic[] = [
  "saju-general",
  "saju-love-single",
  "saju-love-couple",
  "saju-career",
  "saju-health",
  "saju-personality",
  "saju-compatibility",
  "saju-auspicious-date",
]

/** 신점 유효 토픽 목록 */
export const SHINJEOM_TOPICS: Topic[] = [
  "shinjeom-general",
  "shinjeom-love",
  "shinjeom-wealth",
  "shinjeom-career",
  "shinjeom-health",
  "shinjeom-auspicious",
]

/** 전체 유효 토픽 목록 (타로 + 사주 + 신점) */
export const ALL_TOPICS: Topic[] = [...TAROT_TOPICS, ...SAJU_TOPICS, ...SHINJEOM_TOPICS]

const ALL_TOPICS_SET: ReadonlySet<string> = new Set(ALL_TOPICS);
const SHINJEOM_TOPICS_SET: ReadonlySet<string> = new Set(SHINJEOM_TOPICS);
const TAROT_TOPICS_SET: ReadonlySet<string> = new Set(TAROT_TOPICS);
const SAJU_TOPICS_SET: ReadonlySet<string> = new Set(SAJU_TOPICS);

export function isTopic(v: string): v is Topic { return ALL_TOPICS_SET.has(v); }
export function isShinjeomTopic(v: string): v is Topic { return SHINJEOM_TOPICS_SET.has(v); }
export function isTarotTopic(v: string): v is Topic { return TAROT_TOPICS_SET.has(v); }
export function isSajuTopic(v: string): v is Topic { return SAJU_TOPICS_SET.has(v); }
