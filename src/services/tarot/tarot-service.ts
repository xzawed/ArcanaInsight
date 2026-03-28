import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterByService } from "@/data/characters";
import { buildSystemPrompt, buildReadingPrompt } from "@/services/core/prompt-builder";
import { SpreadResolver } from "./spread-resolver";

export class TarotService implements DivinationService {
  id = "tarot";
  name = "타로";
  private spreadResolver = new SpreadResolver();

  getCharacter(): CharacterConfig {
    const character = getCharacterByService("tarot");
    if (!character) throw new Error("Tarot character not found");
    return character;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    const spread = this.spreadResolver.resolveForTopic(topic);
    return { userId: null, serviceType: this.id, topic, status: "in_progress", spreadType: spread.type, selectedCards: [], completedAt: null };
  }

  getSystemPrompt(): string { return buildSystemPrompt(this.getCharacter()); }

  getReadingPrompt(context: SessionContext): string {
    const spread = this.spreadResolver.resolveForTopic(context.topic);
    return buildReadingPrompt(context.topic, context.selectedCards, spread);
  }

  parseResult(aiResponse: string): ReadingResult {
    try {
      const parsed = JSON.parse(aiResponse);
      return { cardInterpretations: parsed.cardInterpretations || [], overallReading: parsed.overallReading || "", advice: parsed.advice || "" };
    } catch {
      return { cardInterpretations: [], overallReading: aiResponse, advice: "" };
    }
  }
}
