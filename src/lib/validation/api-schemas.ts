import { z } from "zod";

const uuidOrNull = z.string().max(36).nullish();
const topicStr = z.string().max(60);
const charIdStr = z.string().max(50).nullish();

export const TarotReadingSchema = z.object({
  sessionId: uuidOrNull,
  topic: topicStr,
  spreadType: z.enum(["one-card", "three-card", "five-card", "seven-card", "ten-card", "relationship", "horseshoe", "decision", "weekly", "zodiac", "tree-of-life"]).nullish(),
  characterId: charIdStr,
  userInfo: z.object({
    name: z.string().max(50),
    birthDate: z.string().max(20),
    gender: z.string().max(10),
    birthHour: z.string().max(20),
  }).nullish(),
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
    birthDate: z.string().max(20),
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
