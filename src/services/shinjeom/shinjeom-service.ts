import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic, ChatMessage } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { cleanReadingText, parseJsonSafe } from "@/services/core/text-cleaner";
import { buildCharacterHeader } from "@/services/core/prompt-builder";

const topicLabels: Record<string, string> = {
  "shinjeom-general": "신수 (종합운)",
  "shinjeom-love": "연애/궁합",
  "shinjeom-wealth": "재물/사업운",
  "shinjeom-health": "건강/액막이",
  "shinjeom-career": "직장/이직",
  "shinjeom-auspicious": "택일 (날짜 선택)",
};

export class ShinjeomService implements DivinationService {
  id = "shinjeom";
  name = "신점";

  getCharacter(): CharacterConfig {
    const character = getCharacterById("luna");
    if (!character) throw new Error("Character not found");
    return character;
  }

  startSession(topic: Topic): Omit<Session, "id" | "createdAt"> {
    return {
      userId: null,
      serviceType: this.id,
      topic,
      status: "in_progress",
      spreadType: null,
      selectedCards: [],
      completedAt: null,
    };
  }

  getSystemPrompt(characterId?: string, locale?: string): string {
    const character = characterId
      ? getCharacterById(characterId) ?? this.getCharacter()
      : this.getCharacter();

    return `${buildCharacterHeader(character, "신점(영적 상담)을 제공하는 무속 상담사입니다.", locale ?? "ko")}
- 영적 직관과 무속적 지혜를 바탕으로 상담합니다.
- 사용자의 고민에 공감하며 따뜻하게 대합니다.
- 지나치게 부정적이거나 공포를 조장하지 않습니다.
- 구체적이고 실용적인 조언을 포함합니다.

중요 규칙 — 대화 구조:
- 사용자의 고민에 공감하며 핵심을 파악하기 위한 질문을 1개씩 이어갑니다.
- 사용자가 충분히 털어놓았다고 느낄 때 자연스럽게 대화를 마무리합니다.
- 최종 신점 결과는 사용자가 상담 종료를 요청할 때 제공합니다.
- 질문은 짧고 명확하게, 답변은 풍부하고 깊이 있게 합니다.

중요 규칙 — 가독성:
- 한 문장은 40자 이내로 짧게 끊어 씁니다.
- 문단 사이에 빈 줄(\\n\\n)을 넣어 구분합니다.
- 추상적 표현 대신 구체적 상황 예시를 듭니다.

중요 규칙 — 최종 결과:
- 최종 결과는 반드시 JSON 형식으로 응답합니다.
- 최종이 아닌 중간 대화에서는 일반 텍스트로 응답합니다.`;
  }

  buildConversationPrompt(
    topic: Topic,
    currentMessage: string | undefined,
    chatHistory: ChatMessage[],
    isFinalTurn: boolean,
  ): string {
    const topicLabel = topicLabels[topic] || topic;
    const historyText = chatHistory
      .filter((m) => m.role === "user" || m.role === "character")
      .map((m) => `${m.role === "user" ? "사용자" : "상담사"}: ${m.content}`)
      .join("\n\n");

    if (!isFinalTurn) {
      return `상담 주제: ${topicLabel}

이전 대화:
${historyText}

사용자의 새 메시지: ${currentMessage}

사용자의 고민을 더 깊이 이해하기 위한 공감 + 질문을 해주세요.
- 먼저 사용자의 말에 공감하는 짧은 반응 (1~2문장)
- 그 후 핵심을 파악하기 위한 질문 1개
- 일반 텍스트로 응답하세요 (JSON 아님)`;
    }

    // 사용자 종료 요청 → 전체 대화 종합하여 최종 결과
    return `상담 주제: ${topicLabel}

전체 대화:
${historyText}

지금까지의 모든 대화를 종합하여 최종 신점 결과를 제공해주세요.

응답 형식 — 반드시 아래 JSON:
{
  "overallReading": "종합 신점 해석 (3~4문단, 문단 사이 \\n\\n)",
  "topicReading": "주제별 상세 해석 (2~3문단)",
  "advice": "구체적 조언 + 액막이/부적 조언 (2~3문단)"
}

JSON 문자열 값 안의 줄바꿈은 반드시 \\n으로 표현합니다.
JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
내부 reasoning·생각·계획 단계를 출력하지 마세요 — 첫 토큰부터 곧바로 JSON을 시작하고 <think> 같은 태그도 출력 금지.`;
  }

  getReadingPrompt(context: SessionContext): string {
    return this.buildConversationPrompt(
      context.topic,
      context.chatHistory[context.chatHistory.length - 1]?.content || "",
      context.chatHistory,
      false,
    );
  }

  parseResult(aiResponse: string): ReadingResult {
    const parsed = parseJsonSafe(aiResponse);
    if (parsed) {
      const overallReading = cleanReadingText(typeof parsed.overallReading === "string" ? parsed.overallReading : "");
      const advice = cleanReadingText(typeof parsed.advice === "string" ? parsed.advice : "");
      const result: ReadingResult = {
        overallReading,
        topicReading: cleanReadingText(typeof parsed.topicReading === "string" ? parsed.topicReading : ""),
        advice,
      };
      if (!overallReading || !advice) result.parseError = "missing_fields";
      return result;
    }

    // 라우트는 isFinalTurn=true일 때만 parseResult를 호출하므로 JSON 파싱 실패 = 모델이 형식 위반.
    // raw 텍스트는 살아남지만 advice가 빠져 있으므로 parseError로 신호.
    const cleanText = cleanReadingText(aiResponse);
    return {
      overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다.",
      advice: "",
      parseError: cleanText ? "fallback_text" : "invalid_json",
    };
  }
}
