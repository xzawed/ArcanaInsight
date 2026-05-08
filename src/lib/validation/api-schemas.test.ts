import { describe, it, expect } from "vitest";
import {
  TarotReadingSchema,
  SajuReadingSchema,
  ShinjeomMessageSchema,
  TarotSessionSchema,
  SajuSessionSchema,
  ShinjeomSessionSchema,
  DailyCardSchema,
} from "./api-schemas";

// ──────────────────────────────────────────────
// TarotReadingSchema
// ──────────────────────────────────────────────
describe("TarotReadingSchema", () => {
  const validCards = [{ cardId: "major-00-fool", position: 0, isReversed: false }];

  it("정상 요청 통과", () => {
    const result = TarotReadingSchema.safeParse({
      sessionId: "uuid-1234",
      topic: "love",
      spreadType: "one-card",
      characterId: "arcana",
      userInfo: { name: "홍길동", birthDate: "1990-01-01", gender: "male", birthHour: "자시" },
      cards: validCards,
    });
    expect(result.success).toBe(true);
  });

  // null은 Zustand store 초기값 — 반드시 허용해야 함 (이번 장애 핵심 케이스)
  it("spreadType=null 허용 (Zustand store 초기값)", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", spreadType: null, cards: validCards });
    expect(result.success).toBe(true);
  });

  it("characterId=null 허용 (Zustand store 초기값)", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", characterId: null, cards: validCards });
    expect(result.success).toBe(true);
  });

  it("userInfo=null 허용 (Zustand store 초기값)", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", userInfo: null, cards: validCards });
    expect(result.success).toBe(true);
  });

  it("sessionId=null 허용", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", sessionId: null, cards: validCards });
    expect(result.success).toBe(true);
  });

  it("spreadType=undefined 허용", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", cards: validCards });
    expect(result.success).toBe(true);
  });

  it("cards 비어있으면 실패", () => {
    const result = TarotReadingSchema.safeParse({ topic: "love", cards: [] });
    expect(result.success).toBe(false);
  });

  it("cards 23장 초과 실패", () => {
    const tooMany = Array.from({ length: 23 }, (_, i) => ({ cardId: `card-${i}`, position: i, isReversed: false }));
    const result = TarotReadingSchema.safeParse({ topic: "love", cards: tooMany });
    expect(result.success).toBe(false);
  });

  // spread별 cards.length 일치 검증 (superRefine) — 빠른 클릭 race로 부족·초과 카드로 startReading 호출되어
  // "1-2장 뒤집힌 후 서버 실패 메시지" 발생하던 이슈(2026-05-08) 차단
  it("celtic-cross spreadType + cards 9장 → 실패 (10장 요구)", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ cardId: `card-${i}`, position: i, isReversed: false }));
    const result = TarotReadingSchema.safeParse({ topic: "love", spreadType: "celtic-cross", cards: nine });
    expect(result.success).toBe(false);
  });

  it("celtic-cross spreadType + cards 10장 → 통과", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ cardId: `card-${i}`, position: i, isReversed: false }));
    const result = TarotReadingSchema.safeParse({ topic: "love", spreadType: "celtic-cross", cards: ten });
    expect(result.success).toBe(true);
  });

  it("zodiac spreadType + cards 11장 → 실패 (12장 요구)", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => ({ cardId: `card-${i}`, position: i, isReversed: false }));
    const result = TarotReadingSchema.safeParse({ topic: "love", spreadType: "zodiac", cards: eleven });
    expect(result.success).toBe(false);
  });

  it("three-card spreadType + cards 1장 → 실패 (3장 요구)", () => {
    const result = TarotReadingSchema.safeParse({
      topic: "love", spreadType: "three-card", cards: validCards,
    });
    expect(result.success).toBe(false);
  });

  it("spreadType=null이면 cards 길이만 검증 (superRefine 건너뜀)", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ cardId: `card-${i}`, position: i, isReversed: false }));
    const result = TarotReadingSchema.safeParse({ topic: "love", spreadType: null, cards: five });
    expect(result.success).toBe(true);
  });

  it("topic 누락 시 실패", () => {
    const result = TarotReadingSchema.safeParse({ cards: validCards });
    expect(result.success).toBe(false);
  });

  it("cards[].position 음수 실패", () => {
    const result = TarotReadingSchema.safeParse({
      topic: "love",
      cards: [{ cardId: "major-00-fool", position: -1, isReversed: false }],
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// SajuReadingSchema
// ──────────────────────────────────────────────
describe("SajuReadingSchema", () => {
  const validBase = {
    topic: "saju-general",
    timeRange: "this-year",
    includeMonthly: false,
    userInfo: { birthDate: "1990-01-01", birthHour: "자시", gender: "male" as const },
  };

  it("정상 요청 통과", () => {
    expect(SajuReadingSchema.safeParse(validBase).success).toBe(true);
  });

  it("characterId=null 허용", () => {
    expect(SajuReadingSchema.safeParse({ ...validBase, characterId: null }).success).toBe(true);
  });

  it("sessionId=null 허용", () => {
    expect(SajuReadingSchema.safeParse({ ...validBase, sessionId: null }).success).toBe(true);
  });

  it("userInfo.name 선택 (없어도 통과)", () => {
    expect(SajuReadingSchema.safeParse(validBase).success).toBe(true);
  });

  it("userInfo 누락 시 실패", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userInfo: _ui, ...withoutUserInfo } = validBase;
    expect(SajuReadingSchema.safeParse(withoutUserInfo).success).toBe(false);
  });

  it("gender 허용값 외 실패", () => {
    expect(SajuReadingSchema.safeParse({
      ...validBase,
      userInfo: { ...validBase.userInfo, gender: "unknown" },
    }).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// ShinjeomMessageSchema
// ──────────────────────────────────────────────
describe("ShinjeomMessageSchema", () => {
  const validBase = {
    topic: "shinjeom-general",
    chatHistory: [],
    isFinalTurn: false,
    messageIndex: 0,
  };

  it("정상 요청 통과", () => {
    expect(ShinjeomMessageSchema.safeParse(validBase).success).toBe(true);
  });

  it("characterId=null 허용", () => {
    expect(ShinjeomMessageSchema.safeParse({ ...validBase, characterId: null }).success).toBe(true);
  });

  it("chatHistory 101개 초과 실패 (토큰 과소비 방어)", () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => ({
      id: `msg-${i}`, role: "user" as const, content: "test", timestamp: Date.now(),
    }));
    expect(ShinjeomMessageSchema.safeParse({ ...validBase, chatHistory: tooMany }).success).toBe(false);
  });

  it("messageIndex 음수 실패", () => {
    expect(ShinjeomMessageSchema.safeParse({ ...validBase, messageIndex: -1 }).success).toBe(false);
  });

  it("content 5000자 초과 실패", () => {
    const longContent = "x".repeat(5001);
    const history = [{ id: "1", role: "user" as const, content: longContent, timestamp: 0 }];
    expect(ShinjeomMessageSchema.safeParse({ ...validBase, chatHistory: history }).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// TarotSessionSchema
// ──────────────────────────────────────────────
describe("TarotSessionSchema", () => {
  it("정상 요청 통과", () => {
    expect(TarotSessionSchema.safeParse({ topic: "love", characterId: "arcana", spreadType: "one-card" }).success).toBe(true);
  });

  it("characterId=null 허용", () => {
    expect(TarotSessionSchema.safeParse({ topic: "love", characterId: null }).success).toBe(true);
  });

  it("spreadType=null 허용", () => {
    expect(TarotSessionSchema.safeParse({ topic: "love", spreadType: null }).success).toBe(true);
  });

  it("topic 누락 시 실패", () => {
    expect(TarotSessionSchema.safeParse({ characterId: "arcana" }).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// SajuSessionSchema
// ──────────────────────────────────────────────
describe("SajuSessionSchema", () => {
  it("정상 요청 통과", () => {
    expect(SajuSessionSchema.safeParse({ topic: "saju-general", characterId: "arcana" }).success).toBe(true);
  });

  it("characterId=null 허용", () => {
    expect(SajuSessionSchema.safeParse({ topic: "saju-general", characterId: null }).success).toBe(true);
  });

  it("topic 누락 시 실패", () => {
    expect(SajuSessionSchema.safeParse({}).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// ShinjeomSessionSchema
// ──────────────────────────────────────────────
describe("ShinjeomSessionSchema", () => {
  it("정상 요청 통과", () => {
    expect(ShinjeomSessionSchema.safeParse({ topic: "shinjeom-general", characterId: "arcana" }).success).toBe(true);
  });

  it("characterId 누락 시 실패 (신점은 필수)", () => {
    expect(ShinjeomSessionSchema.safeParse({ topic: "shinjeom-general" }).success).toBe(false);
  });

  it("topic 누락 시 실패", () => {
    expect(ShinjeomSessionSchema.safeParse({ characterId: "arcana" }).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// DailyCardSchema
// ──────────────────────────────────────────────
describe("DailyCardSchema", () => {
  it("정상 요청 통과", () => {
    expect(DailyCardSchema.safeParse({ characterId: "arcana", date: "2026-04-24" }).success).toBe(true);
  });

  it("date 형식 불일치 실패 (YYYY-MM-DD 아님)", () => {
    expect(DailyCardSchema.safeParse({ characterId: "arcana", date: "24-04-2026" }).success).toBe(false);
  });

  it("characterId 빈 문자열 실패", () => {
    expect(DailyCardSchema.safeParse({ characterId: "", date: "2026-04-24" }).success).toBe(false);
  });

  it("date 누락 시 실패", () => {
    expect(DailyCardSchema.safeParse({ characterId: "arcana" }).success).toBe(false);
  });

  it("characterId 누락 시 실패", () => {
    expect(DailyCardSchema.safeParse({ date: "2026-04-24" }).success).toBe(false);
  });
});
