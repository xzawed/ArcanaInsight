import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic, ChatMessage } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
import { buildCharacterHeader, buildUserInfoPrompt, getLanguageFooter } from "@/services/core/prompt-builder";

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
- 사용자의 고민에 깊이 공감하며 따뜻하게 대합니다.
- 지나치게 부정적이거나 공포를 조장하지 않습니다.
- 구체적이고 실용적인 조언을 충분한 깊이로 포함합니다.

중요 규칙 — 대화 구조:
- 사용자의 고민에 공감하며 핵심을 파악하기 위한 질문을 1개씩 이어갑니다.
- 사용자가 충분히 털어놓았다고 느낄 때 자연스럽게 대화를 마무리합니다.
- 최종 신점 결과는 사용자가 상담 종료를 요청할 때 제공합니다.
- 중간 대화에서도 공감과 영적 통찰을 풍부하게 담아 응답합니다.

중요 규칙 — 가독성:
- 문단 사이에 빈 줄(\\n\\n)을 넣어 구분합니다.
- 추상적 표현 대신 구체적 상황·시기·사례를 들어 설명합니다.
- 각 응답은 충분한 깊이와 분량으로 — 공감·영적 해석·실질 조언이 모두 담기도록 합니다.

중요 규칙 — 최종 결과:
- 최종 결과는 반드시 JSON 형식으로 응답합니다.
- 최종이 아닌 중간 대화에서는 일반 텍스트로 응답합니다.${getLanguageFooter(locale ?? "ko")}`;
  }

  buildConversationPrompt(
    topic: Topic,
    currentMessage: string | undefined,
    chatHistory: ChatMessage[],
    isFinalTurn: boolean,
    userInfo?: { name: string; birthDate: string; gender: string; birthTime: string | null; mbti?: string } | null,
  ): string {
    const topicLabel = topicLabels[topic] || topic;
    const userInfoText = buildUserInfoPrompt(userInfo);
    const historyText = chatHistory
      .filter((m) => m.role === "user" || m.role === "character")
      .map((m) => `${m.role === "user" ? "사용자" : "상담사"}: ${m.content}`)
      .join("\n\n");

    if (!isFinalTurn) {
      return `상담 주제: ${topicLabel}${userInfoText}

이전 대화:
${historyText}

사용자의 새 메시지: ${currentMessage}

아래 구조로 풍부하게 응답해주세요.
1. 공감 (2~3문장): 사용자의 감정을 읽어주고, 상황을 구체적으로 반영해서 진심으로 공감
2. 영적 통찰 (1~2문장): 신명이 이 상황에서 감지하는 기운이나 흐름에 대한 간략한 언급
3. 탐구 질문 (1개): 상황의 핵심을 더 깊이 파악하기 위한 구체적 질문
일반 텍스트로 응답하세요 (JSON 아님)`;
    }

    // 사용자 종료 요청 → 전체 대화 종합하여 최종 결과
    return `상담 주제: ${topicLabel}${userInfoText}

전체 대화:
${historyText}

지금까지의 모든 대화를 종합하여 최종 신점 결과를 충분한 깊이로 제공해주세요.

응답 형식 — 반드시 아래 JSON:
{
  "overallReading": "【신명의 메시지】전체 기운과 신명이 전하는 핵심 메시지\\n\\n【현재 흐름】지금 이 시기의 운세 에너지와 상황 맥락\\n\\n【환경과 주변 기운】주변 인물·환경이 미치는 영향\\n\\n【어려움의 영적 원인】현재 겪고 있는 문제의 근원적 의미\\n\\n【가까운 미래 전망】앞으로 3~6개월의 흐름 예측\\n\\n【중요한 시기】특히 주의하거나 기회가 되는 구체적 시점\\n\\n【삶의 방향】이 상황이 삶 전체에서 갖는 의미와 성장 포인트. 각 섹션 2~4문장 이상으로 충분히 서술.",
  "topicReading": "선택 주제에 대한 심층 신점 해석.\\n\\n긍정적 기운과 도전 요소를 균형 있게 분석.\\n\\n시기별 구체적 흐름(이번 달·3개월·6개월).\\n\\n이 주제와 관련된 중요 인물·환경·기운 분석.\\n\\n상황이 바뀌는 전환점 예측. 최소 5문단 이상.",
  "advice": "【지금 당장 할 것】오늘부터 실천 가능한 구체적 행동 2~3가지\\n\\n【기도·의식】정화와 좋은 기운을 부르는 방법 (구체적 방법과 시기)\\n\\n【액막이·보호】현재 상황에 맞는 영적 보호 방법\\n\\n【관계·환경 조언】주변 사람·공간·물건에 관한 실질 조언\\n\\n【마음가짐】내면의 변화를 위한 조언과 앞으로 나아갈 방향. 최소 4문단 이상."
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
    const cleanText = extractFallbackText(aiResponse);
    return {
      overallReading: cleanText || "해석 결과를 처리하는 중 문제가 발생했습니다.",
      advice: "",
      parseError: cleanText ? "fallback_text" : "invalid_json",
    };
  }
}
