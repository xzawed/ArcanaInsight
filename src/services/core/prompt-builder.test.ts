import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildReadingPrompt, buildUserInfoPrompt, buildCharacterHeader, buildCharacterMemoryPrompt } from "./prompt-builder";
import type { CharacterConfig } from "@/types/character";
import type { SelectedCard, TarotCard } from "@/types/card";
import type { SpreadDefinition } from "@/types/session";

// ─────────────────────────── 테스트용 더미 데이터 ───────────────────────────

const dummyCharacter: CharacterConfig = {
  id: "arcana",
  name: "아르카나",
  nameJp: "アルカナ",
  gender: "female",
  greeting: "안녕하세요, 저는 아르카나입니다.",
  expressions: {
    default: "/images/characters/arcana/nukki/default.png",
    smile: "/images/characters/arcana/nukki/smile.png",
    serious: "/images/characters/arcana/nukki/serious.png",
    surprised: "/images/characters/arcana/nukki/surprised.png",
    wink: "/images/characters/arcana/nukki/wink.png",
    mystical: "/images/characters/arcana/nukki/mystical.png",
  },
  idleAnimation: "float",
  personality: "신비롭고 직관적인 성격으로, 카드의 에너지를 깊이 읽습니다.",
  description: "직관적 감성 리딩의 대가",
  speciality: "직관적·감성 리딩",
  speechStyle: "~네요/~해요, 신비로운 톤으로 말합니다.",
  voiceTone: "부드럽고 신비로운",
  unlocked: true,
  effectTheme: {
    primary: "#8b5cf6",
    secondary: "#6d28d9",
    accent: "#a78bfa",
    particleStyle: "sparkle",
  },
};

const dummyCard: TarotCard = {
  id: "the-fool",
  name: "The Fool",
  nameKo: "바보",
  number: 0,
  type: "major",
  imageUrl: "/images/cards/major/00-fool.svg",
  upright: {
    keywords: ["새로운 시작", "자유", "모험"],
    meaning: "새로운 여정의 시작을 의미합니다.",
  },
  reversed: {
    keywords: ["무모함", "부주의", "위험"],
    meaning: "무모한 행동을 경고합니다.",
  },
};

const dummyCardReversed: TarotCard = {
  id: "the-tower",
  name: "The Tower",
  nameKo: "탑",
  number: 16,
  type: "major",
  imageUrl: "/images/cards/major/16-tower.svg",
  upright: {
    keywords: ["갑작스러운 변화", "붕괴", "계시"],
    meaning: "갑작스러운 변화를 의미합니다.",
  },
  reversed: {
    keywords: ["재앙 회피", "내부 혼란", "지연된 변화"],
    meaning: "내부적 혼란을 나타냅니다.",
  },
};

const dummySpread: SpreadDefinition = {
  type: "one-card",
  name: "One Card",
  nameKo: "원카드",
  description: "하나의 카드로 핵심 메시지를 전달합니다.",
  positions: [
    { index: 0, label: "Present", labelKo: "현재", x: 0, y: 0 },
  ],
};

const threeCardSpread: SpreadDefinition = {
  type: "three-card",
  name: "Three Card",
  nameKo: "쓰리카드",
  description: "과거·현재·미래를 세 장의 카드로 해석합니다.",
  positions: [
    { index: 0, label: "Past", labelKo: "과거", x: -1, y: 0 },
    { index: 1, label: "Present", labelKo: "현재", x: 0, y: 0 },
    { index: 2, label: "Future", labelKo: "미래", x: 1, y: 0 },
  ],
};

const tenCardSpread: SpreadDefinition = {
  type: "celtic-cross",
  name: "Celtic Cross",
  nameKo: "켈틱 크로스",
  description: "10장의 카드로 심층적인 분석을 제공합니다.",
  positions: Array.from({ length: 10 }, (_, i) => ({
    index: i,
    label: `Position ${i + 1}`,
    labelKo: `위치 ${i + 1}`,
    x: i,
    y: 0,
  })),
};

const makeSelectedCard = (card: TarotCard, position: number, isReversed: boolean): SelectedCard => ({
  card,
  position,
  isReversed,
  selectedAt: new Date(),
});

// ─────────────────────────── buildUserInfoPrompt ───────────────────────────

describe("buildUserInfoPrompt", () => {
  it("userInfo가 undefined이면 빈 문자열을 반환한다", () => {
    expect(buildUserInfoPrompt(undefined)).toBe("");
  });

  it("userInfo가 null이면 빈 문자열을 반환한다", () => {
    expect(buildUserInfoPrompt(null)).toBe("");
  });

  it("userInfo가 있으면 이름을 포함한다", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-15",
      gender: "male",
      birthHour: "자시",
    });
    expect(result).toContain("홍길동");
  });

  it("userInfo가 있으면 생년월일을 포함한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1995-06-20",
      gender: "female",
      birthHour: "오시",
    });
    expect(result).toContain("1995-06-20");
  });

  it("male 성별을 '남성'으로 변환한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "male",
      birthHour: "자시",
    });
    expect(result).toContain("남성");
    expect(result).not.toContain("male");
  });

  it("female 성별을 '여성'으로 변환한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "female",
      birthHour: "자시",
    });
    expect(result).toContain("여성");
    expect(result).not.toContain("female");
  });

  it("other 성별을 '기타'로 변환한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "other",
      birthHour: "자시",
    });
    expect(result).toContain("기타");
  });

  it("birthHour가 unknown이면 '모름'으로 변환한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "male",
      birthHour: "unknown",
    });
    expect(result).toContain("모름");
    expect(result).not.toContain("unknown");
  });

  it("알 수 없는 birthHour는 원래 값 그대로 포함한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "male",
      birthHour: "자시",
    });
    expect(result).toContain("자시");
  });

  it("개인화 리딩 안내 문구를 포함한다", () => {
    const result = buildUserInfoPrompt({
      name: "테스트",
      birthDate: "1990-01-01",
      gender: "female",
      birthHour: "오시",
    });
    expect(result).toContain("개인화된 리딩");
  });
});

// ─────────────────────────── buildSystemPrompt ───────────────────────────

describe("buildSystemPrompt", () => {
  it("캐릭터 이름(name)을 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain("아르카나");
  });

  it("캐릭터 일본어 이름(nameJp)을 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain("アルカナ");
  });

  it("캐릭터 성격(personality)을 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain(dummyCharacter.personality);
  });

  it("캐릭터 말투(speechStyle)를 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain(dummyCharacter.speechStyle);
  });

  it("JSON 응답 형식 지침을 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain("cardInterpretations");
    expect(result).toContain("overallReading");
    expect(result).toContain("advice");
  });

  it("한국어 응답 규칙을 명시한다", () => {
    const result = buildSystemPrompt(dummyCharacter);
    expect(result).toContain("한국어");
  });

  it("string 타입을 반환한다", () => {
    expect(typeof buildSystemPrompt(dummyCharacter)).toBe("string");
  });
});

// ─────────────────────────── buildReadingPrompt ───────────────────────────

describe("buildReadingPrompt", () => {
  it("topic 'love'에 대한 한국어 레이블을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("love", selected, dummySpread);
    expect(result).toContain("연애/관계");
  });

  it("topic 'finance'에 대한 한국어 레이블을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("finance", selected, dummySpread);
    expect(result).toContain("재정/금전");
  });

  it("topic 'career'에 대한 한국어 레이블을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("career", selected, dummySpread);
    expect(result).toContain("직장/진로");
  });

  it("topic 'health'에 대한 한국어 레이블을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("health", selected, dummySpread);
    expect(result).toContain("건강");
  });

  it("topic 'general'에 대한 한국어 레이블을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("일반 상담");
  });

  it("topic 'love-single' 시 솔로 맥락 안내를 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("love-single", selected, dummySpread);
    expect(result).toContain("솔로");
  });

  it("topic 'love-couple' 시 커플 맥락 안내를 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("love-couple", selected, dummySpread);
    expect(result).toContain("커플");
  });

  it("역방향 카드는 '역방향' 문자열을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCardReversed, 0, true)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("역방향");
  });

  it("정방향 카드는 '정방향' 문자열을 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("정방향");
  });

  it("카드 이름(nameKo)이 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("바보");
  });

  it("카드 영어 이름(name)이 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("The Fool");
  });

  it("카드 ID가 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("the-fool");
  });

  it("1장 스프레드 시 '3~4문단' 깊이 가이드를 포함한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("3~4문단");
  });

  it("3장 스프레드 시 '3~4문단' 깊이 가이드를 포함한다", () => {
    const selected = [
      makeSelectedCard(dummyCard, 0, false),
      makeSelectedCard(dummyCard, 1, false),
      makeSelectedCard(dummyCardReversed, 2, true),
    ];
    const result = buildReadingPrompt("general", selected, threeCardSpread);
    expect(result).toContain("3~4문단");
  });

  it("5장 스프레드 시 '2~3문단' 깊이 가이드를 포함한다 (4~7장 범위)", () => {
    const fiveCardSpread: SpreadDefinition = {
      type: "five-card",
      name: "Five Card",
      nameKo: "파이브카드",
      description: "다섯 장으로 해석합니다.",
      positions: Array.from({ length: 5 }, (_, i) => ({
        index: i,
        label: `Position ${i + 1}`,
        labelKo: `위치 ${i + 1}`,
        x: i,
        y: 0,
      })),
    };
    const selected = Array.from({ length: 5 }, (_, i) =>
      makeSelectedCard(dummyCard, i, false)
    );
    const result = buildReadingPrompt("general", selected, fiveCardSpread);
    expect(result).toContain("2~3문단");
  });

  it("10장 스프레드 시 '1~2문단' 깊이 가이드를 포함한다 (8장 이상)", () => {
    const selected = Array.from({ length: 10 }, (_, i) =>
      makeSelectedCard(dummyCard, i, false)
    );
    const result = buildReadingPrompt("general", selected, tenCardSpread);
    expect(result).toContain("1~2문단");
  });

  it("스프레드 이름(nameKo)이 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("원카드");
  });

  it("스프레드 설명(description)이 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain(dummySpread.description);
  });

  it("포지션 레이블(labelKo)이 프롬프트에 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    expect(result).toContain("현재");
  });

  it("역방향 카드의 키워드가 포함된다", () => {
    const selected = [makeSelectedCard(dummyCardReversed, 0, true)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    // reversed.keywords: ["재앙 회피", "내부 혼란", "지연된 변화"]
    expect(result).toContain("재앙 회피");
  });

  it("정방향 카드의 키워드가 포함된다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    const result = buildReadingPrompt("general", selected, dummySpread);
    // upright.keywords: ["새로운 시작", "자유", "모험"]
    expect(result).toContain("새로운 시작");
  });

  it("string 타입을 반환한다", () => {
    const selected = [makeSelectedCard(dummyCard, 0, false)];
    expect(typeof buildReadingPrompt("general", selected, dummySpread)).toBe("string");
  });
});

describe("buildCharacterHeader", () => {
  it("캐릭터 이름과 일본어 이름을 포함한다", () => {
    const result = buildCharacterHeader(dummyCharacter);
    expect(result).toContain(dummyCharacter.name);
    expect(result).toContain(dummyCharacter.nameJp);
  });

  it("성격(personality)을 포함한다", () => {
    const result = buildCharacterHeader(dummyCharacter);
    expect(result).toContain(dummyCharacter.personality);
  });

  it("말투(speechStyle)를 포함한다", () => {
    const result = buildCharacterHeader(dummyCharacter);
    expect(result).toContain(dummyCharacter.speechStyle);
  });

  it("'한국어로만 응답합니다' 공통 규칙을 포함한다", () => {
    expect(buildCharacterHeader(dummyCharacter)).toContain("한국어로만 응답합니다");
  });

  it("subtitle 없이 호출하면 subtitle 줄이 없다", () => {
    const result = buildCharacterHeader(dummyCharacter);
    expect(result).not.toContain("\n신점");
  });

  it("subtitle 전달 시 첫 줄 바로 뒤에 포함된다", () => {
    const subtitle = "신점(영적 상담)을 제공하는 무속 상담사입니다.";
    const result = buildCharacterHeader(dummyCharacter, subtitle);
    expect(result).toContain(subtitle);
    const lines = result.split("\n");
    expect(lines[1]).toBe(subtitle);
  });
});

describe("buildCharacterMemoryPrompt", () => {
  it("빈 배열이면 빈 문자열 반환", () => {
    expect(buildCharacterMemoryPrompt([])).toBe("");
  });

  it("타로 세션 메모리를 올바른 형식으로 반환", () => {
    const result = buildCharacterMemoryPrompt([
      { serviceType: "tarot", date: "2026-04-01", overallReading: "운이 좋다" },
    ]);
    expect(result).toContain("이전 상담 기억");
    expect(result).toContain("[2026-04-01] 타로: 운이 좋다");
  });

  it("사주 세션은 '사주' 레이블로 포함", () => {
    const result = buildCharacterMemoryPrompt([
      { serviceType: "saju", date: "2026-03-15", overallReading: "사주 분석" },
    ]);
    expect(result).toContain("[2026-03-15] 사주: 사주 분석");
  });

  it("알 수 없는 서비스 타입은 '신점' 레이블 폴백", () => {
    const result = buildCharacterMemoryPrompt([
      { serviceType: "shinjeom", date: "2026-02-10", overallReading: "신점 결과" },
    ]);
    expect(result).toContain("[2026-02-10] 신점: 신점 결과");
  });

  it("여러 세션을 줄바꿈으로 구분해 포함", () => {
    const result = buildCharacterMemoryPrompt([
      { serviceType: "tarot", date: "2026-04-01", overallReading: "첫번째" },
      { serviceType: "saju",  date: "2026-03-15", overallReading: "두번째" },
    ]);
    expect(result).toContain("첫번째");
    expect(result).toContain("두번째");
  });
});
