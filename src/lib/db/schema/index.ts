import {
  pgTable, uuid, text, boolean, integer,
  timestamp, date, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  provider: text("provider"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).defaultNow(),
  favoriteCharacterId: text("favorite_character_id"),
  birthName: text("birth_name"),
  birthDate: date("birth_date"),
  gender: text("gender"),
  birthHour: text("birth_hour"),
  mbti: text("mbti"),
  privacyAgreedAt: timestamp("privacy_agreed_at", { withTimezone: true }),
  selectedSkin: text("selected_skin").default("gold-luxury"),
  locale: text("locale").default("ko"),
})

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  serviceType: text("service_type").notNull(),
  topic: text("topic").notNull(),
  spreadType: text("spread_type"),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  characterId: text("character_id"),
  locale: text("locale").default("ko"),
}, (t) => [
  index("idx_sessions_user_id").on(t.userId),
  index("idx_sessions_status").on(t.status),
  index("idx_sessions_character_id").on(t.characterId),
  index("idx_sessions_user_locale").on(t.userId, t.locale),
])

export const sessionCards = pgTable("session_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  cardId: text("card_id").notNull(),
  position: integer("position").notNull(),
  isReversed: boolean("is_reversed").default(false).notNull(),
  selectedAt: timestamp("selected_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_session_cards_session_id").on(t.sessionId),
])

export const readings = pgTable("readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull().unique(),
  cardInterpretation: jsonb("card_interpretation").notNull().default([]),
  overallReading: text("overall_reading").notNull().default(""),
  directAnswer: text("direct_answer").default(""),
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique().$defaultFn(() => crypto.randomUUID()),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  locale: text("locale").default("ko"),
}, (t) => [
  index("idx_readings_share_token").on(t.shareToken),
])

export const dailyCards = pgTable("daily_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  characterId: text("character_id").notNull(),
  cardId: text("card_id").notNull(),
  isReversed: boolean("is_reversed").default(false),
  interpretation: text("interpretation").notNull(),
  keywords: text("keywords").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  area: text("area").notNull().default("general"),
}, (t) => [
  uniqueIndex("daily_cards_date_character_area_key").on(t.date, t.characterId, t.area),
])

export const sajuReadings = pgTable("saju_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull().unique(),
  birthDate: date("birth_date").notNull(),
  birthHour: text("birth_hour"),
  gender: text("gender").notNull(),
  birthName: text("birth_name"),
  mbti: text("mbti"),
  pillars: jsonb("pillars").notNull(),
  dayMaster: text("day_master").notNull(),
  dayMasterElement: text("day_master_element").notNull(),
  isStrong: boolean("is_strong").notNull(),
  elements: jsonb("elements").notNull(),
  tenStars: jsonb("ten_stars").notNull(),
  twelveStages: jsonb("twelve_stages").notNull(),
  interactions: jsonb("interactions").notNull(),
  yongsin: jsonb("yongsin").notNull(),
  majorFortunes: jsonb("major_fortunes").notNull(),
  yearlyFortune: jsonb("yearly_fortune").notNull(),
  overallReading: text("overall_reading").notNull().default(""),
  topicReading: text("topic_reading").notNull().default(""),
  directAnswer: text("direct_answer").default(""),
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique().$defaultFn(() => crypto.randomUUID()),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  locale: text("locale").default("ko"),
}, (t) => [
  index("idx_saju_readings_session_id").on(t.sessionId),
  index("idx_saju_readings_share_token").on(t.shareToken),
  index("idx_saju_readings_birth_date").on(t.birthDate),
])

export const shinjeomMessages = pgTable("shinjeom_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageIndex: integer("message_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_shinjeom_messages_session").on(t.sessionId, t.messageIndex),
])

export const shinjeomReadings = pgTable("shinjeom_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull().unique(),
  overallReading: text("overall_reading").notNull().default(""),
  topicReading: text("topic_reading").notNull().default(""),
  directAnswer: text("direct_answer").default(""),
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique().$defaultFn(() => crypto.randomUUID()),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  locale: text("locale").default("ko"),
})

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  characterConfig: jsonb("character_config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
