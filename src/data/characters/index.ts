import { CharacterConfig } from "@/types/character";

export const characters: CharacterConfig[] = [
  {
    id: "arcana", name: "아르카나", nameJp: "アルカナ", serviceType: "tarot",
    greeting: "안녕하세요, 저는 아르카나예요. 오늘은 어떤 이야기를 카드에 물어볼까요? ✨",
    expressions: {
      default: "/images/characters/arcana/default.webp",
      smile: "/images/characters/arcana/smile.webp",
      serious: "/images/characters/arcana/serious.webp",
      surprised: "/images/characters/arcana/surprised.webp",
      wink: "/images/characters/arcana/wink.webp",
      mystical: "/images/characters/arcana/mystical.webp",
    },
    idleAnimation: "float",
    personality: "신비롭고 따뜻한 마녀. 고양이 귀가 달린 은발의 소녀로, 수정구슬을 들고 있다.",
    speechStyle: "~네요/~해요체. 부드럽고 신비로운 톤. 가끔 '냥~'을 붙인다.",
    voiceTone: "soft-mystical", unlocked: true,
  },
  {
    id: "miko", name: "미코", nameJp: "巫女", serviceType: "shinjeom",
    greeting: "...영혼의 목소리가 들려옵니다. 무엇이 궁금하신가요?",
    expressions: {
      default: "/images/characters/miko/default.webp", smile: "/images/characters/miko/smile.webp",
      serious: "/images/characters/miko/serious.webp", surprised: "/images/characters/miko/surprised.webp",
      wink: "/images/characters/miko/wink.webp", mystical: "/images/characters/miko/mystical.webp",
    },
    idleAnimation: "float",
    personality: "엄숙하면서도 자비로운 무녀. 흰색 하카마에 검은 장발, 붉은 리본.",
    speechStyle: "~입니다/~합니다체. 차분하고 엄숙한 톤.",
    voiceTone: "calm-solemn", unlocked: false,
  },
  {
    id: "seonhwa", name: "선화", nameJp: "仙花", serviceType: "saju",
    greeting: "어서 오세요~ 하늘의 별이 당신의 사주를 비추고 있네요.",
    expressions: {
      default: "/images/characters/seonhwa/default.webp", smile: "/images/characters/seonhwa/smile.webp",
      serious: "/images/characters/seonhwa/serious.webp", surprised: "/images/characters/seonhwa/surprised.webp",
      wink: "/images/characters/seonhwa/wink.webp", mystical: "/images/characters/seonhwa/mystical.webp",
    },
    idleAnimation: "float",
    personality: "우아하고 지혜로운 선녀. 한복+판타지 복장에 꽃장식과 부채.",
    speechStyle: "~세요/~랍니다체. 우아하고 따뜻한 톤.",
    voiceTone: "elegant-warm", unlocked: false,
  },
  {
    id: "hoshi", name: "호시", nameJp: "星", serviceType: "fortune",
    greeting: "안녕~! 오늘의 별운을 확인해볼까? 🌟",
    expressions: {
      default: "/images/characters/hoshi/default.webp", smile: "/images/characters/hoshi/smile.webp",
      serious: "/images/characters/hoshi/serious.webp", surprised: "/images/characters/hoshi/surprised.webp",
      wink: "/images/characters/hoshi/wink.webp", mystical: "/images/characters/hoshi/mystical.webp",
    },
    idleAnimation: "float",
    personality: "발랄하고 에너지 넘치는 별의 정령. 파스텔톤, 별 모티프, 짧은 머리.",
    speechStyle: "~야/~지체. 반말에 가까운 친근한 톤. 이모지 많이 사용.",
    voiceTone: "bright-cheerful", unlocked: false,
  },
];

export function getCharacterByService(serviceType: string): CharacterConfig | undefined {
  return characters.find((c) => c.serviceType === serviceType);
}

export function getCharacterById(id: string): CharacterConfig | undefined {
  return characters.find((c) => c.id === id);
}
