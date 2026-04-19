/** 타로 유효 토픽 목록 */
export const TAROT_TOPICS: string[] = [
  "love",
  "love-single",
  "love-couple",
  "finance",
  "career",
  "health",
  "general",
]

/** 사주 유효 토픽 목록 */
export const SAJU_TOPICS: string[] = [
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
export const SHINJEOM_TOPICS: string[] = [
  "shinjeom-general",
  "shinjeom-love",
  "shinjeom-wealth",
  "shinjeom-career",
  "shinjeom-health",
  "shinjeom-auspicious",
]

/** 전체 유효 토픽 목록 (타로 + 사주 + 신점) */
export const ALL_TOPICS: string[] = [...TAROT_TOPICS, ...SAJU_TOPICS, ...SHINJEOM_TOPICS]
