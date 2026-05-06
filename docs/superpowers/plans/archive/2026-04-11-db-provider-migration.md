# DB Provider 마이그레이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DB_PROVIDER` 환경변수 하나로 Supabase ↔ 온프레미스 PostgreSQL을 즉시 전환할 수 있는 Provider 추상화 레이어를 구현한다.

**Architecture:** `src/lib/db/`, `src/lib/auth/`, `src/lib/storage/` 아래에 공통 인터페이스를 정의하고, 팩토리 함수(`getDb()`, `getCurrentUser()`)가 `DB_PROVIDER` 값에 따라 Supabase 또는 Drizzle 구현체를 반환한다. 기존 API 라우트 10개는 `createClient()` 호출을 `getDb()` + auth 함수 호출로 교체하는 것 외 로직 변경이 없다.

**Tech Stack:** Drizzle ORM, postgres.js, NextAuth.js v5 (Auth.js), Next.js App Router, TypeScript strict

---

## 파일 변경 맵

### 신규 생성
- `src/lib/db/types.ts` — DbClient 공통 인터페이스
- `src/lib/db/schema/index.ts` — Drizzle 스키마 (9개 migration 변환)
- `src/lib/db/supabase-adapter.ts` — Supabase DbClient 구현
- `src/lib/db/postgres-adapter.ts` — Drizzle DbClient 구현
- `src/lib/db/index.ts` — getDb() 팩토리
- `src/lib/auth/supabase-auth.ts` — Supabase Auth 래핑
- `src/lib/auth/nextauth.ts` — NextAuth.js v5 설정
- `src/lib/auth/index.ts` — getCurrentUser() / requireUser() 공통 함수
- `src/lib/storage/index.ts` — getCardImageUrl() 등 provider별 URL
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth.js API 핸들러
- `drizzle.config.ts` — drizzle-kit 설정
- `scripts/download-skin-images.ts` — Supabase Storage → public/images/skins/ 다운로드

### 수정
- `middleware.ts` — DB_PROVIDER 분기 추가
- `src/app/auth/login/page.tsx` — NextAuth signIn() 분기 추가
- `src/app/auth/callback/route.ts` — NextAuth 콜백 처리 분기 추가
- `src/app/api/tarot/session/route.ts` — getDb() + getCurrentUser()
- `src/app/api/tarot/reading/route.ts` — getDb()
- `src/app/api/tarot/result/[id]/route.ts` — getDb()
- `src/app/api/saju/session/route.ts` — getDb() + getCurrentUser()
- `src/app/api/saju/reading/route.ts` — getDb()
- `src/app/api/saju/result/[id]/route.ts` — getDb()
- `src/app/api/shinjeom/session/route.ts` — getDb() + getCurrentUser()
- `src/app/api/shinjeom/message/route.ts` — getDb()
- `src/app/api/profile/favorite-character/route.ts` — getDb() + requireUser()
- `src/app/api/daily-card/route.ts` — getDb()

---

## Task 1: 패키지 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight
pnpm add drizzle-orm postgres next-auth@beta
pnpm add -D drizzle-kit
```

- [ ] **Step 2: 설치 확인**

```bash
pnpm list drizzle-orm postgres next-auth drizzle-kit
```

Expected: 각 패키지 버전 출력 (drizzle-orm ^0.x, postgres ^3.x, next-auth ^5.x)

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: drizzle-orm, postgres, next-auth@beta 패키지 추가"
```

---

## Task 2: DB 공통 인터페이스 정의

**Files:**
- Create: `src/lib/db/types.ts`

- [ ] **Step 1: types.ts 작성**

`src/lib/db/types.ts` 전체 내용:

```typescript
export interface DbClient {
  /** 단건 조회 — 없으면 null */
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>
  /** 목록 조회 */
  findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]>
  /** 단건 삽입 — 삽입된 행 반환 */
  insert<T>(table: string, data: Record<string, unknown>): Promise<T>
  /** 다건 삽입 */
  insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]>
  /** 조건 업데이트 — 업데이트된 첫 행 반환 */
  update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null>
  /** Upsert — conflictOn은 콤마 구분 컬럼명 (예: "date,character_id") */
  upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T>
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/types.ts
git commit -m "feat: DbClient 공통 인터페이스 추가"
```

---

## Task 3: Drizzle 스키마 작성

**Files:**
- Create: `src/lib/db/schema/index.ts`

모든 9개 마이그레이션을 단일 Drizzle 스키마 파일로 변환한다. `auth.users` 참조는 온프레미스에서 불필요하므로 `profiles.id`를 독립 UUID PK로 사용한다.

- [ ] **Step 1: schema/index.ts 작성**

`src/lib/db/schema/index.ts` 전체 내용:

```typescript
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
  privacyAgreedAt: timestamp("privacy_agreed_at", { withTimezone: true }),
  selectedSkin: text("selected_skin").default("gold-luxury"),
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
}, (t) => [
  index("idx_sessions_user_id").on(t.userId),
  index("idx_sessions_status").on(t.status),
  index("idx_sessions_character_id").on(t.characterId),
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
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
}, (t) => [
  uniqueIndex("daily_cards_date_character_id_key").on(t.date, t.characterId),
])

export const sajuReadings = pgTable("saju_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull().unique(),
  birthDate: date("birth_date").notNull(),
  birthHour: text("birth_hour").notNull(),
  gender: text("gender").notNull(),
  birthName: text("birth_name"),
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
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  advice: text("advice").notNull().default(""),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  characterConfig: jsonb("character_config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/schema/index.ts
git commit -m "feat: Drizzle 스키마 정의 (9개 migration SQL 변환)"
```

---

## Task 4: Supabase DB 어댑터

**Files:**
- Create: `src/lib/db/supabase-adapter.ts`

기존 Supabase `createClient()` 를 그대로 사용하는 DbClient 구현체.

- [ ] **Step 1: supabase-adapter.ts 작성**

`src/lib/db/supabase-adapter.ts` 전체 내용:

```typescript
import { createClient } from "@/lib/supabase/server"
import type { DbClient } from "./types"

export class SupabaseAdapter implements DbClient {
  private async client() {
    return createClient()
  }

  async findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null> {
    const supabase = await this.client()
    let query = supabase.from(table).select("*")
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value) as typeof query
    }
    const { data, error } = await query.single()
    if (error) return null
    return data as T
  }

  async findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]> {
    const supabase = await this.client()
    let query = supabase.from(table).select("*")
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value) as typeof query
      }
    }
    const { data, error } = await query
    if (error) return []
    return (data ?? []) as T[]
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const supabase = await this.client()
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) throw new Error(error.message)
    return result as T
  }

  async insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]> {
    const supabase = await this.client()
    const { data: result, error } = await supabase.from(table).insert(data).select()
    if (error) throw new Error(error.message)
    return (result ?? []) as T[]
  }

  async update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null> {
    const supabase = await this.client()
    let query = supabase.from(table).update(data)
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value) as typeof query
    }
    const { data: result, error } = await (query as ReturnType<typeof supabase.from>).select().single()
    if (error) return null
    return result as T
  }

  async upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T> {
    const supabase = await this.client()
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, { onConflict: conflictOn })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return result as T
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/supabase-adapter.ts
git commit -m "feat: SupabaseAdapter — DbClient 인터페이스 Supabase 구현"
```

---

## Task 5: Drizzle Config + PostgreSQL 어댑터

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/postgres-adapter.ts`

- [ ] **Step 1: drizzle.config.ts 작성**

프로젝트 루트 `drizzle.config.ts` 전체 내용:

```typescript
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config
```

- [ ] **Step 2: postgres-adapter.ts 작성**

`src/lib/db/postgres-adapter.ts` 전체 내용:

```typescript
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq, and, sql } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import * as schema from "./schema/index"
import type { DbClient } from "./types"

let _db: ReturnType<typeof drizzle> | null = null

function getConnection() {
  if (!_db) {
    if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is required")
    const client = postgres(process.env.POSTGRES_URL, { max: 10 })
    _db = drizzle(client, { schema })
  }
  return _db
}

const TABLE_MAP: Record<string, PgTable> = {
  profiles: schema.profiles,
  sessions: schema.sessions,
  session_cards: schema.sessionCards,
  readings: schema.readings,
  daily_cards: schema.dailyCards,
  saju_readings: schema.sajuReadings,
  shinjeom_messages: schema.shinjeomMessages,
  shinjeom_readings: schema.shinjeomReadings,
  services: schema.services,
}

function resolveTable(name: string): PgTable {
  const t = TABLE_MAP[name]
  if (!t) throw new Error(`Unknown table: ${name}`)
  return t
}

function buildConditions(table: PgTable, where: Record<string, unknown>) {
  return Object.entries(where).map(([k, v]) => {
    // camelCase 컬럼 접근 (Drizzle 스키마는 camelCase alias 사용)
    const col = (table as unknown as Record<string, unknown>)[k]
      ?? (table as unknown as Record<string, unknown>)[snakeToCamel(k)]
    if (!col) throw new Error(`Unknown column: ${k} in table`)
    return eq(col as Parameters<typeof eq>[0], v)
  })
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

export class PostgresAdapter implements DbClient {
  async findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null> {
    const db = getConnection()
    const t = resolveTable(table)
    const conditions = buildConditions(t, where)
    const result = await db.select().from(t).where(and(...conditions)).limit(1)
    return (result[0] as T) ?? null
  }

  async findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]> {
    const db = getConnection()
    const t = resolveTable(table)
    if (!where || Object.keys(where).length === 0) {
      const result = await db.select().from(t)
      return result as T[]
    }
    const conditions = buildConditions(t, where)
    const result = await db.select().from(t).where(and(...conditions))
    return result as T[]
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const db = getConnection()
    const t = resolveTable(table)
    const result = await db.insert(t).values(data as Parameters<typeof db.insert>[0]["values"][0]).returning()
    if (!result[0]) throw new Error(`Insert failed for table: ${table}`)
    return result[0] as T
  }

  async insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[]> {
    const db = getConnection()
    const t = resolveTable(table)
    const result = await db.insert(t).values(data as Parameters<typeof db.insert>[0]["values"]).returning()
    return result as T[]
  }

  async update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null> {
    const db = getConnection()
    const t = resolveTable(table)
    const conditions = buildConditions(t, where)
    const result = await db.update(t).set(data).where(and(...conditions)).returning()
    return (result[0] as T) ?? null
  }

  async upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T> {
    const db = getConnection()
    const t = resolveTable(table)
    // conflictOn: "date,character_id" 형태 → 컬럼 배열로 파싱
    const conflictCols = conflictOn.split(",").map((c) => {
      const col = (t as unknown as Record<string, unknown>)[snakeToCamel(c.trim())]
        ?? (t as unknown as Record<string, unknown>)[c.trim()]
      if (!col) throw new Error(`Unknown conflict column: ${c}`)
      return col as Parameters<typeof eq>[0]
    })
    const result = await db
      .insert(t)
      .values(data as Parameters<typeof db.insert>[0]["values"][0])
      .onConflictDoUpdate({
        target: conflictCols,
        set: data as Record<string, unknown>,
      })
      .returning()
    if (!result[0]) throw new Error(`Upsert failed for table: ${table}`)
    return result[0] as T
  }
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음. Drizzle의 동적 타입 추론 한계로 일부 `as unknown` 캐스팅이 필요할 수 있음 — 타입 체크 통과가 기준.

- [ ] **Step 4: 커밋**

```bash
git add drizzle.config.ts src/lib/db/postgres-adapter.ts
git commit -m "feat: PostgresAdapter + drizzle.config.ts 추가"
```

---

## Task 6: DB 팩토리

**Files:**
- Create: `src/lib/db/index.ts`

- [ ] **Step 1: index.ts 작성**

`src/lib/db/index.ts` 전체 내용:

```typescript
import type { DbClient } from "./types"

export function getDb(): DbClient {
  if (process.env.DB_PROVIDER === "postgres") {
    const { PostgresAdapter } = require("./postgres-adapter") as typeof import("./postgres-adapter")
    return new PostgresAdapter()
  }
  const { SupabaseAdapter } = require("./supabase-adapter") as typeof import("./supabase-adapter")
  return new SupabaseAdapter()
}

export type { DbClient } from "./types"
```

> `require()`를 사용하는 이유: Supabase 어댑터는 `next/headers`에 의존해 Edge Runtime에서 동적으로만 로드 가능. PostgreSQL 모드에서 Supabase 관련 모듈이 번들에 포함되지 않도록 lazy require.

- [ ] **Step 2: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/index.ts
git commit -m "feat: getDb() 팩토리 — DB_PROVIDER 기반 어댑터 선택"
```

---

## Task 7: Auth 추상화 레이어

**Files:**
- Create: `src/lib/auth/supabase-auth.ts`
- Create: `src/lib/auth/index.ts`

- [ ] **Step 1: supabase-auth.ts 작성**

`src/lib/auth/supabase-auth.ts` 전체 내용:

```typescript
import { createClient } from "@/lib/supabase/server"

export async function getSupabaseUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return null
  return { id: user.id, email: user.email ?? "" }
}
```

- [ ] **Step 2: auth/index.ts 작성**

`src/lib/auth/index.ts` 전체 내용:

```typescript
export interface AuthUser {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (process.env.DB_PROVIDER === "postgres") {
    const { auth } = await import("./nextauth")
    const session = await auth()
    if (!session?.user?.id) return null
    return { id: session.user.id, email: session.user.email ?? "" }
  }
  const { getSupabaseUser } = await import("./supabase-auth")
  return getSupabaseUser()
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: `nextauth` 모듈이 아직 없어 에러 발생 — 다음 Task에서 해결.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/auth/supabase-auth.ts src/lib/auth/index.ts
git commit -m "feat: Auth 추상화 레이어 — getCurrentUser / requireUser"
```

---

## Task 8: NextAuth.js v5 설정 + API 라우트

**Files:**
- Create: `src/lib/auth/nextauth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: nextauth.ts 작성**

`src/lib/auth/nextauth.ts` 전체 내용:

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { getDb } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.email) return false
      try {
        const db = getDb()
        await db.upsert(
          "profiles",
          {
            id: user.id,
            email: user.email,
            nickname: user.name ?? user.email.split("@")[0],
            avatar_url: user.image ?? null,
            provider: "google",
          },
          "id"
        )
      } catch (e) {
        console.error("profiles upsert 실패:", e)
        // 프로필 저장 실패해도 로그인은 허용
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
})
```

- [ ] **Step 2: NextAuth API 라우트 생성**

`src/app/api/auth/[...nextauth]/route.ts` 전체 내용:

```typescript
import { handlers } from "@/lib/auth/nextauth"

export const { GET, POST } = handlers
```

- [ ] **Step 3: NextAuth 세션 타입 확장**

`src/types/next-auth.d.ts` 신규 생성:

```typescript
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth/nextauth.ts src/app/api/auth/[...nextauth]/route.ts src/types/next-auth.d.ts
git commit -m "feat: NextAuth.js v5 Google Provider 설정 + API 라우트"
```

---

## Task 9: 로그인 페이지 dual-mode 처리

**Files:**
- Modify: `src/app/auth/login/page.tsx`

현재 페이지는 Supabase `signInWithOAuth`를 직접 호출한다. `DB_PROVIDER=postgres` 모드에서는 NextAuth의 `signIn('google')` 을 사용해야 한다. 환경변수를 클라이언트에서 읽을 수 없으므로 서버 컴포넌트에서 provider를 판별하고 클라이언트 컴포넌트에 prop으로 전달한다.

- [ ] **Step 1: 로그인 페이지 수정**

`src/app/auth/login/page.tsx` 전체 내용:

```typescript
import { Suspense } from "react"
import LoginClient from "./LoginClient"

export default function LoginPage() {
  const useNextAuth = process.env.DB_PROVIDER === "postgres"
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-arcana-muted">로딩 중...</p>
      </div>
    }>
      <LoginClient useNextAuth={useNextAuth} />
    </Suspense>
  )
}
```

- [ ] **Step 2: LoginClient 컴포넌트 생성**

`src/app/auth/login/LoginClient.tsx` 신규 생성:

```typescript
"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  useNextAuth: boolean
}

export default function LoginClient({ useNextAuth }: Props) {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const message = searchParams.get("message")
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoginError(null)
    if (useNextAuth) {
      await signIn("google", { callbackUrl: "/" })
      return
    }
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
    if (authError) setLoginError(authError.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/login-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>
      <div className="w-full max-w-sm relative">
        <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-8 shadow-xl shadow-arcana-purple/30">
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 animate-float">
              <Image src="/images/backgrounds/deco-crystal-ball.jpg" alt="" fill className="object-contain rounded-full" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-purple mb-2">로그인</h1>
            <p className="text-arcana-muted text-sm">리딩 히스토리를 저장하고 관리하세요</p>
          </div>
          {(error || loginError) && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <p className="font-bold">로그인 실패</p>
              <p className="mt-1 text-xs">{loginError || message || error}</p>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full px-6 py-2.5 rounded-full bg-white text-gray-800 font-serif font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg shadow-arcana-purple/20"
            >
              <span>G</span> Google로 로그인
            </button>
          </div>
          <p className="text-arcana-muted text-xs text-center mt-6">로그인 없이도 타로 상담을 이용할 수 있습니다</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/auth/login/page.tsx src/app/auth/login/LoginClient.tsx
git commit -m "feat: 로그인 페이지 dual-mode — Supabase / NextAuth 분기"
```

---

## Task 10: Auth Callback + Middleware dual-mode

**Files:**
- Modify: `src/app/auth/callback/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: auth/callback/route.ts 수정**

`src/app/auth/callback/route.ts` 전체 내용 — NextAuth 모드에서는 `/api/auth/callback/google`이 자동 처리하므로 Supabase 모드만 처리:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  // DB_PROVIDER=postgres 모드에서는 NextAuth가 /api/auth/callback/google을 처리
  // 이 라우트는 Supabase 모드 전용
  if (process.env.DB_PROVIDER === "postgres") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    return NextResponse.redirect(`${siteUrl}/`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "")}`
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(c) { cookiesToSet.push(...c) },
        },
      },
    )
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      const response = NextResponse.redirect(`${siteUrl}${next}`)
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options)
      }
      return response
    }
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
    )
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`)
}
```

- [ ] **Step 2: middleware.ts 수정**

`middleware.ts` 전체 내용:

```typescript
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  if (process.env.DB_PROVIDER === "postgres") {
    // NextAuth.js는 자체 미들웨어(/api/auth/*)를 처리함
    // 추가 보호가 필요한 라우트는 여기서 auth() 호출 가능
    return NextResponse.next()
  }
  const { updateSession } = await import("@/lib/supabase/middleware")
  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add middleware.ts src/app/auth/callback/route.ts
git commit -m "feat: middleware + auth/callback dual-mode (Supabase / NextAuth)"
```

---

## Task 11: Storage 추상화

**Files:**
- Create: `src/lib/storage/index.ts`

기존 `src/lib/supabase/storage.ts` 의 3개 함수를 provider별로 분기하여 통합.

- [ ] **Step 1: storage/index.ts 작성**

`src/lib/storage/index.ts` 전체 내용:

```typescript
const BUCKET = "card-skins"

function supabaseBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  return `${url}/storage/v1/object/public/${BUCKET}`
}

export function getCardImageUrl(skinId: string, cardId: string): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/front/${cardId}.png`
  }
  return `${supabaseBase()}/${skinId}/front/${cardId}.png`
}

export function getCardBackUrl(skinId: string): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/back.png`
  }
  return `${supabaseBase()}/${skinId}/back.png`
}

export function getCardThumbnailUrl(
  skinId: string,
  cardId: string,
  width = 200,
  height = 320
): string {
  if (process.env.DB_PROVIDER === "postgres") {
    return `/images/skins/${skinId}/front/${cardId}.png`
  }
  return `${supabaseBase()}/${skinId}/front/${cardId}.png?width=${width}&height=${height}&resize=contain`
}
```

- [ ] **Step 2: 기존 storage.ts 사용처 검색**

```bash
grep -r "supabase/storage" src/ --include="*.ts" --include="*.tsx" -l
```

모든 파일에서 `@/lib/supabase/storage` import를 `@/lib/storage` 로 교체한다.

- [ ] **Step 3: import 교체**

```bash
grep -r "supabase/storage" src/ --include="*.ts" --include="*.tsx" -l
```

찾은 파일들을 `@/lib/supabase/storage` → `@/lib/storage` 로 교체.

- [ ] **Step 4: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/storage/index.ts
git commit -m "feat: Storage 추상화 — provider별 카드 이미지 URL 분기"
```

---

## Task 12: 스킨 이미지 다운로드 스크립트

**Files:**
- Create: `scripts/download-skin-images.ts`

Supabase Storage의 `card-skins` 버킷에서 모든 이미지를 `public/images/skins/` 로 다운로드하는 1회성 스크립트.

- [ ] **Step 1: download-skin-images.ts 작성**

`scripts/download-skin-images.ts` 전체 내용:

```typescript
import { createClient } from "@supabase/supabase-js"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"
import { cardSkins } from "../src/data/skins/index"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "card-skins"
const OUT_DIR = join(process.cwd(), "public", "images", "skins")

async function download() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  let total = 0

  for (const skin of cardSkins) {
    console.log(`\n[${skin.id}] 파일 목록 조회 중...`)

    // 루트 파일 (back.png 등)
    const { data: rootFiles } = await supabase.storage.from(BUCKET).list(skin.id)
    // front/ 디렉토리 파일
    const { data: frontFiles } = await supabase.storage.from(BUCKET).list(`${skin.id}/front`)

    const filesToDownload: string[] = []

    if (rootFiles) {
      for (const f of rootFiles) {
        if (f.name && !f.id?.includes("/")) {
          filesToDownload.push(`${skin.id}/${f.name}`)
        }
      }
    }
    if (frontFiles) {
      for (const f of frontFiles) {
        if (f.name) {
          filesToDownload.push(`${skin.id}/front/${f.name}`)
        }
      }
    }

    console.log(`  ${filesToDownload.length}개 파일 발견`)

    for (const filePath of filesToDownload) {
      const { data, error } = await supabase.storage.from(BUCKET).download(filePath)
      if (error || !data) {
        console.warn(`  SKIP: ${filePath} — ${error?.message}`)
        continue
      }

      const localPath = join(OUT_DIR, filePath)
      const dir = localPath.substring(0, localPath.lastIndexOf("/"))
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const buffer = Buffer.from(await data.arrayBuffer())
      writeFileSync(localPath, buffer)
      total++
      console.log(`  ✓ ${filePath}`)
    }
  }

  console.log(`\n완료: ${total}개 파일 다운로드 → public/images/skins/`)
}

download().catch(console.error)
```

- [ ] **Step 2: 스크립트 실행 (환경변수 설정 후)**

`.env.local` 에 Supabase 환경변수가 설정된 상태에서:

```bash
npx tsx scripts/download-skin-images.ts
```

Expected: `public/images/skins/{skinId}/front/*.png`, `public/images/skins/{skinId}/back.png` 생성

- [ ] **Step 3: 다운로드 결과 확인**

```bash
find public/images/skins -name "*.png" | wc -l
```

Expected: 카드 스킨 이미지 수 출력 (스킨 6종 × 카드 수)

- [ ] **Step 4: Git LFS 필요 여부 확인**

```bash
du -sh public/images/skins/
```

100MB 미만이면 일반 커밋. 초과 시 Git LFS 설정 후 커밋.

- [ ] **Step 5: 커밋**

```bash
git add scripts/download-skin-images.ts public/images/skins/
git commit -m "feat: 스킨 이미지 다운로드 스크립트 + 로컬 이미지 추가"
```

---

## Task 13: API 라우트 단순 쿼리 4개 교체

**Files:**
- Modify: `src/app/api/tarot/session/route.ts`
- Modify: `src/app/api/tarot/result/[id]/route.ts`
- Modify: `src/app/api/saju/session/route.ts`
- Modify: `src/app/api/saju/result/[id]/route.ts`

- [ ] **Step 1: tarot/session/route.ts 수정**

`src/app/api/tarot/session/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { TarotService } from "@/services/tarot/tarot-service"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"

const tarotService = new TarotService()
const VALID_TOPICS = ["love", "love-single", "love-couple", "finance", "career", "health", "general"]

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId, spreadType } = (await request.json()) as { topic: Topic; characterId?: string; spreadType?: string }
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const sessionData = tarotService.startSession(topic)
    const validSpreadTypes = ["one-card", "three-card", "five-card"]
    const resolvedSpreadType = spreadType && validSpreadTypes.includes(spreadType)
      ? spreadType
      : sessionData.spreadType

    const db = getDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: sessionData.serviceType,
      topic: sessionData.topic,
      spread_type: resolvedSpreadType,
      status: sessionData.status,
      character_id: validCharId,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
```

- [ ] **Step 2: tarot/result/[id]/route.ts 수정**

`src/app/api/tarot/result/[id]/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const reading = await db.findOne("readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
```

- [ ] **Step 3: saju/session/route.ts 수정**

`src/app/api/saju/session/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"
import { Topic } from "@/types/session"

const VALID_TOPICS: string[] = [
  "saju-general", "saju-love-single", "saju-love-couple",
  "saju-career", "saju-health", "saju-personality",
  "saju-compatibility", "saju-auspicious-date",
]

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId } = (await request.json()) as { topic: Topic; characterId?: string }
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 })
    }
    const validCharId = characterId && getCharacterById(characterId) ? characterId : null
    const user = await getCurrentUser()
    const db = getDb()
    const session = await db.insert("sessions", {
      user_id: user?.id ?? null,
      service_type: "saju",
      topic,
      spread_type: null,
      status: "in_progress",
      character_id: validCharId,
    })
    return NextResponse.json({ session })
  } catch (e) {
    console.error("사주 세션 생성 오류:", e)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
```

- [ ] **Step 4: saju/result/[id]/route.ts 수정**

`src/app/api/saju/result/[id]/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const reading = await db.findOne("saju_readings", { share_token: id })
    if (!reading) return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    return NextResponse.json({ reading })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 })
  }
}
```

- [ ] **Step 5: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/tarot/session/route.ts src/app/api/tarot/result/[id]/route.ts \
        src/app/api/saju/session/route.ts src/app/api/saju/result/[id]/route.ts
git commit -m "refactor: tarot/saju session+result API — getDb() 교체"
```

---

## Task 14: API 라우트 스트리밍 2개 교체

**Files:**
- Modify: `src/app/api/tarot/reading/route.ts`
- Modify: `src/app/api/saju/reading/route.ts`

스트림 내부에서 DB를 사용하는 fire-and-forget 패턴. `getDb()`는 스트림 시작 전에 미리 생성한다.

- [ ] **Step 1: tarot/reading/route.ts 수정**

`src/app/api/tarot/reading/route.ts` 에서 Supabase 관련 코드를 교체. 변경 부분만 표시:

```typescript
// 삭제할 코드 (53~61줄):
// let supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>> | null = null
// if (sessionId) {
//   try {
//     const { createClient } = await import("@/lib/supabase/server")
//     supabase = await createClient()
//   } catch (e) {
//     console.warn("Supabase 클라이언트 생성 실패 (리딩은 계속 진행):", e)
//   }
// }

// 교체할 코드:
const db = sessionId ? getDb() : null
```

```typescript
// 삭제할 코드 (81~95줄 if (supabase && sessionId) 블록):
// if (supabase && sessionId) {
//   Promise.all([
//     supabase.from("readings").insert({...}),
//     supabase.from("sessions").update({...}).eq("id", sessionId),
//     supabase.from("session_cards").insert([...]),
//   ]).catch(...)
// }

// 교체할 코드:
if (db && sessionId) {
  Promise.all([
    db.insert("readings", {
      session_id: sessionId,
      card_interpretation: result.cardInterpretations,
      overall_reading: result.overallReading,
      advice: result.advice,
    }),
    db.update("sessions", { id: sessionId }, {
      status: "completed",
      completed_at: new Date().toISOString(),
    }),
    db.insertMany("session_cards",
      cards.map((c: { cardId: string; position: number; isReversed: boolean }) => ({
        session_id: sessionId,
        card_id: c.cardId,
        position: c.position,
        is_reversed: c.isReversed,
      }))
    ),
  ]).catch((e) => console.error("타로 DB 저장 실패:", e))
}
```

파일 상단에 import 추가:
```typescript
import { getDb } from "@/lib/db"
```

- [ ] **Step 2: saju/reading/route.ts 수정**

`src/app/api/saju/reading/route.ts` 에서 Supabase 관련 코드를 교체. 변경 부분:

```typescript
// 삭제 (66~74줄 supabase 생성 블록):
// let supabase: ... | null = null
// if (sessionId) { ... }

// 교체:
const db = sessionId ? getDb() : null
```

```typescript
// 삭제 (96~122줄 if (supabase && sessionId) 블록):
// Promise.all([
//   supabase.from("saju_readings").insert({...}),
//   supabase.from("sessions").update({...}).eq("id", sessionId),
// ])

// 교체:
if (db && sessionId) {
  Promise.all([
    db.insert("saju_readings", {
      session_id: sessionId,
      birth_date: userInfo.birthDate,
      birth_hour: userInfo.birthHour,
      gender: userInfo.gender,
      birth_name: userInfo.name || null,
      pillars: sajuResult.pillars,
      day_master: sajuResult.dayMaster,
      day_master_element: sajuResult.dayMasterElement,
      is_strong: sajuResult.isStrong,
      elements: sajuResult.elements,
      ten_stars: sajuResult.tenStars,
      twelve_stages: sajuResult.twelveStages,
      interactions: sajuResult.interactions,
      yongsin: sajuResult.yongsin,
      major_fortunes: sajuResult.majorFortunes,
      yearly_fortune: sajuResult.yearlyFortune,
      overall_reading: result.overallReading,
      topic_reading: result.topicReading || "",
      advice: result.advice,
    }),
    db.update("sessions", { id: sessionId }, {
      status: "completed",
      completed_at: new Date().toISOString(),
    }),
  ]).catch((e) => console.error("사주 DB 저장 실패:", e))
}
```

파일 상단에 import 추가:
```typescript
import { getDb } from "@/lib/db"
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/tarot/reading/route.ts src/app/api/saju/reading/route.ts
git commit -m "refactor: tarot/saju reading API — getDb() 교체 (fire-and-forget)"
```

---

## Task 15: 나머지 API 라우트 4개 교체

**Files:**
- Modify: `src/app/api/shinjeom/session/route.ts`
- Modify: `src/app/api/shinjeom/message/route.ts`
- Modify: `src/app/api/profile/favorite-character/route.ts`
- Modify: `src/app/api/daily-card/route.ts`

- [ ] **Step 1: shinjeom/session/route.ts 수정**

`src/app/api/shinjeom/session/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { topic, characterId } = await request.json()
    if (!topic || !characterId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let session = null
    try {
      const user = await getCurrentUser()
      const db = getDb()
      session = await db.insert("sessions", {
        service_type: "shinjeom",
        topic,
        character_id: characterId,
        user_id: user?.id ?? null,
        status: "in_progress",
      })
    } catch (e) {
      console.warn("세션 생성 실패 (신점은 계속 진행):", e)
    }

    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: shinjeom/message/route.ts 수정**

`src/app/api/shinjeom/message/route.ts` 의 `saveToDb` 함수만 교체:

```typescript
// 기존 saveToDb 함수 전체를 아래로 교체
import { getDb } from "@/lib/db"

async function saveToDb(sessionId: string | null | undefined, params: {
  isFinalTurn: boolean
  result?: { overallReading: string; topicReading?: string; advice: string }
  currentMessage?: string
  fullResponse?: string
  messageIndex?: number
}) {
  if (!sessionId) return
  try {
    const db = getDb()
    if (params.isFinalTurn && params.result) {
      await Promise.all([
        db.insert("shinjeom_readings", {
          session_id: sessionId,
          overall_reading: params.result.overallReading,
          topic_reading: params.result.topicReading || "",
          advice: params.result.advice,
        }),
        db.update("sessions", { id: sessionId }, {
          status: "completed",
          completed_at: new Date().toISOString(),
        }),
      ])
    } else if (params.currentMessage && params.fullResponse && params.messageIndex !== undefined) {
      await db.insertMany("shinjeom_messages", [
        { session_id: sessionId, role: "user", content: params.currentMessage, message_index: params.messageIndex },
        { session_id: sessionId, role: "character", content: params.fullResponse, message_index: params.messageIndex + 1 },
      ])
    }
  } catch (e) { console.error("신점 DB 저장 실패:", e) }
}
```

파일 상단의 기존 `createClient` 관련 import도 제거.

- [ ] **Step 3: profile/favorite-character/route.ts 수정**

`src/app/api/profile/favorite-character/route.ts` 전체 내용:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getCharacterById } from "@/data/characters"

export async function POST(request: NextRequest) {
  try {
    const { characterId } = (await request.json()) as { characterId: string | null }
    if (characterId !== null && !getCharacterById(characterId)) {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 })
    }
    const user = await requireUser()
    const db = getDb()
    await db.update("profiles", { id: user.id }, { favorite_character_id: characterId })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 4: daily-card/route.ts 수정**

`src/app/api/daily-card/route.ts` 에서 Supabase 관련 코드 교체:

```typescript
// 파일 상단 import 교체:
// 삭제: import { createClient } from "@/lib/supabase/server"
// 추가:
import { getDb } from "@/lib/db"
```

```typescript
// 캐시 확인 부분 교체 (35~43줄):
// 삭제:
// const supabase = await createClient()
// const { data: cached } = await supabase.from("daily_cards").select("*").eq("date", date).eq("character_id", characterId).single()

// 교체:
const db = getDb()
const cached = await db.findOne<{
  card_id: string; is_reversed: boolean; interpretation: string; keywords: string[]
}>("daily_cards", { date, character_id: characterId })
```

```typescript
// upsert 부분 교체 (79~86줄):
// 삭제:
// await supabase.from("daily_cards").upsert({...}, { onConflict: "date,character_id" })

// 교체:
await db.upsert("daily_cards", {
  date,
  character_id: characterId,
  card_id: card.id,
  is_reversed: isReversed,
  interpretation,
  keywords,
}, "date,character_id")
```

- [ ] **Step 5: 타입 체크**

```bash
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/shinjeom/session/route.ts src/app/api/shinjeom/message/route.ts \
        src/app/api/profile/favorite-character/route.ts src/app/api/daily-card/route.ts
git commit -m "refactor: 나머지 API 라우트 4개 getDb() + requireUser() 교체"
```

---

## Task 16: 빌드 검증 + .env 설정 안내

**Files:**
- Modify: `.env.local` (로컬만, 커밋 안 함)

- [ ] **Step 1: Supabase 모드 빌드 확인**

`.env.local` 에 `DB_PROVIDER=supabase` (또는 미설정) 상태에서:

```bash
pnpm type-check && pnpm lint && pnpm build
```

Expected: 3가지 모두 성공

- [ ] **Step 2: PostgreSQL 모드 환경변수 준비**

`.env.local` 에 다음 추가 (온프레미스 DB 준비된 경우):

```env
DB_PROVIDER=postgres
POSTGRES_URL=postgresql://user:password@host:5432/arcana
NEXTAUTH_SECRET=<openssl rand -base64 32 결과>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<기존 Google Console 클라이언트 ID>
GOOGLE_CLIENT_SECRET=<기존 Google Console 클라이언트 시크릿>
```

- [ ] **Step 3: Drizzle 스키마를 온프레미스 DB에 적용**

```bash
npx drizzle-kit push
```

Expected: 전체 테이블 생성 완료 메시지

- [ ] **Step 4: Google Cloud Console 리디렉션 URI 추가**

Google Cloud Console → OAuth 2.0 클라이언트 → Authorized redirect URIs 에 추가:
```
http://localhost:3000/api/auth/callback/google
https://{NEXTAUTH_URL}/api/auth/callback/google
```

- [ ] **Step 5: PostgreSQL 모드 빌드 확인**

```bash
DB_PROVIDER=postgres pnpm build
```

Expected: 빌드 성공

- [ ] **Step 6: 최종 커밋**

```bash
git add drizzle.config.ts
git commit -m "feat: DB Provider 마이그레이션 완료 — Supabase / PostgreSQL dual-mode"
```

---

## Task 17: CLAUDE.md 최신화

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 환경변수 섹션 업데이트**

`CLAUDE.md` 의 `## 환경 변수` 섹션에 PostgreSQL 모드 환경변수 추가.

- [ ] **Step 2: 프로젝트 구조 섹션 업데이트**

신규 파일 `src/lib/db/`, `src/lib/auth/`, `src/lib/storage/` 경로를 프로젝트 구조 트리에 추가.

- [ ] **Step 3: 핵심 아키텍처 패턴 섹션 업데이트**

"DB Provider 추상화 패턴" 항목 추가: `getDb()` 팩토리, `DB_PROVIDER` 환경변수, 병행 운영 전환 방법 설명.

- [ ] **Step 4: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 최신화 — DB Provider 마이그레이션 아키텍처 반영"
```

---

## 자체 검토 결과

**스펙 커버리지 확인:**
- ✅ DB 추상화 레이어 (Task 2–6)
- ✅ Auth 추상화 (Task 7–10)
- ✅ Storage 마이그레이션 (Task 11–12)
- ✅ 미들웨어 dual-mode (Task 10)
- ✅ 로그인 페이지 dual-mode (Task 9)
- ✅ 전체 API 라우트 10개 교체 (Task 13–15)
- ✅ `DB_PROVIDER` 환경변수 단일 전환 (Task 16)
- ✅ profiles 자동 생성 (Task 8 — NextAuth signIn 콜백)
- ✅ drizzle-kit push (Task 16)
- ✅ CLAUDE.md 최신화 (Task 17)

**타입 일관성:**
- `DbClient` 인터페이스의 `insertMany` 가 Task 14, 15에서 올바르게 사용됨 ✅
- `requireUser()` 는 `Unauthorized` 에러를 throw하고, `profile/favorite-character` 라우트에서 catch 처리됨 ✅
- `findOne` 의 where 파라미터는 snake_case DB 컬럼명 사용 (API 라우트에서 `share_token`, `date`, `character_id` 등) ✅
