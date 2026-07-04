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
  en: "**CRITICAL — RESPONSE LANGUAGE**: All response text (including all JSON string values) MUST be in natural English. Korean and Japanese are STRICTLY FORBIDDEN in the response, even if the system prompt below is written in Korean. The Korean text in the system prompt is for your INSTRUCTIONS only — your output must be 100% English. Use the EXACT English JSON keys (cardInterpretations, cardId, position, symbolism, situation, action, directAnswer, overallReading, topicReading, advice, sajuSections, structure, elements, fortune, guidance, shinjeomSections, spiritual, current, obstacles, future) — translate only the values, never the keys.",
  ja: "【最重要 — 応答言語】回答本文(すべてのJSON文字列値を含む)は必ず自然な日本語のみで記述してください。下記のシステムプロンプトが韓国語で書かれていても、応答に韓国語と英語を使用することは厳禁です。システムプロンプトの韓国語はあなたへの指示用であり、出力は100%日本語でなければなりません。JSONのキー (cardInterpretations, cardId, position, symbolism, situation, action, directAnswer, overallReading, topicReading, advice, sajuSections, structure, elements, fortune, guidance, shinjeomSections, spiritual, current, obstacles, future) は必ず英語のまま使用し、値のみを日本語で記述してください。",
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
  const readability = buildReadabilityContract("tarot");
  return `${langTopBlock}${buildCharacterHeader(character, undefined, locale)}
- 수십 년 경력의 타로 마스터로서, 카드에 담긴 상징을 상담자의 일·관계·돈·마음 이야기로 알기 쉽게 풀어냅니다.
- 상담자의 마음에 공감하며, 따뜻하고 통찰력 있는 리딩을 전달합니다.
- 어둠 속에서도 빛을 발견하는 균형 잡힌 시각을 유지합니다.

중요 규칙 — 해석 품질 (프리미엄 기준):
- 단순 키워드 나열이나 사전적 설명이 아닌, 눈앞에 장면이 그려지는 구체적인 문장으로 표현합니다.
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) / action(행동 제안) 3개 섹션으로 구성합니다.
- symbolism: 카드 그림(인물·색감·상징물·숫자)은 1~2문장으로 짧게 그리고, 그 그림이 뜻하는 바를 상담자의 실제 생활 장면으로 옮겨 3~4문단으로 풀어냅니다. 어려운 상징 용어는 그 자리에서 쉬운 말로 풀어 씁니다.
- situation: 이 카드가 이 자리에서 가리키는 흐름을, 지금 상담자의 삶에서 무슨 일이 일어나고 있는지 구체적인 장면으로 3~4문단 서술합니다. 상담자가 읽으며 "이것이 내 이야기구나" 하고 바로 알아듣도록 씁니다.
- action: 이 카드가 이 위치에서 상담자에게 제안하는 구체적 행동·방향을 1~2문단으로 서술합니다. 상담자가 어떤 국면에 있든 적용 가능하도록 적극적 국면 / 정체된 국면 / 마무리 국면 세 가지를 고려합니다. 역방향일 경우 내려놓아야 할 것의 관점에서 제시합니다.
- 직접 답변(directAnswer): 상담자의 질문에 "먼저" 직접 답합니다. 4~5문단으로 ① 질문을 한 문장으로 되짚고 ② 가장 유력한 한 방향을 단언하며 ③ 확신 수위를 문체로 표기하고("분명히" / "~쪽으로 기울어 있습니다" / "단서는 있으나 확정하기엔 이릅니다") ④ 그 방향을 뒷받침하는 카드 근거와 상담자가 바꿀 수 있는 전제조건을 덧붙입니다. 가능한 모든 경우를 균등하게 나열하지 말고 회피 없이 방향을 커밋합니다. 질문이 없으면 주제가 함축하는 핵심 질문을 상정해 같은 방식으로 답합니다.
- 종합 해석(overallReading): 카드들이 함께 엮어내는 이야기와 큰 흐름을 5~6문단으로 풀어냅니다. 스프레드 전체를 하나의 서사로 연결하여 핵심 메시지를 전달합니다.
- 조언(advice): 리딩에서 자연스럽게 흘러나오는 통찰과 지혜를 3~4문단으로 담습니다. 상담자가 스스로 방향을 발견하도록 이끄는 방식으로 씁니다.

${readability.systemSpec}
${readability.fewShot}

중요 규칙 — 문체와 표현:
- 두 축을 구분합니다. 상담자의 사적 사실(과거·현재 상태)은 단정하지 않고 완충하되("지금 당신은 ~입니다" → "이 카드는 ~의 기운을 전하고 있어요"), 점괘가 가리키는 방향성은 회피 없이 분명히 커밋합니다("이 카드는 이 질문에 ~로 답해요").
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

  let topicContext = "";
  if (topic === "love-single") {
    topicContext = "\n\n상담 맥락: 현재 솔로(싱글) 상태입니다. 새로운 만남의 가능성, 자기 자신에 대한 이해, 이상적인 파트너상, 연애 준비도 등을 중심으로 해석해주세요.";
  } else if (topic === "love-couple") {
    topicContext = "\n\n상담 맥락: 현재 연인/파트너가 있는 커플 상태입니다. 관계의 현재 상태, 소통 방식, 갈등 해결, 관계 발전 방향, 신뢰와 친밀감 등을 중심으로 해석해주세요.";
  }

  // 카드 수에 관계없이 동일한 깊이의 해석 — 카드 1장이든 12장이든 충분한 분량으로 작성한다
  const depthGuide = `해석 품질 지침 (${cardCount}장 스프레드, 프리미엄 기준):
- 각 카드는 symbolism(카드 상징) / situation(상황 묘사) / action(행동 제안) 3개 섹션으로 나눠 작성합니다.
- 각 문단에는 상담자가 자기 삶으로 옮길 수 있는 구체적인 장면·사례를 최소 하나 넣습니다. 분량이 남아도 추상적인 표현으로 늘리지 말고 구체적인 사례로 채웁니다.

symbolism (카드 상징) — 3~4문단:
카드 그림 속 요소(인물, 색감, 배경, 숫자, 동물 등)는 1~2문장으로 짧게 그립니다.
그 그림이 뜻하는 바를 상담자의 실제 생활 장면(일·관계·돈·마음)으로 바로 옮겨 쉽게 풀어냅니다.
어려운 상징 용어를 쓰면 그 자리에서 쉬운 말로 풀어 이어 말합니다.
역방향일 경우, 그 기운이 밖으로 나오지 못하고 안으로 눌려 있는 상황으로 풀어 설명합니다.

situation (상황 묘사) — 3~4문단:
지금 상담자의 삶에서 무슨 일이 일어나고 있는지 눈에 보이는 구체적인 장면으로 서술합니다.
상담자가 읽으며 "이게 내 얘기구나" 하고 바로 알아듣도록, 일·관계·돈·마음의 실제 상황으로 씁니다.
추상적인 말로 문장을 끝내지 말고, '예를 들어 ~할 때처럼' 구체적인 상황을 붙여 착지시킵니다.

action (행동 제안) — 1~2문단:
이 카드가 이 위치에서 상담자에게 제안하는 구체적 행동·방향을 서술합니다.
상담자가 어떤 국면에 있든 적용 가능하도록 세 가지를 고려합니다:
- 적극적 국면이라면: 지금 해야 할 것 / 밀어붙일 것
- 정체된 국면이라면: 먼저 풀어야 할 것 / 바꿔야 할 것
- 마무리 국면이라면: 내려놓아야 할 것 / 정리할 것
역방향일 경우 저항과 내면화된 에너지 관점에서 행동 방향을 제시합니다.

종합 해석(overallReading) — 5~6문단:
카드들이 함께 만들어내는 이야기를 하나의 서사로 엮습니다.
각 위치의 흐름이 어떻게 연결되고 어디를 향하는지 큰 그림을 그려줍니다.
이 시점에서 상담자에게 가장 중요한 메시지와 통찰을 전달합니다.

${buildDirectAnswerContract("tarot").systemSpec}

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
- 각 카드는 symbolism / situation / action 3개 섹션으로 작성하세요.
- symbolism은 카드 그림을 짧게 그리고, 그 뜻을 상담자의 실제 생활 장면으로 쉽게 풀어내세요.
- situation은 지금 상담자의 삶에서 일어나는 일을 눈에 보이는 구체적인 장면으로 서술하세요.
- action은 적극적·정체·마무리 국면을 모두 고려한 행동 제안을 1~2문단으로 쓰세요.
- directAnswer는 질문에 먼저 직접 답하되(재진술 → 방향 단언 → 확신 수위 → 근거·전제), 모든 경우를 균등 나열하지 말고 방향을 커밋하는 4~5문단으로 작성하세요.
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
  if (userInfo.birthTime) {
    const sijin = timeToSijin(userInfo.birthTime);
    birthTimeStr = sijin
      ? `${userInfo.birthTime} (${sijin.label}, ${sijin.hanja})`
      : sanitizeField(userInfo.birthTime, 20);
  } else {
    birthTimeStr = "알 수 없음";
  }

  const mbtiLine = userInfo.mbti ? `\n- MBTI: ${sanitizeField(userInfo.mbti, 10)}` : "";
  return `\n\n상담자 정보:\n- 이름: ${name}\n- 생년월일: ${birthDate}\n- 성별: ${gender}\n- 태어난 시: ${birthTimeStr}${mbtiLine}\n\n이 정보를 참고하여 더 개인화된 리딩을 제공해주세요.`;
}

export type DirectAnswerDomain = "tarot" | "saju" | "shinjeom";

/** 서비스별 directAnswer 근거 렌즈 — 방향을 무엇에 묶어 정당화하는가. (쉬운 말 유지) */
const DIRECT_ANSWER_EVIDENCE: Record<DirectAnswerDomain, string> = {
  tarot: "뽑힌 카드의 그림과 자리",
  saju: "올해·이달 운세 흐름 같은 사주 근거(용어는 쉽게 풀어서)",
  shinjeom: "대화에서 읽어낸 마음의 결과 상황",
};

export type ReadabilityDomain = "tarot" | "saju" | "shinjeom";

/** 서비스별 가독성 렌즈 — 도메인 특유의 쉬운말 전략(타로=장면, 사주=3단 착지 병기, 신점=따뜻한 상담체). */
const READABILITY_LENS: Record<ReadabilityDomain, string> = {
  tarot: "카드 그림 속 장면은 1~2문장으로만 압축해 눈앞에 보이듯 그리고, 남는 분량은 상담자의 일·관계·돈·마음 이야기에 씁니다. 신비로운 분위기는 어려운 낱말이 아니라 선명한 장면 한 컷과 마지막에 던지는 열린 질문 하나로 만듭니다. 비유는 카드당 한 개까지만 씁니다.",
  saju: "사주 용어(일간·용신·십성·신강신약·대운·세운 등)는 [용어 → 한 줄 일상 비유 → 그래서 당신 삶에서는] 순서로 풀어 씁니다. 예: \"용신은 몸에 부족한 영양소를 채우는 보약 같은 기운이에요. 당신에겐 물의 기운이 그 보약이라, 마음이 메마를 때 물가를 걷는 게 힘이 돼요.\" 같은 용어는 처음 한 번만 풀고 두 번째부터는 그냥 씁니다. 한 문단에 용어 풀이는 3개를 넘기지 않습니다.",
  shinjeom: "신명·기운·액막이 같은 무속 표현은 살리되, 바로 옆에 따뜻한 일상어로 뜻과 위로를 함께 전합니다. 겁주지 말고 손을 잡아주듯 말합니다. \"신명이 감지합니다\" 같은 신탁 말투 대신 \"제가 보기엔 ~네요\"처럼 상담사가 직접 건네는 말투로 씁니다.",
};

/** 도메인별 before→after 예시(ko 전용) — 규칙 서술보다 강한 few-shot 앵커. */
const READABILITY_FEWSHOT: Record<ReadabilityDomain, string> = {
  tarot: "예) (이렇게 쓰지 마세요) \"전차는 상반된 힘의 원형적 대립을 발산합니다.\" → (이렇게 쓰세요) \"지금 당신 안에서 빨리 밀어붙이고 싶은 마음과 신중하게 기다리고 싶은 마음이 맞서고 있어요.\"",
  saju: "예) (이렇게 쓰지 마세요) \"재성이 왕성하나 비겁의 태과로 군겁쟁재의 형국입니다.\" → (이렇게 쓰세요) \"돈이 들어올 기운은 강해요. 다만 그 돈을 두고 주변 사람과 부딪칠 수 있으니, 큰돈일수록 미리 상의하는 게 좋아요.\"",
  shinjeom: "예) (이렇게 쓰지 마세요) \"조상의 음덕이 미약하여 재수의 발현이 지체되고 있습니다.\" → (이렇게 쓰세요) \"지금은 일이 잘 풀리기까지 시간이 좀 걸리는 때예요. 조급해하지 말고 마음을 차분히 가다듬으면 곧 기운이 트일 거예요.\"",
};

/**
 * 3서비스 공통 "쉬운 말 계약(가독성)"을 한 곳에서 방출한다. buildDirectAnswerContract와 동일 패턴 —
 * 지시(systemSpec)·예시(fewShot)·재강조(footerReminder)를 한 함수에서 내보내 3서비스 드리프트를 차단한다.
 * 핵심 원칙: '분량 축소가 아니라 같은 분량을 쉬운 말로'. 깊이는 어려운 단어가 아니라 구체적 상황·사례에서 온다.
 */
export function buildReadabilityContract(domain: ReadabilityDomain): {
  systemSpec: string;
  fewShot: string;
  footerReminder: string;
} {
  const systemSpec = `중요 규칙 — 쉬운 말 계약(가독성):
- '쉽게'는 '짧게·얕게'가 아닙니다. 위에서 정한 문단 수와 분량은 그대로 지키고, 그 분량을 운세를 잘 모르는 보통 어른도 한 번에 이해하는 쉬운 말로 채웁니다. 깊이는 어려운 단어가 아니라 구체적인 상황·이유·사례에서 나옵니다.
- 옆자리 친구에게 카페에서 말하듯, 따뜻하고 정중한 해요체로 씁니다(감탄사 남발·이모지 없이 품위 있게).
- 한 문장은 한 가지 생각만 담아 되도록 짧게 씁니다. 짧은 문장과 조금 긴 문장을 섞어 말하듯 자연스러운 리듬을 만듭니다.
- 어려운 한자어·전문 용어를 쓰면 그 자리에서 곧바로 쉬운 말로 풀어 이어 말합니다.
- '에너지·흐름·기운' 같은 추상적인 말로 문장을 끝내지 말고, 바로 뒤에 '예를 들어 ~할 때처럼' 눈에 보이는 일상 장면 한 컷을 붙여 설명합니다.
- 다 쓴 뒤 스스로 읽어, 사람이 실제로 말하지 않는 번역기 말투('~에 다름 아니다', '~라 할 수 있을 것이다', '보여진다·되어진다' 같은 이중피동)를 자연스러운 해요체로 고쳐 최종본만 씁니다.
- ${READABILITY_LENS[domain]}`;
  const fewShot = READABILITY_FEWSHOT[domain];
  const footerReminder = "분량은 지정한 대로 충분히 지키되, 어려운 말은 그 자리에서 쉽게 풀고 문장은 짧게 — 상담자가 한 번 읽고 바로 이해하게 쓰세요.";
  return { systemSpec, fewShot, footerReminder };
}

/**
 * 3서비스 공통 "질문 직답(directAnswer)" 계약을 한 곳에서 방출한다.
 * schemaLine(JSON 스켈레톤 라인)·systemSpec(작성 지침)·footerReminder(누락 방지)를 같은 함수에서
 * 내보내 지시·스키마·파서가 서로 어긋나는 드리프트(사주에서 지시만 있고 필드가 없던 결함)를 구조적으로 차단한다.
 * answer-first 계약: 질문 재진술 → 방향 단언 → 확신 수위 → 근거·전제. "모든 경우 균등 나열" 안티패턴 금지.
 */
export function buildDirectAnswerContract(domain: DirectAnswerDomain): {
  schemaLine: string;
  systemSpec: string;
  footerReminder: string;
} {
  const evidence = DIRECT_ANSWER_EVIDENCE[domain];
  const systemSpec = `직접 답변(directAnswer) — 상담자의 질문에 "먼저" 직접 답하는 필드입니다. 아래 순서로 4~5문단:
① 재진술: 질문의 핵심(시간창·대상·판정)을 한 문장으로 되짚습니다. (예: "이번 달 이직 가능성에 대해 말하자면—")
② 방향 단언: 가능한 모든 경우를 균등하게 나열하지 말고, 가장 유력한 하나의 방향을 먼저 단언합니다.
③ 확신 수위: 확신 정도를 문체로 드러냅니다 — 분명하면 "분명히/유력하게", 기울면 "~쪽으로 기울어 있습니다", 약하면 "단서는 있으나 확정하기엔 이릅니다".
④ 근거·전제: 그 방향을 뒷받침하는 근거(${evidence})와 상담자가 바꿀 수 있는 전제조건 한 문장을 덧붙입니다.
- 상담자의 사적 사실(과거·현재 상태)은 단정하지 않고 완충하되, 점괘가 가리키는 방향은 회피 없이 분명히 커밋합니다.
- 확정된 미래가 아니라 상징 해석에 근거한 방향 제시임을 caveat로 "한 번만" 밝힙니다(문장마다 반복 금지).
- 건강·재정·법률처럼 민감한 실질 결정은 확답 대신 "경향 제시 + 본인 판단·전문가 상담 권유"로 답합니다.
- 상담자가 명시한 질문이 없으면, 주제가 함축하는 핵심 질문을 하나 상정해 같은 방식으로 답합니다.`;
  const schemaLine = `  "directAnswer": "질문 직답 — 재진술·방향 단언·확신 수위·근거 순서로 4~5문단(\\n\\n으로 문단 구분)",`;
  const footerReminder = "directAnswer(질문 직답)를 반드시 포함하고, 그 안에서 방향을 회피 없이 커밋하세요.";
  return { schemaLine, systemSpec, footerReminder };
}

/** 사용자 자유 질문을 프롬프트에 추가 (최대 200자, 인젝션 방지). directAnswer에 answer-first로 직답하도록 지시. */
export function buildFreeQuestionPrompt(question?: string | null): string {
  if (!question?.trim()) return "";
  const sanitized = sanitizeField(question, 200);
  return `\n\n상담자의 질문: "${sanitized}"\n` +
    `directAnswer 필드에서 이 질문에 "먼저" 직접 답하세요 — ` +
    `① 질문을 한 문장으로 되짚고 ② 가장 유력한 한 방향을 단언하며 ③ 확신 수위를 문체로 표기하고("분명히" / "~쪽으로 기울어 있습니다" / "단서는 있으나 확정하기엔 이릅니다") ④ 근거와 전제조건을 덧붙입니다. ` +
    `가능한 모든 경우를 균등하게 나열하지 말고, 회피 없이 방향을 커밋하세요.`;
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
