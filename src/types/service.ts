import { CharacterConfig } from "./character";
import { Session, Topic, ChatMessage } from "./session";
import { SelectedCard } from "./card";

export interface SajuSections {
  structure: string;
  elements: string;
  fortune: string;
  guidance: string;
}

export interface ShinjeomSections {
  spiritual: string;
  current: string;
  obstacles: string;
  future: string;
}

export interface CardInterpretationItem {
  cardId: string;
  position: number;
  interpretation?: string;
  symbolism?: string;
  situation?: string;
  action?: string;
  isReversed?: boolean;
}

export interface ReadingResult {
  cardInterpretations?: CardInterpretationItem[];
  overallReading: string;
  directAnswer?: string;
  advice: string;
  topicReading?: string;
  shareToken?: string | null;
  sajuSections?: SajuSections;
  shinjeomSections?: ShinjeomSections;
  /** AI 응답이 잘렸거나 JSON 파싱 실패 시 클라이언트가 감지하기 위한 시그널.
   *  - truncated: 카드 수 부족 등 응답이 도중에 잘림
   *  - invalid_json: JSON 파싱 완전 실패 + fallback 텍스트도 비어있음
   *  - fallback_text: JSON 파싱 실패 후 raw 텍스트 추출은 성공
   *  - missing_fields: JSON 파싱 성공이지만 핵심 필드(overallReading 또는 advice)가 빈 문자열 */
  parseError?: "truncated" | "invalid_json" | "fallback_text" | "missing_fields";
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
  getSystemPrompt(characterId?: string, locale?: string): string;
  getReadingPrompt(context: SessionContext): string;
  parseResult(aiResponse: string): ReadingResult;
}
