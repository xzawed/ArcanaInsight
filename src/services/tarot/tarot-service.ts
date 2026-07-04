import { DivinationService, ReadingResult, SessionContext, CardInterpretationItem } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { buildSystemPrompt, buildReadingPrompt } from "@/services/core/prompt-builder";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
import { SpreadResolver } from "./spread-resolver";

/** JSON 필드를 안전하게 문자열로 — 객체/비문자열은 빈 문자열 (기본 stringification 회피) */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export class TarotService implements DivinationService {
  id = "tarot";
  name = "타로";
  private readonly spreadResolver = new SpreadResolver();

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

  /** AI JSON의 cardInterpretations 배열을 ReadingResult 형식으로 정규화 */
  private mapCardInterpretations(raw: unknown): CardInterpretationItem[] {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((interp: { cardId: string; position: number; interpretation?: string; symbolism?: string; situation?: string; action?: string; isReversed?: boolean }) => ({
      cardId: interp.cardId,
      position: interp.position,
      isReversed: interp.isReversed,
      ...(interp.symbolism === undefined ? {} : { symbolism: cleanReadingText(asText(interp.symbolism)) }),
      ...(interp.situation === undefined ? {} : { situation: cleanReadingText(asText(interp.situation)) }),
      ...(interp.action === undefined ? {} : { action: cleanReadingText(asText(interp.action)) }),
      // deprecated backward-compat field
      ...(interp.interpretation === undefined ? {} : { interpretation: cleanReadingText(asText(interp.interpretation)) }),
    }));
  }

  /** parseError 시그널 결정 — 카드 수 부족(truncated) 우선, 핵심 필드 빈 문자는 missing_fields.
   *  사주/신점과 동일 계약(.claude/rules/services.md) — 빈 리딩 DB 저장 방지. */
  private resolveParseError(isTruncated: boolean, overallReading: string, advice: string): "truncated" | "missing_fields" | undefined {
    if (isTruncated) return "truncated";
    if (overallReading === "" || advice === "") return "missing_fields";
    return undefined;
  }

  parseResult(aiResponse: string, expectedCardCount?: number): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);

    if (parsed) {
      const cardInterpretations = this.mapCardInterpretations(parsed.cardInterpretations);
      const overallReading = cleanReadingText(asText(parsed.overallReading));
      const advice = cleanReadingText(asText(parsed.advice));
      const isTruncated = typeof expectedCardCount === "number"
        && expectedCardCount > 0
        && cardInterpretations.length < expectedCardCount;
      const parseError = this.resolveParseError(isTruncated, overallReading, advice);
      return {
        cardInterpretations,
        overallReading,
        advice,
        ...(parsed.directAnswer === undefined ? {} : { directAnswer: cleanReadingText(asText(parsed.directAnswer)) }),
        ...(parseError ? { parseError } : {}),
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
      parseError: cleanText ? "fallback_text" : "invalid_json",
      ...(typeof expectedCardCount === "number" ? { expectedCardCount } : {}),
    };
  }

}
