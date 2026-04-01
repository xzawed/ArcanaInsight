import { SelectedCard } from "./card";

export type Topic =
  // 타로 전용
  | "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  // 사주 - 시간 기반 운세
  | "saju-monthly" | "saju-this-month" | "saju-weekly" | "saju-next-year"
  | "fortune-3y" | "fortune-5y" | "fortune-full"
  // 사주 - 관계/이벤트
  | "saju-compatibility" | "saju-love-timing" | "saju-career-timing" | "saju-auspicious-date"
  // 사주 - 심층 분석
  | "saju-personality" | "saju-aptitude" | "saju-constitution" | "saju-yongsin" | "saju-relationships";
export type SpreadType = "one-card" | "three-card" | "five-card"
  | "celtic-cross" | "relationship" | "horseshoe" | "decision"
  | "week-ahead" | "zodiac" | "tree-of-life";
export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface SpreadPosition {
  index: number;
  label: string;
  labelKo: string;
  x: number;
  y: number;
}

export interface SpreadDefinition {
  type: SpreadType;
  name: string;
  nameKo: string;
  description: string;
  positions: SpreadPosition[];
}

export interface Session {
  id: string;
  userId: string | null;
  serviceType: string;
  topic: Topic;
  status: SessionStatus;
  spreadType: SpreadType | null;
  selectedCards: SelectedCard[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface ChatMessage {
  id: string;
  role: "character" | "user" | "system";
  content: string;
  mood?: string;
  timestamp: Date;
}
