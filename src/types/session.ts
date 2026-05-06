import { SelectedCard } from "./card";

export type Topic =
  // 타로 전용
  | "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  // 사주 - 분석영역 (8개, 시간단위와 독립)
  | "saju-general" | "saju-love-single" | "saju-love-couple"
  | "saju-career" | "saju-health" | "saju-personality"
  | "saju-compatibility" | "saju-auspicious-date"
  // 신점 - 상담 주제 (6개)
  | "shinjeom-general" | "shinjeom-love" | "shinjeom-wealth" | "shinjeom-health"
  | "shinjeom-career" | "shinjeom-auspicious";

export type SajuTimeRange =
  | "this-week"      // 이번 주 (일운 7일)
  | "this-month"     // 이번 달 (월운)
  | "this-year"      // 올해 (세운)
  | "next-year"      // 내년 (세운)
  | "three-year"     // 3년 (다년 세운)
  | "five-year"      // 5년 (다년 세운)
  | "full-fortune";  // 전체 대운
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
  rotation?: number;
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
