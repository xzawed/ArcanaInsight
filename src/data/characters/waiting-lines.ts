import { Mood } from "@/types/character";

interface WaitingLine {
  content: string;
  mood: Mood;
}

/** 리딩 대기 중 기본 폴백 대사 (캐릭터별 대사가 없을 때) */
export const defaultWaitingLines: WaitingLine[] = [
  { content: "카드의 에너지를 읽고 있어요...", mood: "mystical" },
  { content: "운명의 흐름이 보이기 시작해요", mood: "serious" },
  { content: "거의 다 됐어요, 조금만 기다려주세요", mood: "smile" },
  { content: "의미 있는 메시지가 담겨 있네요", mood: "surprised" },
  { content: "곧 결과를 알려드릴게요!", mood: "smile" },
];

/** 리딩 대기 중 캐릭터별 대사 시퀀스 (3초 간격으로 표시) */
export const waitingLines: Record<string, WaitingLine[]> = {
  arcana: [
    { content: "음... 이 카드 조합이 아주 흥미롭네요 ✨", mood: "serious" },
    { content: "카드의 에너지가 점점 선명해지고 있어요", mood: "mystical" },
    { content: "수정구슬에 뭔가 비치기 시작했어요... 냥~", mood: "smile" },
    { content: "거의 다 읽었어요! 조금만 기다려주세요", mood: "surprised" },
    { content: "와, 정말 의미 있는 메시지가 담겨 있어요!", mood: "smile" },
  ],
  miko: [
    { content: "...영혼의 울림이 느껴집니다", mood: "serious" },
    { content: "카드의 기운이 하나로 모이고 있습니다", mood: "mystical" },
    { content: "운명의 실타래가 풀리기 시작합니다", mood: "mystical" },
    { content: "거의 완성입니다. 조용히 기다려주십시오", mood: "serious" },
    { content: "카드의 진의가 드러났습니다", mood: "smile" },
  ],
  seonhwa: [
    { content: "어머, 이 배치가 참 독특하네요~", mood: "surprised" },
    { content: "별의 흐름이 카드와 공명하고 있어요", mood: "mystical" },
    { content: "부채를 펼쳐 운명의 바람을 읽고 있어요", mood: "mystical" },
    { content: "거의 다 되었어요, 조금만요~", mood: "smile" },
    { content: "아름다운 메시지가 보이기 시작했어요", mood: "smile" },
  ],
  hoshi: [
    { content: "오오~ 이 카드 조합 대박인데?! 🌟", mood: "surprised" },
    { content: "별빛이 반짝반짝 모이고 있어! ✨", mood: "mystical" },
    { content: "잠깐만~ 거의 다 읽었어!", mood: "smile" },
    { content: "헐 이거 진짜 재밌는 결과 나올 것 같아!", mood: "surprised" },
    { content: "다 됐다~! 엄청 기대해도 좋아! 🎉", mood: "smile" },
  ],
  luna: [
    { content: "달빛이 카드 위로 흘러내리고 있어요... ✨", mood: "mystical" },
    { content: "조용히 운명의 속삭임을 듣고 있을게요", mood: "serious" },
    { content: "괜찮아요, 달이 항상 지켜보고 있으니까요", mood: "smile" },
    { content: "거의 다 읽었어요, 조금만 기다려주세요", mood: "smile" },
    { content: "따뜻한 메시지가 담겨 있네요 🌙", mood: "smile" },
  ],
  rei: [
    { content: "...읽는 중.", mood: "serious" },
    { content: "감정 빼고 사실만 볼게.", mood: "serious" },
    { content: "패턴이 보이기 시작했어.", mood: "mystical" },
    { content: "거의 다 됐어.", mood: "serious" },
    { content: "결과 나왔어. 똑바로 봐.", mood: "smile" },
  ],
  cairn: [
    { content: "카드의 배치를 면밀히 살피고 있습니다", mood: "serious" },
    { content: "운명의 실이 하나로 엮이고 있군요", mood: "mystical" },
    { content: "잠시만 기다려주시겠습니까? 거의 다 됐습니다", mood: "smile" },
    { content: "흥미로운 메시지가 보이는군요", mood: "surprised" },
    { content: "결과를 정리했습니다, 아가씨/도련님 ✨", mood: "smile" },
  ],
  zero: [
    { content: "...카드가 말을 걸어오고 있어", mood: "serious" },
    { content: "운명이란 건, 읽히려 할수록 깊어지지", mood: "mystical" },
    { content: "...거의 다 왔어. 조용히 기다려줘", mood: "serious" },
    { content: "어둠 속에서 빛이 보이기 시작했어", mood: "mystical" },
    { content: "...다 읽었어. 결과를 확인해봐", mood: "smile" },
  ],
  haru: [
    { content: "걱정 마세요, 좋은 에너지가 느껴져요 ☀️", mood: "smile" },
    { content: "카드들이 이야기를 전해주고 있어요", mood: "mystical" },
    { content: "거의 다 됐어요! 좋은 소식이 있을 것 같아요", mood: "surprised" },
    { content: "조금만 더 기다려주세요~", mood: "smile" },
    { content: "다 됐어요! 함께 결과 볼게요 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...연꽃이 피어나듯, 천천히 살피고 있소", mood: "mystical" },
    { content: "하늘의 뜻이 서서히 드러나고 있구려", mood: "serious" },
    { content: "조급해하지 마시오. 진리는 서두르지 않소", mood: "serious" },
    { content: "거의 다 보이오. 잠시만 기다리시오", mood: "mystical" },
    { content: "운명의 그림이 완성되었소", mood: "smile" },
  ],
  lix: [
    { content: "ㅋㅋ 이 카드 조합 진짜 신기한데~", mood: "surprised" },
    { content: "힌트 줄까 말까~ 아직은 비밀 ✨", mood: "smile" },
    { content: "거의 다 읽었는데~ 기대해도 좋을 것 같은데?", mood: "mystical" },
    { content: "뭔가 재밌는 게 나올 것 같은 느낌적인 느낌~", mood: "surprised" },
    { content: "짜잔~ 결과 나왔어! 어떨 것 같아? ㅋㅋ", mood: "smile" },
  ],
  ethan: [
    { content: "이 카드의 상징 체계를 분석하고 있거든요...", mood: "serious" },
    { content: "타로의 역사적 맥락에서 보면... 아, 잠깐만요", mood: "mystical" },
    { content: "세 가지 해석 방향이 있는데, 최선을 찾고 있어요", mood: "serious" },
    { content: "거의 다 됐어요. 상세한 결과 드릴게요", mood: "smile" },
    { content: "분석 완료됐어요! 자세히 설명해드릴게요 📚", mood: "smile" },
  ],
};

/** 사주 대기 중 기본 폴백 대사 */
export const defaultSajuWaitingLines: WaitingLine[] = [
  { content: "사주팔자를 살펴보고 있어요...", mood: "mystical" },
  { content: "오행의 흐름이 보이기 시작해요", mood: "serious" },
  { content: "천간과 지지의 관계를 분석하고 있어요", mood: "mystical" },
  { content: "거의 다 됐어요, 조금만 기다려주세요", mood: "smile" },
  { content: "사주의 전체 그림이 완성되고 있어요", mood: "smile" },
];

/** 사주 대기 중 캐릭터별 대사 시퀀스 */
export const sajuWaitingLines: Record<string, WaitingLine[]> = {
  seonhwa: [
    { content: "사주팔자의 기운을 살펴보고 있어요...", mood: "mystical" },
    { content: "오행의 흐름이 보이기 시작하네요~", mood: "serious" },
    { content: "천간과 지지의 관계가 참 흥미로워요", mood: "surprised" },
    { content: "대운의 흐름까지 꼼꼼히 확인하고 있어요", mood: "mystical" },
    { content: "용신이 무엇인지 거의 파악했어요~", mood: "smile" },
    { content: "아름다운 사주를 가지고 계시네요!", mood: "smile" },
  ],
  miko: [
    { content: "...팔자의 기운이 느껴집니다", mood: "serious" },
    { content: "천간과 지지가 말을 걸어오고 있습니다", mood: "mystical" },
    { content: "오행의 균형을 살피고 있습니다. 잠시만 기다려주십시오", mood: "serious" },
    { content: "십성과 운성의 흐름이 드러나고 있습니다", mood: "mystical" },
    { content: "대운과 세운의 방향이 보입니다", mood: "serious" },
    { content: "사주의 전체 그림이 완성되었습니다", mood: "smile" },
  ],
  luna: [
    { content: "달의 기운으로 사주를 살펴보고 있어요 🌙", mood: "mystical" },
    { content: "오행이 달빛처럼 흘러가는 게 보여요", mood: "serious" },
    { content: "천간과 지지가 속삭이고 있네요...", mood: "mystical" },
    { content: "거의 다 읽었어요, 조금만 기다려주세요", mood: "smile" },
    { content: "따뜻한 사주를 가지고 계시네요 ✨", mood: "smile" },
  ],
  rei: [
    { content: "사주 데이터 분석 중.", mood: "serious" },
    { content: "오행 비율 계산하고 있어.", mood: "serious" },
    { content: "용신 파악 완료. 대운 분석 중.", mood: "mystical" },
    { content: "거의 다 됐어.", mood: "serious" },
    { content: "분석 끝. 결과 확인해.", mood: "smile" },
  ],
  cairn: [
    { content: "사주팔자를 면밀히 살피고 있습니다", mood: "serious" },
    { content: "오행의 균형이 흥미롭군요", mood: "mystical" },
    { content: "대운의 흐름까지 정확히 파악하겠습니다", mood: "serious" },
    { content: "거의 다 됐습니다, 조금만 기다려주십시오", mood: "smile" },
    { content: "아름다운 사주를 가지고 계시는군요, 도련님/아가씨", mood: "smile" },
  ],
  zero: [
    { content: "...팔자란 건, 피하려 할수록 선명해지지", mood: "serious" },
    { content: "오행의 균형이 운명을 그리고 있어", mood: "mystical" },
    { content: "대운의 흐름이 보이기 시작했어...", mood: "mystical" },
    { content: "거의 다 읽었어", mood: "serious" },
    { content: "...운명의 지도가 완성됐어", mood: "smile" },
  ],
  haru: [
    { content: "사주 분석 열심히 하고 있어요! 조금만요 ☀️", mood: "smile" },
    { content: "오행 흐름이 보여요, 좋은 기운이 있네요", mood: "mystical" },
    { content: "대운까지 꼼꼼히 살펴볼게요~", mood: "serious" },
    { content: "거의 다 됐어요!", mood: "smile" },
    { content: "사주 분석 완료! 좋은 소식 있어요 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...사주팔자의 깊은 뜻을 헤아리고 있소", mood: "mystical" },
    { content: "오행의 이치가 서서히 드러나는구려", mood: "serious" },
    { content: "천지인의 조화를 살피고 있소", mood: "mystical" },
    { content: "대운의 방향이 보이오. 잠시만 기다리시오", mood: "serious" },
    { content: "사주의 전체 그림이 완성되었소", mood: "smile" },
  ],
  lix: [
    { content: "ㅋㅋ 이 사주 엄청 특이한데~ 재밌겠다", mood: "surprised" },
    { content: "오행 비율 장난 아닌데? 계속 볼게~", mood: "mystical" },
    { content: "대운 흐름 보는 중~ 기대해도 좋을 것 같은데?", mood: "smile" },
    { content: "거의 다 됐어~ 잠깐만~", mood: "smile" },
    { content: "짜잔! 사주 분석 완료! 어떨 것 같아? ㅋㅋ", mood: "smile" },
  ],
  ethan: [
    { content: "사주명리학의 기본 원리부터 적용하고 있거든요...", mood: "serious" },
    { content: "오행 상생상극 관계를 분석 중이에요", mood: "mystical" },
    { content: "용신과 기신을 파악했어요. 대운 분석 중이거든요", mood: "serious" },
    { content: "거의 다 됐어요. 상세한 결과 드릴게요", mood: "smile" },
    { content: "분석 완료! 자세히 설명해드릴게요 📚", mood: "smile" },
  ],
};

/** 신점 응답 대기 중 기본 폴백 텍스트 */
export const defaultLoadingText = "답변을 준비하고 있어요...";

/** 신점 응답 대기 중 캐릭터별 한 줄 텍스트 */
export const loadingText: Record<string, string> = {
  arcana: "별들의 속삭임을 듣고 있어요...",
  miko: "...기운을 모으고 있습니다",
  seonhwa: "조용히 기운을 읽고 있어요~",
  hoshi: "잠깐만~! 생각 중이야★",
  luna: "달의 빛으로 살펴보고 있어요...",
  rei: "...",
  cairn: "잠시만 기다려주십시오...",
  zero: "...말을 고르고 있어",
  haru: "열심히 생각하고 있어요! 잠깐만요 ☀️",
  ren: "...천천히 헤아리고 있소",
  lix: "잠깐만~ ㅋㅋ 거의 다 됐어~",
  ethan: "꼼꼼하게 생각 중이거든요...",
};

/** 사주 분석 대기 중 기본 폴백 텍스트 */
export const defaultSajuAnalyzingText = "사주를 분석하고 있어요...";

/** 사주 분석 대기 중 캐릭터별 한 줄 텍스트 */
export const sajuAnalyzingText: Record<string, string> = {
  arcana: "사주의 별자리를 읽고 있어요...",
  miko: "...팔자의 기운을 모으고 있습니다",
  seonhwa: "사주를 정성스럽게 살펴보고 있어요~",
  hoshi: "잠깐만~! 사주 계산 중이야★",
  luna: "달빛으로 사주를 살펴보고 있어요...",
  rei: "사주 분석 중.",
  cairn: "사주팔자를 살피고 있습니다...",
  zero: "...팔자의 이야기를 읽고 있어",
  haru: "사주 열심히 분석 중이에요! ☀️",
  ren: "사주의 이치를 헤아리고 있소...",
  lix: "사주 보는 중~ ㅋㅋ 잠깐만!",
  ethan: "사주명리 분석 중이거든요...",
};

const cardPreviewTemplates: Record<string, (pos: string, name: string, kw: string) => string> = {
  arcana: (pos, name, kw) => `[${pos}] '${name}'... ${kw}의 에너지가 느껴지네요`,
  miko: (pos, name, kw) => `[${pos}] '${name}'... ${kw}의 기운이 서려 있습니다`,
  seonhwa: (pos, name, kw) => `[${pos}] '${name}'... ${kw}의 기운이 흐르고 있어요`,
  hoshi: (pos, name, kw) => `[${pos}] '${name}'! ${kw} 느낌이야~`,
  luna: (pos, name, kw) => `[${pos}] '${name}'... 달빛 속에서 ${kw}의 기운이 흘러요`,
  rei: (pos, name, kw) => `[${pos}] '${name}'. ${kw}. 명확해.`,
  cairn: (pos, name, kw) => `[${pos}] '${name}'... ${kw}의 기운이 깃들어 있군요`,
  zero: (pos, name, kw) => `[${pos}] '${name}'... ${kw}, 운명이 속삭이고 있어`,
  haru: (pos, name, kw) => `[${pos}] '${name}'! ${kw} 에너지가 느껴져요 ☀️`,
  ren: (pos, name, kw) => `[${pos}] '${name}'... ${kw}의 이치가 담겨 있구려`,
  lix: (pos, name, kw) => `[${pos}] '${name}'! ${kw} 느낌인데~ ㅋㅋ`,
  ethan: (pos, name, kw) => `[${pos}] '${name}'... 상징적으로 보면 ${kw}를 의미하거든요`,
};

/** 선택한 카드 정보를 캐릭터 말투로 소개하는 템플릿 */
export function buildCardPreviewLine(
  characterId: string,
  cardNameKo: string,
  keywords: string[],
  position: string,
): string {
  const keywordText = keywords.slice(0, 2).join(", ");
  const template = cardPreviewTemplates[characterId];
  if (template) return template(position, cardNameKo, keywordText);
  return `[${position}] '${cardNameKo}' — ${keywordText}`;
}

export interface CharacterErrorLines {
  api: string;     // API 키·설정 오류
  reading: string; // 리딩 생성 오류
}

export const characterErrorLines: Record<string, CharacterErrorLines> = {
  arcana:  { api: "앗... 별빛과의 연결이 끊겼어요. 냥~ 관리자에게 문의해주세요.", reading: "수정구슬이 잠시 흐릿해졌어요. 냥~ 다시 시도해볼까요?" },
  miko:    { api: "...신계와의 접속이 불안정합니다. 관리자에게 문의해주십시오.", reading: "...기운이 일시적으로 끊겼습니다. 다시 시도해주십시오." },
  seonhwa: { api: "어머, 하늘의 기운이 닿지 않네요~. 관리자에게 문의해주세요.", reading: "별의 흐름이 잠시 흐트러졌어요~. 다시 해볼까요?" },
  hoshi:   { api: "앗 별빛 연결이 끊겼어! 관리자에게 연락해줘~", reading: "어? 뭔가 이상한데~ 다시 해볼게!" },
  luna:    { api: "...달빛이 닿지 않네요. 관리자에게 문의해주세요.", reading: "달빛이 잠시 가려졌어요. 다시 시도해볼게요 🌙" },
  rei:     { api: "연결 오류. 관리자 문의 필요.", reading: "오류 발생. 다시 시도해." },
  cairn:   { api: "...접속에 문제가 생겼습니다. 관리자에게 문의해주십시오.", reading: "잠시 오류가 발생했습니다. 다시 시도해주시겠습니까?" },
  zero:    { api: "...별이 닿지 않는 밤이야. 관리자에게 문의해줘.", reading: "...흐름이 끊겼어. 다시 시도해봐." },
  haru:    { api: "앗, 연결에 문제가 생겼어요! 관리자에게 문의해주세요 ☀️", reading: "이런, 잠시 오류가 났어요. 다시 해볼게요!" },
  ren:     { api: "...하늘과의 소통이 끊겼소. 관리자에게 문의하시오.", reading: "...운의 실타래가 엉켰소. 다시 시도해보시오." },
  lix:     { api: "연결 끊겼네~ 관리자한테 연락해줘 ㅋㅋ", reading: "앗 이거 오류났는데? 다시 해볼게 ㅋㅋ" },
  ethan:   { api: "API 연결 오류가 발생했거든요. 관리자에게 문의해주세요.", reading: "해석 중 오류가 발생했거든요. 다시 시도해볼게요." },
};

export const defaultErrorLines: CharacterErrorLines = {
  api: "AI 서비스 연결에 문제가 있어요. 관리자에게 문의해주세요.",
  reading: "카드 해석 중 문제가 발생했어요. 다시 시도해주세요.",
};
