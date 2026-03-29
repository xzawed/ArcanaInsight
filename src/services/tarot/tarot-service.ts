import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterByService, getCharacterById } from "@/data/characters";
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

  getSystemPrompt(characterId?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();
    return buildSystemPrompt(character);
  }

  getReadingPrompt(context: SessionContext): string {
    const spread = this.spreadResolver.resolveForTopic(context.topic);
    return buildReadingPrompt(context.topic, context.selectedCards, spread);
  }

  parseResult(aiResponse: string): ReadingResult {
    // AI 응답에서 JSON 부분 추출 (마크다운 코드블록, 앞뒤 텍스트 제거)
    let jsonStr = aiResponse.trim();

    // ```json ... ``` 코드블록 제거
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // JSON 객체 부분만 추출 ({ ... } 찾기)
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      jsonStr = jsonObjMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        cardInterpretations: parsed.cardInterpretations || [],
        overallReading: parsed.overallReading || "",
        advice: parsed.advice || "",
      };
    } catch {
      // JSON 파싱 실패 시 코드/태그 제거 후 텍스트만 표시
      const cleanText = aiResponse
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[{}[\]"]/g, "")
        .replace(/cardInterpretations|cardId|position|interpretation|overallReading|advice/g, "")
        .replace(/:\s*,/g, "")
        .replace(/,\s*,/g, "")
        .trim();
      return { cardInterpretations: [], overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.", advice: "" };
    }
  }
}
