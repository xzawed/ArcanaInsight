import { SelectedCard } from "./card";

export type Topic = "love" | "love-single" | "love-couple" | "finance" | "career" | "health" | "general"
  | "fortune-3y" | "fortune-5y" | "fortune-full";
export type SpreadType = "one-card" | "three-card" | "five-card";
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
