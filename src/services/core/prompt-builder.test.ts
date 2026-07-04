import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildReadingPrompt, buildUserInfoPrompt, buildCharacterHeader, buildCharacterMemoryPrompt, getLanguageFooter, buildDirectAnswerContract, buildFreeQuestionPrompt, buildReadabilityContract } from "./prompt-builder";
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
    default: "/images/characters/arcana/nukki-enhanced/default.png",
    smile: "/images/characters/arcana/nukki-enhanced/smile.png",
    serious: "/images/characters/arcana/nukki-enhanced/serious.png",
    surprised: "/images/characters/arcana/nukki-enhanced/surprised.png",
    wink: "/images/characters/arcana/nukki-enhanced/wink.png",
    mystical: "/images/characters/arcana/nukki-enhanced/mystical.png",
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
  it("undefined → 빈 문자열", () => {
    expect(buildUserInfoPrompt(undefined)).toBe("");
  });
  it("null → 빈 문자열", () => {
    expect(buildUserInfoPrompt(null)).toBe("");
  });
  it("birthTime HH:MM → 시각+시진 포함", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).toContain("14:30");
    expect(result).toContain("미시");
    expect(result).toContain("未時");
  });
  it("birthTime null → '알 수 없음' 표시", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: null,
    });
    expect(result).toContain("알 수 없음");
  });
  it("mbti 있을 때 포함", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
      mbti: "INTJ",
    });
    expect(result).toContain("MBTI: INTJ");
  });
  it("mbti 없을 때 MBTI 행 생략", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).not.toContain("MBTI");
  });
  it("주입 공격 문자 제거", () => {
    const result = buildUserInfoPrompt({
      name: "홍\n길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "14:30",
    });
    expect(result).not.toContain("\n홍");
  });
  it("birthTime 형식은 맞지만 시진 변환 불가(24시) → 시각 문자열 직접 표시", () => {
    const result = buildUserInfoPrompt({
      name: "홍길동",
      birthDate: "1990-01-01",
      gender: "male",
      birthTime: "24:00",
    });
    expect(result).toContain("24:00");
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

  it("ko 기본: 시스템 프롬프트가 한국어로 작성됨 (응답 형식 명세 포함)", () => {
    const result = buildSystemPrompt(dummyCharacter);
    // ko에서는 별도 언어 지시문이 없지만 시스템 프롬프트 본문은 한국어로 작성됨
    expect(result).toContain("응답 형식");
    expect(result).toContain("절대 규칙");
  });

  it("string 타입을 반환한다", () => {
    expect(typeof buildSystemPrompt(dummyCharacter)).toBe("string");
  });

  it("en locale: 시스템 프롬프트가 영어 지시문으로 시작한다", () => {
    const result = buildSystemPrompt(dummyCharacter, "en");
    expect(result).toContain("CRITICAL");
  });

  it("en locale: LANGUAGE_FOOTER가 시스템 프롬프트 끝에 포함된다", () => {
    const result = buildSystemPrompt(dummyCharacter, "en");
    expect(result).toContain("Begin your JSON response now.");
  });

  it("ja locale: 시스템 프롬프트가 일본어 지시문을 포함한다", () => {
    const result = buildSystemPrompt(dummyCharacter, "ja");
    expect(result).toContain("最重要");
  });

  it("ja locale: LANGUAGE_FOOTER가 시스템 프롬프트 끝에 포함된다", () => {
    const result = buildSystemPrompt(dummyCharacter, "ja");
    expect(result).toContain("今すぐJSON応答を開始してください。");
  });

  it("ko locale: 영어/일본어 강제 지시문이 포함되지 않는다", () => {
    const result = buildSystemPrompt(dummyCharacter, "ko");
    expect(result).not.toContain("CRITICAL");
    expect(result).not.toContain("最重要");
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

  it("5장 스프레드도 '3~4문단' 깊이 가이드를 포함한다 (카드 수 무관 균일 깊이)", () => {
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
    expect(result).toContain("3~4문단");
  });

  it("10장 스프레드도 '3~4문단' 깊이 가이드를 포함한다 (카드 수 무관 균일 깊이)", () => {
    const selected = Array.from({ length: 10 }, (_, i) =>
      makeSelectedCard(dummyCard, i, false)
    );
    const result = buildReadingPrompt("general", selected, tenCardSpread);
    expect(result).toContain("3~4문단");
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

  it("ko (기본 locale): 시스템 프롬프트가 한국어이므로 추가 언어 지시문이 없다 (노이즈 제거)", () => {
    const result = buildCharacterHeader(dummyCharacter);
    expect(result).not.toContain("한국어로만 응답합니다");
    expect(result).not.toContain("English only");
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

  it("en locale: LANGUAGE_INSTRUCTIONS에 영어 강제 지시문이 포함된다", () => {
    const result = buildCharacterHeader(dummyCharacter, undefined, "en");
    expect(result).toContain("CRITICAL");
    expect(result).toContain("English");
  });

  it("ja locale: LANGUAGE_INSTRUCTIONS에 일본어 강제 지시문이 포함된다", () => {
    const result = buildCharacterHeader(dummyCharacter, undefined, "ja");
    expect(result).toContain("最重要");
    expect(result).toContain("日本語");
  });

  it("알 수 없는 locale은 ko와 동일하게 추가 지시문이 없다", () => {
    const result = buildCharacterHeader(dummyCharacter, undefined, "zh" as never);
    expect(result).not.toContain("CRITICAL");
    expect(result).not.toContain("最重要");
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

// ─────────────────────────── getLanguageFooter ───────────────────────────

describe("getLanguageFooter", () => {
  it("ko는 빈 문자열을 반환한다", () => {
    expect(getLanguageFooter("ko")).toBe("");
  });

  it("en은 FINAL REMINDER를 포함한다", () => {
    expect(getLanguageFooter("en")).toContain("FINAL REMINDER");
  });

  it("ja는 最終確認을 포함한다", () => {
    expect(getLanguageFooter("ja")).toContain("最終確認");
  });
});

describe("buildDirectAnswerContract", () => {
  it("3서비스 모두 schemaLine·systemSpec·footerReminder를 반환한다", () => {
    for (const domain of ["tarot", "saju", "shinjeom"] as const) {
      const c = buildDirectAnswerContract(domain);
      expect(c.schemaLine).toContain('"directAnswer"');
      expect(c.systemSpec).toContain("직접 답변(directAnswer)");
      expect(c.footerReminder).toContain("directAnswer");
    }
  });

  it("systemSpec은 answer-first 순서(재진술→방향 단언→확신 수위)를 강제한다", () => {
    const spec = buildDirectAnswerContract("tarot").systemSpec;
    expect(spec).toContain("재진술");
    expect(spec).toContain("방향 단언");
    expect(spec).toContain("확신");
    // 균등 나열 안티패턴 금지
    expect(spec).toContain("균등하게 나열하지");
  });

  it("도메인별 근거 렌즈가 다르다 (tarot=카드, saju=사주 근거, shinjeom=마음) — 쉬운 말로", () => {
    expect(buildDirectAnswerContract("tarot").systemSpec).toContain("카드");
    expect(buildDirectAnswerContract("saju").systemSpec).toContain("사주 근거");
    expect(buildDirectAnswerContract("shinjeom").systemSpec).toContain("마음");
  });

  it("민감 도메인(건강·재정·법률)은 확답 대신 강등 지시를 포함한다", () => {
    expect(buildDirectAnswerContract("saju").systemSpec).toContain("전문가 상담 권유");
  });
});

describe("buildFreeQuestionPrompt", () => {
  it("질문이 없거나 공백이면 빈 문자열을 반환한다", () => {
    expect(buildFreeQuestionPrompt(null)).toBe("");
    expect(buildFreeQuestionPrompt("")).toBe("");
    expect(buildFreeQuestionPrompt("   ")).toBe("");
  });

  it("질문이 있으면 directAnswer 필드에 answer-first로 직답하도록 지시한다", () => {
    const p = buildFreeQuestionPrompt("이번 달에 이직할 수 있을까요?");
    expect(p).toContain("이번 달에 이직할 수 있을까요?");
    expect(p).toContain("directAnswer 필드에서");
    expect(p).toContain("먼저");
    // 균등 나열 헤지 금지
    expect(p).toContain("균등하게 나열하지");
  });

  it("200자를 초과하는 질문은 잘라낸다 (인젝션 방지)", () => {
    const long = "가".repeat(300);
    const p = buildFreeQuestionPrompt(long);
    expect(p).not.toContain("가".repeat(201));
  });
});

describe("buildReadabilityContract (쉬운 말 계약)", () => {
  it("3서비스 모두 systemSpec·fewShot·footerReminder를 반환한다", () => {
    for (const domain of ["tarot", "saju", "shinjeom"] as const) {
      const c = buildReadabilityContract(domain);
      expect(c.systemSpec).toContain("쉬운 말 계약");
      expect(c.fewShot).toContain("→");
      expect(c.footerReminder).toContain("쉽게");
    }
  });

  it("코어 원칙: '분량은 그대로, 쉬운 말로' + '깊이는 구체적 상황·사례에서'", () => {
    const spec = buildReadabilityContract("tarot").systemSpec;
    expect(spec).toContain("문단 수와 분량은 그대로");
    expect(spec).toContain("구체적인 상황·이유·사례");
    // 추상 명사 착지 규칙
    expect(spec).toContain("예를 들어");
  });

  it("도메인별 렌즈가 다르다 (tarot=장면, saju=보약 비유 3단착지, shinjeom=제가 보기엔)", () => {
    expect(buildReadabilityContract("tarot").systemSpec).toContain("장면");
    expect(buildReadabilityContract("saju").systemSpec).toContain("보약");
    expect(buildReadabilityContract("shinjeom").systemSpec).toContain("제가 보기엔");
  });
});

describe("가독성 배선 — 화려체·전문어 제거 (회귀 방지)", () => {
  const character = {
    id: "arcana", name: "아르카나", nameJp: "アルカナ",
    personality: "p", description: "d", speciality: "s", speechStyle: "~요체",
  } as Parameters<typeof buildSystemPrompt>[0];

  it("타로 시스템 프롬프트에 쉬운 말 계약이 들어가고, 화려체 예시는 사라진다", () => {
    const p = buildSystemPrompt(character, "ko");
    expect(p).toContain("쉬운 말 계약");
    expect(p).not.toContain("전차의 흰 말과 검은 말");
    expect(p).not.toContain("원형적·신화적·심리적 의미");
  });
});
