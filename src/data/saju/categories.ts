import { Topic, SajuTimeRange } from "@/types/session";
import { SajuCalculateOptions } from "@/services/saju/saju-calculator";

export interface SajuTimeOption {
  id: SajuTimeRange;
  label: string;        // ko 기본
  labelEn?: string;
  labelJa?: string;
  icon: string;
  desc: string;         // ko 기본
  descEn?: string;
  descJa?: string;
  /** 이 시간단위에서 월별 상세 토글 허용 여부 */
  allowMonthly: boolean;
  /** calculator에 전달할 옵션 */
  calcOption: SajuCalculateOptions;
}

export interface SajuAreaOption {
  id: Topic;
  label: string;        // ko 기본
  labelEn?: string;
  labelJa?: string;
  icon: string;
  desc: string;         // ko 기본
  descEn?: string;
  descJa?: string;
}

export const sajuTimeOptions: SajuTimeOption[] = [
  { id: "this-week",    label: "이번 주",   labelEn: "This Week",  labelJa: "今週",      icon: "saju-week",     desc: "7일간 일운",          descEn: "7-day daily fortune",          descJa: "7日間の日運",          allowMonthly: false, calcOption: { daily: true } },
  { id: "this-month",   label: "이번 달",   labelEn: "This Month", labelJa: "今月",      icon: "saju-month",    desc: "이번 달 월운",        descEn: "Monthly fortune for this month", descJa: "今月の月運",         allowMonthly: false, calcOption: { monthly: true } },
  { id: "this-year",    label: "올해",      labelEn: "This Year",  labelJa: "今年",      icon: "saju-year",     desc: "올해 세운",           descEn: "Yearly fortune for this year", descJa: "今年の歳運",           allowMonthly: true,  calcOption: {} },
  { id: "next-year",    label: "내년",      labelEn: "Next Year",  labelJa: "来年",      icon: "saju-crystal",  desc: "내년 세운",           descEn: "Yearly fortune for next year", descJa: "来年の歳運",           allowMonthly: true,  calcOption: { yearlyMulti: 1 } },
  { id: "three-year",   label: "3년",       labelEn: "3 Years",    labelJa: "3年",       icon: "saju-trend",    desc: "향후 3년 흐름",       descEn: "Trend over the next 3 years",  descJa: "今後3年の流れ",        allowMonthly: true,  calcOption: { yearlyMulti: 3 } },
  { id: "five-year",    label: "5년",       labelEn: "5 Years",    labelJa: "5年",       icon: "saju-calendar", desc: "향후 5년 중기 전망",  descEn: "Mid-term outlook for 5 years", descJa: "今後5年の中期展望",    allowMonthly: true,  calcOption: { yearlyMulti: 5 } },
  { id: "full-fortune", label: "전체 대운", labelEn: "Full Destiny",labelJa: "総大運",    icon: "saju-destiny",  desc: "인생 대운 로드맵",    descEn: "Lifetime destiny roadmap",     descJa: "人生大運のロードマップ", allowMonthly: false, calcOption: {} },
];

export const sajuAreaOptions: SajuAreaOption[] = [
  { id: "saju-general",         label: "종합운",       labelEn: "Overall",         labelJa: "総合運",     icon: "saju-general",       desc: "종합적인 운세 흐름",  descEn: "Overall fortune flow",          descJa: "総合的な運勢の流れ" },
  { id: "saju-love-single",     label: "연애 (솔로)",  labelEn: "Love (Single)",   labelJa: "恋愛(独身)", icon: "saju-love-single",   desc: "새 만남·인연 시기",   descEn: "New encounters & timing",       descJa: "新しい出会い・縁の時期" },
  { id: "saju-love-couple",     label: "연애 (커플)",  labelEn: "Love (Couple)",   labelJa: "恋愛(交際中)",icon: "saju-love-couple",  desc: "관계 발전·갈등 해결", descEn: "Relationship growth & conflicts", descJa: "関係の発展・葛藤解決" },
  { id: "saju-career",          label: "직장·재물",    labelEn: "Career & Wealth", labelJa: "仕事・財運", icon: "saju-career",        desc: "직장·사업·금전운",    descEn: "Career, business, money fortune", descJa: "仕事・事業・金運" },
  { id: "saju-health",          label: "건강운",       labelEn: "Health",          labelJa: "健康運",     icon: "saju-health",        desc: "건강·체질·오행",      descEn: "Health, constitution, five elements", descJa: "健康・体質・五行" },
  { id: "saju-personality",     label: "성격·적성",    labelEn: "Personality & Aptitude", labelJa: "性格・適性", icon: "saju-personality", desc: "성격·적성·직업 분석", descEn: "Personality, aptitude, career analysis", descJa: "性格・適性・職業分析" },
  { id: "saju-compatibility",   label: "궁합",         labelEn: "Compatibility",   labelJa: "相性",       icon: "saju-compatibility", desc: "인연 경향·궁합 분석", descEn: "Relationship tendencies & compatibility", descJa: "縁の傾向・相性分析" },
  { id: "saju-auspicious-date", label: "택일",         labelEn: "Auspicious Date", labelJa: "吉日選定",   icon: "saju-date",          desc: "길일·흉일 판단",      descEn: "Choosing auspicious & inauspicious days", descJa: "吉日・凶日の判断" },
];

// ─── locale 헬퍼 ─────────────────────────────────────────────────────────────

function pickLocalizedLabel(
  opt: { label: string; labelEn?: string; labelJa?: string },
  locale: string,
): string {
  if (locale === "en" && opt.labelEn) return opt.labelEn;
  if (locale === "ja" && opt.labelJa) return opt.labelJa;
  return opt.label;
}

function pickLocalizedDesc(
  opt: { desc: string; descEn?: string; descJa?: string },
  locale: string,
): string {
  if (locale === "en" && opt.descEn) return opt.descEn;
  if (locale === "ja" && opt.descJa) return opt.descJa;
  return opt.desc;
}

export function getSajuTimeLabel(opt: SajuTimeOption, locale: string): string {
  return pickLocalizedLabel(opt, locale);
}

export function getSajuTimeDesc(opt: SajuTimeOption, locale: string): string {
  return pickLocalizedDesc(opt, locale);
}

export function getSajuAreaLabel(opt: SajuAreaOption, locale: string): string {
  return pickLocalizedLabel(opt, locale);
}

export function getSajuAreaDesc(opt: SajuAreaOption, locale: string): string {
  return pickLocalizedDesc(opt, locale);
}
