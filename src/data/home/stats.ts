export interface StatItem {
  icon: string;
  value: number;
  suffix: string;
  label: string;
}

export const stats: StatItem[] = [
  { icon: "🃏", value: 10000, suffix: "+", label: "누적 리딩" },
  { icon: "👤", value: 2500, suffix: "+", label: "활성 사용자" },
  { icon: "⭐", value: 4.8, suffix: "/5.0", label: "만족도" },
  { icon: "🔮", value: 12, suffix: "명", label: "AI 상담사" },
];
