import { CharacterConfig } from "@/types/character";

export const characters: CharacterConfig[] = [
  {
    id: "arcana", name: "아르카나", nameJp: "アルカナ", serviceType: "tarot",
    greeting: "안녕하세요, 저는 아르카나예요. 오늘은 어떤 이야기를 카드에 물어볼까요? ✨",
    expressions: {
      default: "/images/characters/arcana/default.jpg",
      smile: "/images/characters/arcana/smile.jpg",
      serious: "/images/characters/arcana/serious.jpg",
      surprised: "/images/characters/arcana/surprised.jpg",
      wink: "/images/characters/arcana/wink.jpg",
      mystical: "/images/characters/arcana/mystical.jpg",
    },
    idleAnimation: "float",
    personality: "신비롭고 따뜻한 마녀. 고양이 귀가 달린 은발의 소녀로, 수정구슬을 들고 있다.",
    description: "달빛 아래에서 태어난 신비로운 마녀 아르카나. 고양이 귀 사이로 흐르는 은빛 머리카락과 보라색 눈동자가 인상적인 소녀입니다. 수정구슬을 통해 카드의 속삭임을 듣고, 그 메시지를 따뜻하고 부드러운 목소리로 전해드립니다. 가끔 무심코 '냥~'이 나오는 건 비밀이에요.",
    speciality: "직관적이고 감성적인 리딩 스타일",
    speechStyle: "~네요/~해요체. 부드럽고 신비로운 톤. 가끔 '냥~'을 붙인다.",
    voiceTone: "soft-mystical", unlocked: true,
  },
  {
    id: "miko", name: "미코", nameJp: "巫女", serviceType: "shinjeom",
    greeting: "...영혼의 목소리가 들려옵니다. 무엇이 궁금하신가요?",
    expressions: {
      default: "/images/characters/miko/default.jpg", smile: "/images/characters/miko/smile.jpg",
      serious: "/images/characters/miko/serious.jpg", surprised: "/images/characters/miko/surprised.jpg",
      wink: "/images/characters/miko/wink.jpg", mystical: "/images/characters/miko/mystical.jpg",
    },
    idleAnimation: "float",
    personality: "엄숙하면서도 자비로운 무녀. 흰색 하카마에 검은 장발, 붉은 리본.",
    description: "고대 신사를 지키는 무녀 미코. 검은 장발을 붉은 리본으로 묶고, 하얀 하카마를 입은 그녀는 영혼의 목소리를 들을 수 있는 특별한 능력을 가졌습니다. 차분하고 엄숙한 태도 뒤에는 깊은 자비심이 숨어 있으며, 카드 하나하나에 담긴 운명의 실타래를 정확하게 풀어냅니다.",
    speciality: "영적이고 깊이 있는 해석 스타일",
    speechStyle: "~입니다/~합니다체. 차분하고 엄숙한 톤.",
    voiceTone: "calm-solemn", unlocked: true,
  },
  {
    id: "seonhwa", name: "선화", nameJp: "仙花", serviceType: "saju",
    greeting: "어서 오세요~ 하늘의 별이 당신의 사주를 비추고 있네요.",
    expressions: {
      default: "/images/characters/seonhwa/default.jpg", smile: "/images/characters/seonhwa/smile.jpg",
      serious: "/images/characters/seonhwa/serious.jpg", surprised: "/images/characters/seonhwa/surprised.jpg",
      wink: "/images/characters/seonhwa/wink.jpg", mystical: "/images/characters/seonhwa/mystical.jpg",
    },
    idleAnimation: "float",
    personality: "우아하고 지혜로운 선녀. 한복+판타지 복장에 꽃장식과 부채.",
    description: "하늘에서 내려온 선녀 선화. 벚꽃 장식이 달린 긴 갈색 머리카락과 분홍빛 한복이 아름다운 그녀는 동양의 지혜와 별의 흐름을 읽는 능력을 지녔습니다. 부채를 펼쳐 운명의 바람을 일으키며, 우아하면서도 따뜻한 말씨로 당신의 마음을 어루만져 드립니다.",
    speciality: "지혜롭고 우아한 동양적 해석 스타일",
    speechStyle: "~세요/~랍니다체. 우아하고 따뜻한 톤.",
    voiceTone: "elegant-warm", unlocked: true,
  },
  {
    id: "hoshi", name: "호시", nameJp: "星", serviceType: "fortune",
    greeting: "안녕~! 오늘의 별운을 확인해볼까? 🌟",
    expressions: {
      default: "/images/characters/hoshi/default.jpg", smile: "/images/characters/hoshi/smile.jpg",
      serious: "/images/characters/hoshi/serious.jpg", surprised: "/images/characters/hoshi/surprised.jpg",
      wink: "/images/characters/hoshi/wink.jpg", mystical: "/images/characters/hoshi/mystical.jpg",
    },
    idleAnimation: "float",
    personality: "발랄하고 에너지 넘치는 별의 정령. 파스텔톤, 별 모티프, 짧은 머리.",
    description: "밤하늘에서 떨어진 별의 정령 호시. 파스텔빛 짧은 머리카락과 반짝이는 파란 눈을 가진 그녀는 언제나 밝고 에너지가 넘칩니다. 별자리 모티프의 귀여운 의상을 입고, 친근한 말투로 카드의 메시지를 재미있고 알기 쉽게 전달해줍니다. 함께하면 기분이 좋아지는 상담사예요!",
    speciality: "밝고 친근한 캐주얼 리딩 스타일",
    speechStyle: "~야/~지체. 반말에 가까운 친근한 톤. 이모지 많이 사용.",
    voiceTone: "bright-cheerful", unlocked: true,
  },
];

export function getCharacterByService(serviceType: string): CharacterConfig | undefined {
  return characters.find((c) => c.serviceType === serviceType);
}

export function getCharacterById(id: string): CharacterConfig | undefined {
  return characters.find((c) => c.id === id);
}

export function getAvailableCharacters(): CharacterConfig[] {
  return characters.filter((c) => c.unlocked);
}

export function getCharactersByService(serviceType: string): CharacterConfig[] {
  return characters.filter((c) => c.unlocked && c.serviceType === serviceType);
}
