import { Topic } from "@/types/session";

export type SajuCategoryId = "time-based" | "relationship-event" | "deep-analysis";

export interface SajuSubTopic {
  id: Topic;
  label: string;
  icon: string;
  desc: string;
  /** 이 주제에 필요한 추가 계산 (calculator 분기용) */
  requiresData?: "monthly" | "yearly-multi" | "daily";
}

export interface SajuCategory {
  id: SajuCategoryId;
  label: string;
  icon: string;
  desc: string;
  topics: SajuSubTopic[];
}

export const sajuCategories: SajuCategory[] = [
  {
    id: "time-based",
    label: "시간 기반 운세",
    icon: "⏳",
    desc: "월운·일운·세운으로 시기별 흐름을 읽습니다",
    topics: [
      { id: "saju-monthly", label: "올해 월운", icon: "📊", desc: "올해 12개월의 월별 운세 흐름", requiresData: "monthly" },
      { id: "saju-this-month", label: "이번 달 운세", icon: "🌙", desc: "이번 달의 상세 운세와 주의사항", requiresData: "monthly" },
      { id: "saju-weekly", label: "이번 주 일운", icon: "📅", desc: "이번 주 7일간의 일별 운세", requiresData: "daily" },
      { id: "saju-next-year", label: "내년 운세", icon: "🔮", desc: "내년의 전체 운세 전망", requiresData: "yearly-multi" },
      { id: "fortune-3y", label: "3년 운세", icon: "📈", desc: "향후 3년간의 운세 흐름", requiresData: "yearly-multi" },
      { id: "fortune-5y", label: "5년 운세", icon: "🗓️", desc: "향후 5년간의 중기 전망", requiresData: "yearly-multi" },
      { id: "fortune-full", label: "전체 대운", icon: "🌟", desc: "전체 인생의 대운 로드맵" },
    ],
  },
  {
    id: "relationship-event",
    label: "관계 · 이벤트",
    icon: "💫",
    desc: "인연·궁합·시기 판단에 특화된 분석",
    topics: [
      { id: "saju-compatibility", label: "궁합 분석", icon: "💑", desc: "나의 사주로 보는 인연·궁합 경향" },
      { id: "saju-love-timing", label: "연애/결혼 시기", icon: "💍", desc: "인연이 들어오는 시기와 결혼운" },
      { id: "saju-career-timing", label: "이직/사업 시기", icon: "🚀", desc: "직장 변동·사업 시작의 적기 분석" },
      { id: "saju-auspicious-date", label: "택일 조언", icon: "📆", desc: "중요한 일의 길일·흉일 판단" },
    ],
  },
  {
    id: "deep-analysis",
    label: "심층 분석",
    icon: "🔍",
    desc: "성격·적성·체질 등 사주 근본 해석",
    topics: [
      { id: "saju-personality", label: "성격 심층 분석", icon: "🧠", desc: "사주로 보는 성격의 장단점과 내면" },
      { id: "saju-aptitude", label: "적성/직업 분석", icon: "🎯", desc: "타고난 적성과 어울리는 직업군" },
      { id: "saju-constitution", label: "오행 체질", icon: "🌿", desc: "오행 균형으로 보는 건강·체질 경향" },
      { id: "saju-yongsin", label: "용신 활용법", icon: "⚡", desc: "용신을 일상에서 활용하는 실천 조언" },
      { id: "saju-relationships", label: "대인관계 패턴", icon: "🤝", desc: "사주로 보는 대인관계 성향과 조언" },
    ],
  },
];

/** topic → requiresData 조회 헬퍼 */
export function getRequiresData(topic: Topic): SajuSubTopic["requiresData"] {
  for (const category of sajuCategories) {
    const sub = category.topics.find((t) => t.id === topic);
    if (sub) return sub.requiresData;
  }
  return undefined;
}
