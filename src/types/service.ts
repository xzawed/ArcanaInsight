import { CharacterConfig } from "./character";
import { Session, Topic, ChatMessage } from "./session";
import { SelectedCard } from "./card";

export interface ReadingResult {
  cardInterpretations?: { cardId: string; position: number; interpretation: string; isReversed?: boolean; }[];
  overallReading: string;
  advice: string;
  topicReading?: string;
  shareToken?: string | null;
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
