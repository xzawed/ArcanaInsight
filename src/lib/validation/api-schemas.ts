import { z } from "zod";
import { LOCALES } from "@/i18n/config";

const uuidOrNull = z.string().max(36).nullish();
const topicStr = z.string().max(60);
const charIdStr = z.string().max(50).nullish();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).max(10);
const spreadTypeEnum = z.enum(["one-card", "three-card", "five-card", "celtic-cross", "relationship", "horseshoe", "decision", "week-ahead", "zodiac", "tree-of-life"]);
const localeEnum = z.enum(LOCALES);

/**
 * Spread별 정확한 카드 수 — Zod superRefine 및 클라이언트 가드에서 사용.
 * 빠른 클릭 race로 cards.length가 spread 요구 수와 mismatch인 채 startReading 호출되어
 * 1-2장만 뒤집힌 채 서버 실패 메시지가 표시되는 이슈(2026-05-08 보고) 차단용.
 */
export const SPREAD_REQUIRED_CARDS: Record<string, number> = {
  "one-card": 1,
  "three-card": 3,
  "five-card": 5,
  "celtic-cross": 10,
  "relationship": 7,
  "horseshoe": 7,
  "decision": 5,
  "week-ahead": 7,
  "zodiac": 12,
  "tree-of-life": 10,
};

export const LocaleSchema = z.object({
  locale: localeEnum,
});

// 익명 세션 claim 스키마 — 로그인 시 클라이언트 보관 익명 sessionId 일괄 귀속
export const ClaimSessionsSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1).max(100),
});

// 세션 생성 스키마
export const TarotSessionSchema = z.object({
  topic: topicStr,
  characterId: charIdStr,
  spreadType: spreadTypeEnum.nullish(),
});

export const SajuSessionSchema = z.object({
  topic: topicStr,
  characterId: charIdStr,
});

// Shinjeom 세션은 캐릭터 선택 후 진입하는 플로우라 characterId 필수
// (charIdStr.nullish 미사용 의도)
export const ShinjeomSessionSchema = z.object({
  topic: topicStr,
  characterId: z.string().max(50),
});

// 일일 카드는 홈에서 즐겨찾기 캐릭터를 강제 선택해 호출 — characterId 필수 + 빈 문자열 거부
export const DailyCardSchema = z.object({
  characterId: z.string().min(1).max(50),
  date: dateStr,
});

// 일일 운세는 홈에서 즐겨찾기 캐릭터를 강제 선택해 호출 — characterId 필수 + 빈 문자열 거부
export const DailyFortuneSchema = z.object({
  characterId: z.string().min(1).max(50),
  date: dateStr,
});

export const TarotReadingSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  spreadType: spreadTypeEnum.nullish(),
  characterId: charIdStr,
  userInfo: z.object({
    name: z.string().max(50),
    birthDate: dateStr,
    gender: z.enum(["male", "female", "other"]),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    mbti: z.string().max(10).optional(),
  }).nullish(),
  freeQuestion: z.string().max(200).nullish(),
  cards: z.array(z.object({
    cardId: z.string().max(50),
    position: z.number().int().min(0).max(21),
    isReversed: z.boolean(),
  })).min(1).max(22),
}).superRefine((data, ctx) => {
  const cardIds = new Set<string>();
  const positions = new Set<number>();
  data.cards.forEach((card, index) => {
    if (cardIds.has(card.cardId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate cardId '${card.cardId}'`,
        path: ["cards", index, "cardId"],
      });
    }
    cardIds.add(card.cardId);

    if (positions.has(card.position)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate position '${card.position}'`,
        path: ["cards", index, "position"],
      });
    }
    positions.add(card.position);
  });

  // spread별 정확한 카드 수와 일치 강제 — 빠른 클릭 race로 부족·초과 카드로 startReading 호출 차단
  if (!data.spreadType) return;
  const expected = SPREAD_REQUIRED_CARDS[data.spreadType];
  if (expected !== undefined && data.cards.length !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `cards.length must be ${expected} for spread '${data.spreadType}', got ${data.cards.length}`,
      path: ["cards"],
    });
  }
});

export const SajuReadingSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  timeRange: z.string().max(30),
  includeMonthly: z.boolean(),
  characterId: charIdStr,
  freeQuestion: z.string().max(200).nullish(),
  userInfo: z.object({
    name: z.string().max(50).optional(),
    birthDate: dateStr,
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    gender: z.enum(["male", "female", "other"]),
    mbti: z.string().max(10).optional(),
  }),
});

export const ShinjeomMessageSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  characterId: charIdStr,
  userInfo: z.object({
    name: z.string().max(50),
    birthDate: z.union([dateStr, z.literal("")]),
    gender: z.enum(["male", "female", "other"]),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    mbti: z.string().max(10).optional(),
  }).nullish(),
  currentMessage: z.string().max(2000).optional(),
  chatHistory: z.array(z.object({
    id: z.string().max(100),
    role: z.enum(["user", "character", "system"]),
    content: z.string().max(5000),
    mood: z.string().max(30).optional(),
    timestamp: z.union([z.string(), z.number()]),
  })).max(100),
  isFinalTurn: z.boolean(),
  messageIndex: z.number().int().min(0).max(200),
});

// 선호 캐릭터는 null로 해제 가능하지만 키는 필수 — undefined(빈 body)는 400
// (.nullable() 의도 — .nullish()로 바꾸면 빈 body도 통과되어 보안 테스트 깨짐)
export const FavoriteCharacterSchema = z.object({
  characterId: z.string().max(50).nullable(),
});
