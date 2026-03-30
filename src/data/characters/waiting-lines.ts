import { Mood } from "@/types/character";

interface WaitingLine {
  content: string;
  mood: Mood;
}

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
};

/** 선택한 카드 정보를 캐릭터 말투로 소개하는 템플릿 */
export function buildCardPreviewLine(
  characterId: string,
  cardNameKo: string,
  keywords: string[],
  position: string,
): string {
  const keywordText = keywords.slice(0, 2).join(", ");

  switch (characterId) {
    case "arcana":
      return `[${position}] '${cardNameKo}'... ${keywordText}의 에너지가 느껴지네요`;
    case "miko":
      return `[${position}] '${cardNameKo}'... ${keywordText}의 기운이 서려 있습니다`;
    case "seonhwa":
      return `[${position}] '${cardNameKo}'... ${keywordText}의 기운이 흐르고 있어요`;
    case "hoshi":
      return `[${position}] '${cardNameKo}'! ${keywordText} 느낌이야~`;
    default:
      return `[${position}] '${cardNameKo}' — ${keywordText}`;
  }
}
