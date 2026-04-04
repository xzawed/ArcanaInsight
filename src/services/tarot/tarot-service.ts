import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { buildSystemPrompt, buildReadingPrompt } from "@/services/core/prompt-builder";
import { cleanReadingText, parseJsonSafe } from "@/services/core/text-cleaner";
import { SpreadResolver } from "./spread-resolver";

export class TarotService implements DivinationService {
  id = "tarot";
  name = "타로";
  private spreadResolver = new SpreadResolver();

  getCharacter(): CharacterConfig {
    const character = getCharacterById("arcana");
    if (!character) throw new Error("Arcana character not found");
    return character;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    const spread = this.spreadResolver.resolveForTopic(topic);
    return { userId: null, serviceType: this.id, topic, status: "in_progress", spreadType: spread.type, selectedCards: [], completedAt: null };
  }

  getSystemPrompt(characterId?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();
    return buildSystemPrompt(character);
  }

  getReadingPrompt(context: SessionContext): string {
    const spread = (context.session.spreadType
      ? this.spreadResolver.getSpreadByType(context.session.spreadType)
      : null) ?? this.spreadResolver.resolveForTopic(context.topic);
    return buildReadingPrompt(context.topic, context.selectedCards ?? [], spread);
  }

  parseResult(aiResponse: string): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);

    if (parsed) {
      return {
        cardInterpretations: (Array.isArray(parsed.cardInterpretations) ? parsed.cardInterpretations : []).map(
          (interp: { cardId: string; position: number; interpretation: string; isReversed?: boolean }) => ({
            ...interp,
            interpretation: cleanReadingText(String(interp.interpretation || "")),
          })
        ),
        overallReading: cleanReadingText(String(parsed.overallReading || "")),
        advice: cleanReadingText(String(parsed.advice || "")),
      };
    }

    // JSON 파싱 완전 실패 — 텍스트에서 의미 있는 내용만 추출
    console.error("AI 응답 JSON 파싱 실패 (최종 fallback)\n원본 응답:", aiResponse.slice(0, 500));
    const cleanText = aiResponse
      .replace(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[{}]/g, "")
      .replace(/"[a-zA-Z_]+"\s*:/g, "")    // 모든 JSON 키 패턴 제거
      .replace(/"\s*,?\s*\n/g, "\n")
      .replace(/^\s*"/gm, "")
      .replace(/",?\s*$/gm, "")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/,\s*\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      cardInterpretations: [],
      overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.",
      advice: "",
    };
  }

}
