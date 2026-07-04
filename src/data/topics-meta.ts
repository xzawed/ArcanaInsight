/**
 * 타로·사주·신점 토픽 라벨 + 설명 메타데이터 (multi-locale 인라인).
 * 사용처:
 *   - tarot/page.tsx: 타로 6개 토픽 카드 라벨/설명
 *   - mypage/page.tsx: 21개 토픽 라벨 (히스토리 카드 배지)
 *
 * 데이터 인라인 패턴 — `src/data/characters/locale-helpers.ts` 동일 구조 (캐릭터 i18n 패턴 재사용).
 * 사전 namespace 폭발 회피 + 토픽 데이터·라벨 응집도 향상.
 */
interface TopicMeta {
  /** UI 카드 표시명 (기본 ko) */
  labelKo: string;
  labelEn: string;
  labelJa: string;
  /** UI 카드 부연 설명 — tarot/page.tsx 토픽 선택 카드용 */
  descKo?: string;
  descEn?: string;
  descJa?: string;
  /** tarot/page.tsx 토픽 카드 아이콘 */
  iconId?: string;
}

export const TOPIC_META: Record<string, TopicMeta> = {
  // ── 타로 ────────────────────────────────────────────────────────────────
  "love": {
    labelKo: "연애/관계", labelEn: "Love / Relationships", labelJa: "恋愛/関係",
  },
  "love-single": {
    labelKo: "연애 (솔로)", labelEn: "Love (Single)", labelJa: "恋愛(独身)",
    descKo: "새로운 만남과 인연에 대한 상담",
    descEn: "Guidance on new encounters and connections",
    descJa: "新しい出会いと縁についての相談",
    iconId: "topic-love-single",
  },
  "love-couple": {
    labelKo: "연애 (커플)", labelEn: "Love (Couple)", labelJa: "恋愛(交際中)",
    descKo: "현재 관계의 발전과 미래에 대한 상담",
    descEn: "Guidance on the growth and future of your current relationship",
    descJa: "現在の関係の発展と未来についての相談",
    iconId: "topic-love-couple",
  },
  "career": {
    labelKo: "직장/진로", labelEn: "Career / Path", labelJa: "仕事/進路",
    descKo: "커리어와 진로에 대한 조언",
    descEn: "Advice on your career and life path",
    descJa: "キャリアと進路についてのアドバイス",
    iconId: "topic-career",
  },
  "finance": {
    labelKo: "재정/금전", labelEn: "Finance / Money", labelJa: "財政/金銭",
    descKo: "돈과 재정 상황에 대한 통찰",
    descEn: "Insight into money and financial situations",
    descJa: "お金と財政状況についての洞察",
    iconId: "topic-finance",
  },
  "health": {
    labelKo: "건강", labelEn: "Health", labelJa: "健康",
    descKo: "건강과 웰빙에 대한 가이드",
    descEn: "Guidance on health and wellbeing",
    descJa: "健康とウェルビーイングへのガイド",
    iconId: "topic-health",
  },
  "general": {
    labelKo: "일반 상담", labelEn: "General", labelJa: "一般相談",
    descKo: "자유로운 주제의 종합 상담",
    descEn: "Open-ended consultation on any topic",
    descJa: "自由なテーマの総合相談",
    iconId: "topic-general",
  },
  // ── 사주 ────────────────────────────────────────────────────────────────
  "saju-general":         { labelKo: "사주 종합",        labelEn: "Saju · Overall",         labelJa: "四柱推命 · 総合" },
  "saju-love-single":     { labelKo: "사주 연애(솔로)",  labelEn: "Saju · Love (Single)",   labelJa: "四柱 · 恋愛(独身)" },
  "saju-love-couple":     { labelKo: "사주 연애(커플)",  labelEn: "Saju · Love (Couple)",   labelJa: "四柱 · 恋愛(交際中)" },
  "saju-career":          { labelKo: "사주 직장·재물",   labelEn: "Saju · Career & Wealth", labelJa: "四柱 · 仕事/財運" },
  "saju-health":          { labelKo: "사주 건강",        labelEn: "Saju · Health",          labelJa: "四柱 · 健康" },
  "saju-personality":     { labelKo: "사주 성격·적성",   labelEn: "Saju · Personality",     labelJa: "四柱 · 性格/適性" },
  "saju-compatibility":   { labelKo: "사주 궁합",        labelEn: "Saju · Compatibility",   labelJa: "四柱 · 相性" },
  "saju-auspicious-date": { labelKo: "사주 택일",        labelEn: "Saju · Auspicious Date", labelJa: "四柱 · 吉日選定" },
  // ── 신점 ────────────────────────────────────────────────────────────────
  "shinjeom-general":     { labelKo: "신점 종합",        labelEn: "Shinjeom · Overall",     labelJa: "神占 · 総合" },
  "shinjeom-love":        { labelKo: "신점 연애/궁합",   labelEn: "Shinjeom · Love",        labelJa: "神占 · 恋愛/相性" },
  "shinjeom-wealth":      { labelKo: "신점 재물/사업",   labelEn: "Shinjeom · Wealth",      labelJa: "神占 · 財運/事業" },
  "shinjeom-career":      { labelKo: "신점 직장/이직",   labelEn: "Shinjeom · Career",      labelJa: "神占 · 仕事/転職" },
  "shinjeom-health":      { labelKo: "신점 건강/액막이", labelEn: "Shinjeom · Health",      labelJa: "神占 · 健康/厄除け" },
  "shinjeom-auspicious":  { labelKo: "신점 택일",        labelEn: "Shinjeom · Auspicious",  labelJa: "神占 · 吉日選定" },
};

// ─── locale 헬퍼 ─────────────────────────────────────────────────────────────

function pickLocaleText(meta: TopicMeta, locale: string, field: "label" | "desc"): string | undefined {
  const enKey = field === "label" ? "labelEn" : "descEn";
  const jaKey = field === "label" ? "labelJa" : "descJa";
  const koKey = field === "label" ? "labelKo" : "descKo";
  if (locale === "en" && meta[enKey as keyof TopicMeta]) return meta[enKey as keyof TopicMeta] as string;
  if (locale === "ja" && meta[jaKey as keyof TopicMeta]) return meta[jaKey as keyof TopicMeta] as string;
  return meta[koKey as keyof TopicMeta] as string | undefined;
}

/** 토픽 라벨 — locale에 맞춰 반환. 미정의 토픽은 입력값 그대로 반환. */
export function getTopicLabel(topic: string, locale: string): string {
  const meta = TOPIC_META[topic];
  if (!meta) return String(topic);
  return pickLocaleText(meta, locale, "label") ?? meta.labelKo;
}

/** 토픽 설명 — 타로 토픽 카드용. 미정의 시 빈 문자열. */
export function getTopicDesc(topic: string, locale: string): string {
  const meta = TOPIC_META[topic];
  if (!meta) return "";
  return pickLocaleText(meta, locale, "desc") ?? "";
}

/** 토픽 아이콘 ID — tarot/page.tsx 토픽 카드용. */
export function getTopicIconId(topic: string): string | undefined {
  return TOPIC_META[topic]?.iconId;
}
