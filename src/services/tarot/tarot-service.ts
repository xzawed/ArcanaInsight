import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { buildSystemPrompt, buildReadingPrompt } from "@/services/core/prompt-builder";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
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

  getSystemPrompt(characterId?: string, locale?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();
    return buildSystemPrompt(character, locale ?? "ko");
  }

  getReadingPrompt(context: SessionContext): string {
    const spread = (context.session.spreadType
      ? this.spreadResolver.getSpreadByType(context.session.spreadType)
      : null) ?? this.spreadResolver.resolveForTopic(context.topic);
    return buildReadingPrompt(context.topic, context.selectedCards ?? [], spread);
  }

  parseResult(aiResponse: string, expectedCardCount?: number): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);

    if (parsed) {
      const cardInterpretations = (Array.isArray(parsed.cardInterpretations) ? parsed.cardInterpretations : []).map(
        (interp: { cardId: string; position: number; interpretation: string; isReversed?: boolean }) => ({
          ...interp,
          interpretation: cleanReadingText(String(interp.interpretation || "")),
        })
      );
      // 카드 수 부족 = AI 응답이 도중에 잘렸을 가능성 높음
      const isTruncated = typeof expectedCardCount === "number"
        && expectedCardCount > 0
        && cardInterpretations.length < expectedCardCount;
      return {
        cardInterpretations,
        overallReading: cleanReadingText(String(parsed.overallReading || "")),
        advice: cleanReadingText(String(parsed.advice || "")),
        ...(isTruncated ? { parseError: "truncated" as const } : {}),
        ...(typeof expectedCardCount === "number" ? { expectedCardCount } : {}),
      };
    }

    // JSON 파싱 완전 실패 — 텍스트에서 의미 있는 내용만 추출
    console.error("AI 응답 JSON 파싱 실패 (최종 fallback)\n원본 응답:", aiResponse.slice(0, 500));
    const cleanText = extractFallbackText(aiResponse);
    return {
      cardInterpretations: [],
      overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.",
      advice: "",
      parseError: "invalid_json",
      ...(typeof expectedCardCount === "number" ? { expectedCardCount } : {}),
    };
  }

}
