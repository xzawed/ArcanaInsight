import { DivinationService, ReadingResult, SessionContext } from "@/types/service";
import { CharacterConfig } from "@/types/character";
import { Session, Topic, ChatMessage } from "@/types/session";
import { getCharacterById } from "@/data/characters";
import { cleanReadingText, parseJsonSafe, extractFallbackText } from "@/services/core/text-cleaner";
import { buildCharacterHeader, buildUserInfoPrompt, getLanguageFooter, buildDirectAnswerContract, buildReadabilityContract } from "@/services/core/prompt-builder";
import { UserInfo } from "@/types/user-info";

const topicLabels: Record<string, string> = {
  "shinjeom-general": "신수 (종합운)",
  "shinjeom-love": "연애/궁합",
  "shinjeom-wealth": "재물/사업운",
  "shinjeom-health": "건강/액막이",
  "shinjeom-career": "직장/이직",
  "shinjeom-auspicious": "택일 (날짜 선택)",
};

/** shinjeomSections 필드를 안전하게 정제 — 비문자열은 빈 문자열 (기본 stringification 회피) */
function toShinjeomSectionText(value: unknown): string {
  return cleanReadingText(typeof value === "string" ? value : "");
}

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

    const readability = buildReadabilityContract("shinjeom");
    return `${buildCharacterHeader(character, "신점(영적 상담)을 제공하는 무속 상담사입니다.", locale ?? "ko")}
- 영적 직관과 무속적 지혜를 바탕으로 상담합니다.
- 사용자의 고민에 깊이 공감하며 따뜻하게 대합니다.
- 지나치게 부정적이거나 공포를 조장하지 않습니다.
- 구체적이고 실용적인 조언을 충분한 깊이로 포함합니다.

중요 규칙 — 대화 구조:
- 사용자의 고민에 공감하며 핵심을 파악하기 위한 질문을 1개씩 이어갑니다.
- 사용자가 충분히 털어놓았다고 느낄 때 자연스럽게 대화를 마무리합니다.
- 최종 신점 결과는 사용자가 상담 종료를 요청할 때 제공합니다.
- 중간 대화에서도 공감과 위로를 충분히 담아 응답합니다.

${readability.systemSpec}
${readability.fewShot}
- 문단 사이에 빈 줄(\\n\\n)을 넣어 구분합니다.
- 각 응답은 충분한 깊이와 분량으로 — 공감·영적 해석·실질 조언이 모두 담기도록 합니다.

중요 규칙 — 최종 결과:
- 최종 결과는 반드시 JSON 형식으로 응답합니다.
- 최종이 아닌 중간 대화에서는 일반 텍스트로 응답합니다.
${readability.footerReminder}${getLanguageFooter(locale ?? "ko")}`;
  }

  buildConversationPrompt(
    topic: Topic,
    currentMessage: string | undefined,
    chatHistory: ChatMessage[],
    isFinalTurn: boolean,
    userInfo?: UserInfo | null,
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

아래 구조로 따뜻하고 쉽게 응답해주세요.
1. 공감 (2~3문장): 사용자의 감정을 읽어주고, 상황을 구체적으로 반영해서 진심으로 공감
2. 느낌 한마디 (1~2문장): 지금 상황에서 마음에 걸리는 점을 어려운 말 없이 부드럽게 짚어주기
3. 탐구 질문 (1개): 상황의 핵심을 더 깊이 파악하기 위한 구체적 질문
일반 텍스트로 응답하세요 (JSON 아님)`;
    }

    // 사용자 종료 요청 → 전체 대화 종합하여 최종 결과
    const contract = buildDirectAnswerContract("shinjeom");
    // 상담자가 가장 알고 싶어한 핵심 질문 = 첫 사용자 메시지(주된 고민). 최종 종합 전에 직답 앵커로 재노출.
    const coreQuestion = chatHistory.find((m) => m.role === "user")?.content?.trim();
    const coreQuestionBlock = coreQuestion
      ? `\n상담자가 가장 알고 싶어한 핵심 질문: "${coreQuestion.replace(/[\r\n]/g, " ").slice(0, 200)}"\n→ 아래 종합에 앞서 directAnswer에서 이 질문에 먼저 직접 답하세요.`
      : "";

    return `상담 주제: ${topicLabel}${userInfoText}${coreQuestionBlock}

전체 대화:
${historyText}

지금까지의 모든 대화를 종합하여 최종 신점 결과를 충분한 깊이로 제공해주세요.
각 문단에는 상담자가 자기 삶으로 옮길 수 있는 구체적인 사례를 최소 하나 넣고, 분량이 남아도 추상적인 표현으로 늘리지 말고 구체적인 사례로 채웁니다.
${contract.systemSpec}

응답 형식 — 반드시 아래 JSON:
{
${contract.schemaLine}
  "shinjeomSections": {
    "spiritual": "지금 상황에서 가장 크게 느껴지는 기운과 상담자에게 전하고 싶은 말. 무속 표현은 살리되 바로 쉬운 말로 뜻을 함께 풀어 5~6문단으로 서술.",
    "current": "지금 이 시기의 운세와 상황, 주변 사람·환경이 주는 영향을 눈에 보이는 구체적인 장면으로 5~6문단 분석.",
    "obstacles": "지금 힘든 일의 뿌리와 조심할 점을, 겁주지 말고 따뜻하게 5~6문단으로 서술.",
    "future": "앞으로 3~6개월의 흐름, 바뀌는 시점, 기회가 되는 때, 나아갈 방향을 쉬운 말로 5~6문단 서술."
  },
  "overallReading": "【마음에 닿는 말】상담자에게 가장 먼저 전하고 싶은 핵심 메시지\\n\\n【지금의 흐름】지금 이 시기의 운세와 상황\\n\\n【주변 사람들】주변 사람·환경이 주는 영향\\n\\n【힘든 일의 뿌리】지금 겪는 문제의 근본 원인\\n\\n【앞날 전망】앞으로 3~6개월의 흐름\\n\\n【중요한 때】특히 조심하거나 기회가 되는 시점\\n\\n【삶의 방향】이 일이 삶에서 갖는 의미와 나아갈 길. 소제목은 위처럼 쉬운 말로, 각 섹션 3~5문장 이상으로 충분히 서술.",
  "topicReading": "선택 주제에 대한 깊이 있는 신점 해석.\\n\\n좋은 기운과 조심할 점을 균형 있게.\\n\\n시기별 흐름(이번 달·3개월·6개월).\\n\\n관련된 중요한 사람·환경.\\n\\n상황이 바뀌는 시점 예측. 최소 6문단 이상.",
  "advice": "【지금 당장 할 것】오늘부터 실천 가능한 구체적 행동 2~3가지\\n\\n【마음을 지키는 법】마음을 다잡고 좋은 기운을 부르는 방법(어려운 말 없이 쉽게)\\n\\n【관계·환경 조언】주변 사람·공간·물건에 관한 실질 조언\\n\\n【마음가짐】내면의 변화를 위한 조언과 나아갈 방향. 최소 5문단 이상."
}

JSON 문자열 값 안의 줄바꿈은 반드시 \\n으로 표현합니다.
JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
내부 reasoning·생각·계획 단계를 출력하지 마세요 — 첫 토큰부터 곧바로 JSON을 시작하고 <think> 같은 태그도 출력 금지.
${contract.footerReminder}`;
  }

  getReadingPrompt(context: SessionContext): string {
    return this.buildConversationPrompt(
      context.topic,
      context.chatHistory.at(-1)?.content || "",
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
      // directAnswer 추출 — 상담자 핵심 질문에 대한 직답 (존재 시에만)
      if (parsed.directAnswer !== undefined) {
        result.directAnswer = cleanReadingText(typeof parsed.directAnswer === "string" ? parsed.directAnswer : "");
      }
      // shinjeomSections 추출 (새 형식)
      if (parsed.shinjeomSections && typeof parsed.shinjeomSections === "object") {
        const s = parsed.shinjeomSections as Record<string, unknown>;
        result.shinjeomSections = {
          spiritual: toShinjeomSectionText(s.spiritual),
          current: toShinjeomSectionText(s.current),
          obstacles: toShinjeomSectionText(s.obstacles),
          future: toShinjeomSectionText(s.future),
        };
      }
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
