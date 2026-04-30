import { CharacterConfig } from "./character";
import { Session, Topic, ChatMessage } from "./session";
import { SelectedCard } from "./card";

export interface ReadingResult {
  cardInterpretations?: { cardId: string; position: number; interpretation: string; isReversed?: boolean; }[];
  overallReading: string;
  advice: string;
  topicReading?: string;
  shareToken?: string | null;
  /** AI 응답이 잘렸거나 JSON 파싱 실패 시 클라이언트가 감지하기 위한 시그널 */
  parseError?: "truncated" | "invalid_json";
  /** 요청 시 선택된 카드 수 — truncated 판정 기준 */
  expectedCardCount?: number;
}

export interface SessionContext {
  session: Session;
  selectedCards?: SelectedCard[];
  chatHistory: ChatMessage[];
  topic: Topic;
}

export interface AIProvider {
  generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string>;
  streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown>;
}

export interface DivinationService {
  id: string;
  name: string;
  getCharacter(): CharacterConfig;
  startSession(topic: Topic): Omit<Session, "id" | "createdAt">;
  getSystemPrompt(characterId?: string): string;
  getReadingPrompt(context: SessionContext): string;
  parseResult(aiResponse: string): ReadingResult;
}
