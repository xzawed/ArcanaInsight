import { Topic, SajuTimeRange } from "@/types/session";
import { SajuCalculateOptions } from "@/services/saju/saju-calculator";

export interface SajuTimeOption {
  id: SajuTimeRange;
  label: string;
  icon: string;
  desc: string;
  /** 이 시간단위에서 월별 상세 토글 허용 여부 */
  allowMonthly: boolean;
  /** calculator에 전달할 옵션 */
  calcOption: SajuCalculateOptions;
}

export interface SajuAreaOption {
  id: Topic;
  label: string;
  icon: string;
  desc: string;
}

export const sajuTimeOptions: SajuTimeOption[] = [
  { id: "this-week",    label: "이번 주",   icon: "saju-week",    desc: "7일간 일운",          allowMonthly: false, calcOption: { daily: true } },
  { id: "this-month",   label: "이번 달",   icon: "saju-month",   desc: "이번 달 월운",        allowMonthly: false, calcOption: { monthly: true } },
  { id: "this-year",    label: "올해",      icon: "saju-year",    desc: "올해 세운",           allowMonthly: true,  calcOption: {} },
  { id: "next-year",    label: "내년",      icon: "saju-crystal", desc: "내년 세운",           allowMonthly: true,  calcOption: { yearlyMulti: 1 } },
  { id: "three-year",   label: "3년",       icon: "saju-trend",   desc: "향후 3년 흐름",       allowMonthly: true,  calcOption: { yearlyMulti: 3 } },
  { id: "five-year",    label: "5년",       icon: "saju-calendar",desc: "향후 5년 중기 전망",  allowMonthly: true,  calcOption: { yearlyMulti: 5 } },
  { id: "full-fortune", label: "전체 대운", icon: "saju-destiny", desc: "인생 대운 로드맵",    allowMonthly: false, calcOption: {} },
];

export const sajuAreaOptions: SajuAreaOption[] = [
  { id: "saju-general",         label: "종합운",       icon: "saju-general",       desc: "종합적인 운세 흐름" },
  { id: "saju-love-single",     label: "연애 (솔로)",  icon: "saju-love-single",   desc: "새 만남·인연 시기" },
  { id: "saju-love-couple",     label: "연애 (커플)",  icon: "saju-love-couple",   desc: "관계 발전·갈등 해결" },
  { id: "saju-career",          label: "직장·재물",    icon: "saju-career",        desc: "직장·사업·금전운" },
  { id: "saju-health",          label: "건강운",       icon: "saju-health",        desc: "건강·체질·오행" },
  { id: "saju-personality",     label: "성격·적성",    icon: "saju-personality",   desc: "성격·적성·직업 분석" },
  { id: "saju-compatibility",   label: "궁합",         icon: "saju-compatibility", desc: "인연 경향·궁합 분석" },
  { id: "saju-auspicious-date", label: "택일",         icon: "saju-date",          desc: "길일·흉일 판단" },
];
