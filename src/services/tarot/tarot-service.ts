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
    // 사용자가 선택한 spreadType 사용 (topic 기반 자동 결정이 아닌 실제 선택값)
    const spread = this.spreadResolver.getSpreadByType(context.session.spreadType)
      ?? this.spreadResolver.resolveForTopic(context.topic);
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
        cardInterpretations: (parsed.cardInterpretations || []).map(
          (interp: { cardId: string; position: number; interpretation: string; isReversed?: boolean }) => ({
            ...interp,
            interpretation: this.cleanReadingText(interp.interpretation),
          })
        ),
        overallReading: this.cleanReadingText(parsed.overallReading || ""),
        advice: this.cleanReadingText(parsed.advice || ""),
      };
    } catch (e) {
      // JSON 파싱 실패 시 코드/태그 제거 후 텍스트만 표시
      console.error("AI 응답 JSON 파싱 실패:", e, "\n원본 응답:", aiResponse.slice(0, 500));
      const cleanText = aiResponse
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[{}[\]"]/g, "")
        .replace(/\b(cardInterpretations|cardId|position|interpretation|overallReading|advice|isReversed)\b\s*:/g, "")
        .replace(/,\s*,+/g, "")
        .replace(/^\s*,|,\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return { cardInterpretations: [], overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.", advice: "" };
    }
  }

  /** JSON 파싱 후 텍스트에 남은 이스케이프/코드 잔여물 정리 */
  private cleanReadingText(text: string): string {
    return text
      .replace(/\\n\\n/g, "\n\n")     // 이중 이스케이프 \\n\\n → 실제 개행 2줄
      .replace(/\\n/g, "\n")           // 이중 이스케이프 \\n → 실제 개행
      .replace(/\\r/g, "")             // 캐리지 리턴 제거
      .replace(/\\t/g, " ")            // 탭 → 공백
      .replace(/\\"/g, '"')            // 이스케이프된 따옴표 복원
      .replace(/\\/g, "")              // 남은 불필요한 백슬래시 제거
      .replace(/\n{3,}/g, "\n\n")      // 과도한 개행 정리
      .trim();
  }
}
