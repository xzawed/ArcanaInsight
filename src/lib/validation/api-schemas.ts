import { z } from "zod";

const uuidOrNull = z.string().max(36).nullish();
const topicStr = z.string().max(60);
const charIdStr = z.string().max(50).nullish();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).max(10);
const spreadTypeEnum = z.enum(["one-card", "three-card", "five-card", "celtic-cross", "relationship", "horseshoe", "decision", "week-ahead", "zodiac", "tree-of-life"]);

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

export const ShinjeomSessionSchema = z.object({
  topic: topicStr,
  characterId: z.string().max(50),
});

// 일일 카드 스키마
export const DailyCardSchema = z.object({
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
    gender: z.string().max(10),
    birthHour: z.string().max(20),
  }).nullish(),
  freeQuestion: z.string().max(200).nullish(),
  cards: z.array(z.object({
    cardId: z.string().max(50),
    position: z.number().int().min(0).max(21),
    isReversed: z.boolean(),
  })).min(1).max(22),
});

export const SajuReadingSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  timeRange: z.string().max(30),
  includeMonthly: z.boolean(),
  characterId: charIdStr,
  userInfo: z.object({
    name: z.string().max(50).optional(),
    birthDate: dateStr,
    birthHour: z.string().max(20),
    gender: z.enum(["male", "female", "other"]),
  }),
});

export const ShinjeomMessageSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  characterId: charIdStr,
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
