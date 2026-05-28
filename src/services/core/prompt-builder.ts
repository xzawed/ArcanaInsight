import { CharacterConfig } from "@/types/character";
import { SelectedCard } from "@/types/card";
import { Topic, SpreadDefinition } from "@/types/session";
import type { CharacterMemoryEntry } from "@/lib/db/character-context";
import { timeToSijin } from "@/lib/time-utils";
import { UserInfo } from "@/types/user-info";

const topicLabels: Partial<Record<Topic, string>> = {
  love: "연애/관계", "love-single": "연애/관계 (솔로)", "love-couple": "연애/관계 (커플)",
  finance: "재정/금전", career: "직장/진로", health: "건강", general: "일반 상담",
};

/**
 * locale별 응답 언어 강제 + JSON 키 영어 고정 명시.
 * - ko: 시스템 프롬프트가 이미 한국어이므로 노이즈 최소화 (지시 생략).
 * - en/ja: **CRITICAL** 강조 + 한국어 금지 명시 + JSON 키 영어 고정. 시스템 프롬프트가 한국어로 작성되어 있어 모델이 한국어로 응답하는 회귀를 막기 위해 시스템 프롬프트 **맨 앞**과 **맨 뒤** 양쪽에 주입한다.
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ko: "",
  en: "**CRITICAL — RESPONSE LANGUAGE**: All response text (including all JSON string values) MUST be in natural English. Korean and Japanese are STRICTLY FORBIDDEN in the response, even if the system prompt below is written in Korean. The Korean text in the system prompt is for your INSTRUCTIONS only — your output must be 100% English. Use the EXACT English JSON keys (cardInterpretations, cardId, position, symbolism, situation, overallReading, topicReading, advice) — translate only the values, never the keys.",
  ja: "【最重要 — 応答言語】回答本文(すべてのJSON文字列値を含む)は必ず自然な日本語のみで記述してください。下記のシステムプロンプトが韓国語で書かれていても、応答に韓国語と英語を使用することは厳禁です。システムプロンプトの韓国語はあなたへの指示用であり、出力は100%日本語でなければなりません。JSONのキー (cardInterpretations, cardId, position, symbolism, situation, overallReading, topicReading, advice) は必ず英語のまま使用し、値のみを日本語で記述してください。",
};

/** 응답 직전 마지막 강조 — 모델은 가까운 위치의 지시를 더 강하게 따른다. */
const LANGUAGE_FOOTER: Record<string, string> = {
  ko: "",
  en: "\n\n**FINAL REMINDER**: Output language MUST be English. Begin your JSON response now.",
  ja: "\n\n【最終確認】出力言語は必ず日本語です。今すぐJSON応答を開始してください。",
};

/** locale별 시스템 프롬프트 끝에 주입되는 응답 언어 강조 footer (saju/shinjeom service에서도 재사용). */
export function getLanguageFooter(locale: string = "ko"): string {
  return LANGUAGE_FOOTER[locale] ?? "";
}

export function buildCharacterHeader(character: CharacterConfig, subtitle?: string, locale: string = "ko"): string {
  const subtitleLine = subtitle ? `\n${subtitle}` : "";
  const langInstruction = LANGUAGE_INSTRUCTIONS[locale] ?? "";
  const langLine = langInstruction ? `\n- ${langInstruction}` : "";
  return `당신은 "${character.name}" (${character.nameJp})입니다.${subtitleLine}

성격: ${character.personality}
배경: ${character.description}
전문 분야: ${character.speciality}

말투 규칙:
- ${character.speechStyle}${langLine}`;
}

export function buildSystemPrompt(character: CharacterConfig, locale: string = "ko"): string {
  const langTop = LANGUAGE_INSTRUCTIONS[locale] ?? "";
  const langTopBlock = langTop ? `${langTop}\n\n` : "";
  const langFooter = LANGUAGE_FOOTER[locale] ?? "";
  return `${langTopBlock}${buildCharacterHeader(character, undefined, locale)}
- 수십 년 경력의 타로 마스터로서, 카드 한 장 한 장에 담긴 상징과 원형(archetype)을 깊이 있게 풀어냅니다.
- 상담자의 에너지와 공명하며, 따뜻하고 통찰력 있는 리딩을 전달합니다.
- 어둠 속에서도 빛을 발견하는 균형 잡힌 시각을 유지합니다.

중요 규칙 — 해석 품질 (프리미엄 기준):
- 단순 키워드 나열이나 사전적 설명이 아닌, 카드의 에너지와 의미를 몰입감 있는 문장으로 표현합니다.
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) / action(행동 제안) 3개 섹션으로 구성합니다.
- symbolism: 카드의 시각적 이미지(인물·색감·상징물·숫자)에서 출발해 원형적·신화적·심리적 의미까지 3~4문단으로 탐구합니다. 카드가 가진 에너지와 분위기를 감각적으로 전달합니다.
- situation: 이 카드가 해당 위치에서 가리키는 에너지와 흐름을 3~4문단으로 서술합니다. 에너지의 방향을 묘사하되 상담자가 자신의 상황과 직접 연결할 수 있는 구체적 통찰을 포함합니다. 상담자가 읽으며 "이것이 내 이야기구나"라고 공명할 수 있는 깊이로 씁니다.
- action: 이 카드가 이 위치에서 상담자에게 제안하는 구체적 행동·방향을 1~2문단으로 서술합니다. 상담자가 어떤 국면에 있든 적용 가능하도록 적극적 국면 / 정체된 국면 / 마무리 국면 세 가지를 고려합니다. 역방향일 경우 내려놓아야 할 것의 관점에서 제시합니다.
- 직접 답변(directAnswer): 상담자의 현재 상황을 단 하나로 가정하지 말고 가능한 모든 상황을 포괄합니다. 4~5문단으로: ① 어떤 상황에서도 공통인 카드의 핵심 메시지 ② "이미 진행 중이라면" 시나리오 ③ "아직 시작 전이거나 막혀 있다면" 시나리오 ④ "이 방향이 지금 맞지 않다면" 시나리오 ⑤ 어느 시나리오에서든 지금 당장 취할 수 있는 공통 행동과 변화의 조건.
- 종합 해석(overallReading): 카드들이 함께 엮어내는 이야기와 큰 흐름을 5~6문단으로 풀어냅니다. 스프레드 전체를 하나의 서사로 연결하여 핵심 메시지를 전달합니다.
- 조언(advice): 리딩에서 자연스럽게 흘러나오는 통찰과 지혜를 3~4문단으로 담습니다. 상담자가 스스로 방향을 발견하도록 이끄는 방식으로 씁니다.

중요 규칙 — 문체와 표현:
- 풍부하고 여운 있는 문장을 씁니다. 읽는 사람이 몰입하고 공명할 수 있는 표현을 사용합니다.
- 카드의 상징어와 이미지를 살려 감각적으로 묘사합니다. (예: "전차의 흰 말과 검은 말이 팽팽한 긴장 속에 나란히 달립니다")
- 상담자의 상황을 단정짓는 표현 대신, 가능성을 열어두는 표현을 사용합니다.
  ("지금 당신은 ~입니다" → "이 카드는 ~의 에너지를 전하고 있습니다")
- 타로 특유의 신비롭고 깊이 있는 분위기를 유지하되, 전문 용어는 자연스럽게 풀어 씁니다.
- 각 문단은 2~4문장으로 구성하고, 문단 사이에 빈 줄(\\n\\n)로 구분합니다.

중요 규칙 — 카드별 해석 독립성:
- 각 카드의 symbolism·situation은 해당 위치(position)의 관점에서만 작성합니다.
- 다른 위치의 카드를 참조하거나 중복 언급하지 않습니다.
- 카드 간 상호작용과 전체 흐름은 반드시 종합 해석(overallReading)에서만 다룹니다.

응답 형식 — 절대 규칙:
- 반드시 아래 JSON 형식으로만 응답합니다.
- JSON 앞뒤에 어떤 텍스트도 추가하지 않습니다.
- 마크다운 코드블록을 사용하지 않습니다.
- 내부 reasoning·생각·계획 단계를 출력하지 마세요. 첫 토큰부터 곧바로 JSON을 시작합니다.
- <think> 같은 태그·메타 텍스트도 출력 금지 (응답 토큰 한도 내에 JSON 본문이 모두 들어가야 함).
- JSON 문자열 값 안의 줄바꿈은 반드시 \\n 이스케이프로 표현합니다. 실제 줄바꿈 문자를 사용하지 않습니다.
{
  "cardInterpretations": [
    {
      "cardId": "카드 ID",
      "position": 0,
      "symbolism": "카드 상징 탐구 문단1\\n\\n문단2\\n\\n문단3",
      "situation": "구체적 상황 묘사 문단1\\n\\n문단2\\n\\n문단3\\n\\n문단4",
      "action": "행동 제안 문단1\\n\\n문단2"
    }
  ],
  "overallReading": "전체 서사 연결 문단1\\n\\n문단2\\n\\n문단3",
  "directAnswer": "다면적 직접 답변 문단1\\n\\n문단2\\n\\n문단3\\n\\n문단4",
  "advice": "조언 내용"
}${langFooter}`;
}

export function buildReadingPrompt(topic: Topic, selectedCards: SelectedCard[], spread: SpreadDefinition): string {
  const cardCount = selectedCards.length;

  const cardDescriptions = selectedCards.map((sc) => {
    const pos = spread.positions[sc.position] ?? { labelKo: `위치 ${sc.position + 1}`, label: `Position ${sc.position + 1}` };
    const direction = sc.isReversed ? "역방향" : "정방향";
    const meanings = sc.isReversed ? sc.card.reversed : sc.card.upright;
    return `- 위치: ${pos.labelKo} (${pos.label})
  카드: ${sc.card.nameKo} (${sc.card.name}) [${direction}]
  카드ID: ${sc.card.id}
  포지션: ${sc.position}
  키워드: ${meanings.keywords.join(", ")}
  기본 의미: ${meanings.meaning}`;
  }).join("\n\n");

  const topicContext = topic === "love-single"
    ? "\n\n상담 맥락: 현재 솔로(싱글) 상태입니다. 새로운 만남의 가능성, 자기 자신에 대한 이해, 이상적인 파트너상, 연애 준비도 등을 중심으로 해석해주세요."
    : topic === "love-couple"
    ? "\n\n상담 맥락: 현재 연인/파트너가 있는 커플 상태입니다. 관계의 현재 상태, 소통 방식, 갈등 해결, 관계 발전 방향, 신뢰와 친밀감 등을 중심으로 해석해주세요."
    : "";

  // 카드 수에 관계없이 동일한 깊이의 해석 — 카드 1장이든 12장이든 충분한 분량으로 작성한다
  const depthGuide = `해석 품질 지침 (${cardCount}장 스프레드, 프리미엄 기준):
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) 2개 섹션으로 나눠 작성합니다.

symbolism (카드 상징) — 3~4문단:
카드의 그림 속 요소(인물, 색감, 배경, 숫자, 동물 등)를 감각적으로 묘사하며 시작합니다.
이 이미지들이 가진 원형적 의미, 신화적 배경, 심리적 상징을 풍부하게 탐구합니다.
카드 전체가 발산하는 에너지와 분위기를 독자가 실감할 수 있도록 서술합니다.
역방향일 경우, 에너지의 방향이 내면으로 전환되거나 저항이 생기는 맥락을 설명합니다.

situation (상황 묘사) — 3~4문단:
이 카드가 해당 위치에서 가리키는 에너지와 주제를 묘사합니다.
특정 사실을 단정짓지 않고, "어떤 흐름과 에너지가 이 자리에 흐르고 있는가"를 서술합니다.
상담자가 읽으며 자신의 이야기와 자연스럽게 연결되도록 깊이와 울림이 있게 씁니다.
내면의 움직임, 감정의 결, 관계의 에너지, 상황의 본질적 성격을 포착합니다.

종합 해석(overallReading) — 5~6문단:
카드들이 함께 만들어내는 이야기를 하나의 서사로 엮습니다.
각 위치의 흐름이 어떻게 연결되고 어디를 향하는지 큰 그림을 그려줍니다.
이 시점에서 상담자에게 가장 중요한 메시지와 통찰을 전달합니다.

조언(advice) — 3~4문단:
리딩에서 자연스럽게 흘러나오는 지혜를 담습니다.
상담자가 스스로 깨닫고 방향을 찾을 수 있도록 이끌되, 일방적 지시보다 통찰을 제안합니다.`;

  // 스프레드 구조 설명
  const positionGuide = spread.positions.map((p) =>
    `  - 위치 ${p.index} "${p.labelKo}": 이 위치에서 카드는 "${p.label}" 관점에서 해석합니다.`
  ).join("\n");

  return `상담 주제: ${topicLabels[topic] ?? topic}
스프레드: ${spread.nameKo} (${spread.name})
스프레드 설명: ${spread.description}${topicContext}

${depthGuide}

스프레드 각 위치의 해석 관점:
${positionGuide}

선택된 카드:
${cardDescriptions}

위 카드들을 프리미엄 타로 마스터 수준으로 해석해주세요.
- 각 카드의 cardId와 position 값을 JSON 응답에 정확히 반환하세요.
- 각 카드는 symbolism / situation 2개 섹션으로 작성하세요.
- symbolism은 카드 이미지와 상징을 감각적이고 깊이 있게 탐구하세요.
- situation은 에너지와 흐름을 묘사하되, 상담자가 공명할 수 있는 울림 있는 문장으로 쓰세요.
- 카드별 해석은 반드시 해당 위치의 관점에서 독립적으로 작성하세요.
- 종합 해석은 모든 카드를 하나의 이야기로 엮어 깊이 있게 서술하세요.`;
}

/** 사용자 입력값에서 줄바꿈 문자를 제거해 프롬프트 인젝션 차단 */
function sanitizeField(value: string, maxLength = 100): string {
  return value.replace(/[\r\n]/g, " ").slice(0, maxLength);
}

export function buildUserInfoPrompt(
  userInfo?: UserInfo | null
): string {
  if (!userInfo) return "";
  const genderMap: Record<string, string> = { male: "남성", female: "여성", other: "기타" };
  const name = sanitizeField(userInfo.name, 50);
  const birthDate = sanitizeField(userInfo.birthDate, 20);
  const gender = sanitizeField(genderMap[userInfo.gender] || userInfo.gender, 10);

  let birthTimeStr: string;
  if (!userInfo.birthTime) {
    birthTimeStr = "알 수 없음";
  } else {
    const sijin = timeToSijin(userInfo.birthTime);
    birthTimeStr = sijin
      ? `${userInfo.birthTime} (${sijin.label}, ${sijin.hanja})`
      : sanitizeField(userInfo.birthTime, 20);
  }

  const mbtiLine = userInfo.mbti ? `\n- MBTI: ${sanitizeField(userInfo.mbti, 10)}` : "";
  return `\n\n상담자 정보:\n- 이름: ${name}\n- 생년월일: ${birthDate}\n- 성별: ${gender}\n- 태어난 시: ${birthTimeStr}${mbtiLine}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}

/** 사용자 자유 질문을 프롬프트에 추가 (최대 200자, 인젝션 방지) */
export function buildFreeQuestionPrompt(question?: string | null): string {
  if (!question?.trim()) return "";
  const sanitized = sanitizeField(question, 200);
  return `\n\n사용자 질문: "${sanitized}"\n이 질문을 카드 해석에 반영하여 직접적으로 답해주세요.`;
}

/** 최근 세션 요약을 시스템 프롬프트에 주입 */
export function buildCharacterMemoryPrompt(memories: CharacterMemoryEntry[]): string {
  if (memories.length === 0) return "";
  const serviceLabel: Record<string, string> = { tarot: "타로", saju: "사주" };
  const lines = memories.map((m) => {
    const label = serviceLabel[m.serviceType] ?? "신점";
    return `- [${m.date}] ${label}: ${m.overallReading}`;
  });
  return `\n\n이전 상담 기억 (참고용, 직접 언급 금지):\n${lines.join("\n")}`;
}
