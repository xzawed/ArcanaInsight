# DB Provider 마이그레이션 설계

**날짜**: 2026-04-11
**목표**: Supabase 완전 제거 → 온프레미스 PostgreSQL 전환 (서비스 무중단 병행 운영)

---

## 배경

Supabase 비용 절감을 위해 온프레미스 PostgreSQL로 전환한다. 현재 서비스가 운영 중이므로 `DB_PROVIDER` 환경변수 하나로 Supabase ↔ PostgreSQL을 즉시 전환할 수 있어야 한다. 기존 Supabase 데이터 마이그레이션은 불필요 (온프레미스는 빈 DB로 시작).

---

## 현재 Supabase 의존성

| 역할 | 파일 | 사용처 |
|------|------|--------|
| **Auth** | `src/lib/supabase/server.ts`, `middleware.ts` | `supabase.auth.getUser()` — 전 API 라우트 10개 |
| **DB** | `src/lib/supabase/server.ts` | sessions, readings, profiles, daily_cards 등 9개 테이블 |
| **Storage** | `src/lib/supabase/storage.ts` | card-skins 버킷 (카드 스킨 이미지 URL) |

---

## 전환 목표

| 항목 | 현재 | 전환 후 |
|------|------|---------|
| DB | Supabase PostgreSQL | 온프레미스 PostgreSQL + Drizzle ORM |
| Auth | Supabase Auth (Google OAuth) | NextAuth.js v5 (Google Provider) |
| Storage | Supabase Storage 버킷 | `public/images/skins/` 정적 파일 |
| 전환 방식 | — | `DB_PROVIDER` 환경변수 1개 |
| 롤백 | — | 환경변수 되돌리기 즉시 복귀 |

---

## 아키텍처: Provider 추상화 레이어

### 파일 구조

```
src/lib/
├── db/
│   ├── index.ts                ← getDb() 팩토리 (DB_PROVIDER 분기)
│   ├── types.ts                ← DbClient 공통 인터페이스
│   ├── supabase-adapter.ts     ← 기존 Supabase 쿼리 래핑
│   ├── postgres-adapter.ts     ← Drizzle ORM 구현
│   └── schema/
│       └── index.ts            ← Drizzle 스키마 (migrations SQL 변환)
├── auth/
│   ├── index.ts                ← getCurrentUser() / requireUser() 공통 함수
│   ├── supabase-auth.ts        ← 기존 supabase.auth.getUser() 래핑
│   └── nextauth.ts             ← NextAuth.js v5 설정 + Google Provider
└── storage/
    └── index.ts                ← getCardImageUrl() provider별 URL 반환

scripts/
└── download-skin-images.ts     ← Supabase Storage → public/images/skins/ 1회성 다운로드

public/images/skins/            ← 다운로드된 스킨 이미지 (GitHub 커밋)
```

기존 `src/lib/supabase/` 폴더는 삭제하지 않고 유지 — Supabase 어댑터 내부에서만 참조.

---

## 섹션별 상세 설계

### 1. DB 추상화 레이어

#### 공통 인터페이스 (`src/lib/db/types.ts`)

API 라우트의 모든 DB 호출 패턴을 5가지 메서드로 추상화:

```typescript
interface DbClient {
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>
  findMany<T>(table: string, where?: Record<string, unknown>): Promise<T[]>
  insert<T>(table: string, data: Record<string, unknown>): Promise<T>
  update<T>(table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<T | null>
  upsert<T>(table: string, data: Record<string, unknown>, conflictOn: string): Promise<T>
}
```

#### 팩토리 (`src/lib/db/index.ts`)

```typescript
export function getDb(): DbClient {
  if (process.env.DB_PROVIDER === 'postgres') {
    return new PostgresAdapter()
  }
  return new SupabaseAdapter()
}
```

#### Drizzle 스키마 (`src/lib/db/schema/index.ts`)

기존 `supabase/migrations/` 9개 SQL 파일을 Drizzle TypeScript 스키마로 1:1 변환. 테이블 구조 완전 동일 유지. `auth.users` 참조는 온프레미스 `users` 테이블로 대체.

#### API 라우트 변경 범위 (10개 파일)

```typescript
// Before
const supabase = await createClient()
const { data, error } = await supabase.from('sessions').insert({...}).select().single()

// After
const db = getDb()
const session = await db.insert('sessions', {...})
```

`createClient()` → `getDb()` 교체 외 라우트 로직 변경 없음.

---

### 2. Auth 추상화 레이어

#### 공통 함수 (`src/lib/auth/index.ts`)

```typescript
// 선택적 인증 (비로그인 허용)
export async function getCurrentUser(): Promise<{ id: string; email: string } | null>

// 필수 인증 (미인증 시 throw → API에서 401 처리)
export async function requireUser(): Promise<{ id: string; email: string }>
```

#### Supabase Auth 어댑터 (`src/lib/auth/supabase-auth.ts`)

기존 `supabase.auth.getUser()` 호출을 래핑만 함. 동작 변경 없음.

#### NextAuth.js v5 어댑터 (`src/lib/auth/nextauth.ts`)

- Google Provider 사용 (기존 Google OAuth 클라이언트 키 재사용)
- 세션을 JWT 쿠키로 관리 (별도 세션 DB 테이블 불필요)
- `signIn` 콜백에서 `profiles` 테이블 자동 upsert (Supabase의 `handle_new_user()` 트리거 역할 대체)

```typescript
callbacks: {
  signIn: async ({ user }) => {
    const db = getDb()
    await db.upsert('profiles', {
      id: user.id, email: user.email, nickname: user.name
    }, 'id')
    return true
  },
  session: ({ session, token }) => ({
    ...session,
    user: { ...session.user, id: token.sub! }
  })
}
```

#### Google OAuth 설정 변경

Google Cloud Console에서 Authorized redirect URI 추가:
```
{NEXTAUTH_URL}/api/auth/callback/google
```
기존 Supabase redirect URI는 유지 (병행 운영 기간 중).

---

### 3. Storage 마이그레이션

#### 1회성 다운로드 스크립트 (`scripts/download-skin-images.ts`)

- `src/data/skins/index.ts`에서 스킨 ID 목록 가져옴
- Supabase Storage API로 `card-skins` 버킷 파일 목록 조회
- `fetch()` → `public/images/skins/{skinId}/front/{cardId}.png` 저장

실행 후 `public/images/skins/` 전체를 GitHub에 커밋.

> **주의**: 스킨 이미지 총 용량이 100MB 초과 시 Git LFS 도입 검토 필요.

#### URL 팩토리 (`src/lib/storage/index.ts`)

```typescript
export function getCardImageUrl(skinId: string, cardId: string): string {
  if (process.env.DB_PROVIDER === 'postgres') {
    return `/images/skins/${skinId}/front/${cardId}.png`
  }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/card-skins/${skinId}/front/${cardId}.png`
}
```

기존 `src/lib/supabase/storage.ts`의 `getCardImageUrl`, `getCardBackUrl`, `getCardThumbnailUrl` 3개 함수를 이 파일에서 provider별로 분기하여 통합.

---

### 4. 환경변수

#### Supabase 모드 (현재)

```env
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

#### PostgreSQL 모드 (전환 후)

```env
DB_PROVIDER=postgres
POSTGRES_URL=postgresql://user:password@host:5432/arcana
NEXTAUTH_SECRET=...        # openssl rand -base64 32
NEXTAUTH_URL=https://...   # 프로덕션 사이트 URL
GOOGLE_CLIENT_ID=...       # 기존 Google Console 앱 그대로 재사용
GOOGLE_CLIENT_SECRET=...   # 기존 값 그대로
```

---

### 5. 전환 로드맵

```
1단계: 로컬 개발 검증
  ├─ Drizzle 스키마 작성 + drizzle-kit push (온프레미스 DB)
  ├─ DB_PROVIDER=postgres 로컬 테스트
  └─ 전 기능 동작 확인

2단계: 스테이징 배포
  ├─ Railway 환경변수 DB_PROVIDER=postgres 로 변경
  └─ 배포 후 기능 검증

3단계: 완전 전환 (검증 완료 후)
  ├─ supabase-adapter.ts, supabase-auth.ts 삭제
  ├─ @supabase/* 패키지 제거 (pnpm remove)
  └─ 불필요 환경변수 정리
```

#### 롤백

Railway 환경변수에서 `DB_PROVIDER=supabase` 로 되돌리면 즉시 복귀. 재배포 불필요.

---

## 패키지 변경

### 추가

```
drizzle-orm
drizzle-kit          (devDependencies)
postgres             (postgres.js — Drizzle PostgreSQL 드라이버)
next-auth@beta       (Auth.js v5)
@auth/drizzle-adapter
```

### 제거 (3단계 완전 전환 후)

```
@supabase/supabase-js
@supabase/ssr
```

---

## 미들웨어 변경

현재 `src/middleware.ts`는 `updateSession()` (Supabase 세션 갱신)을 호출한다. PostgreSQL 모드에서는 NextAuth.js의 `auth()` 미들웨어로 대체한다.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  if (process.env.DB_PROVIDER === 'postgres') {
    return auth(request)  // NextAuth.js
  }
  return updateSession(request)  // Supabase
}
```

---

## 제약 및 고려사항

1. **RLS 미적용**: 온프레미스 PostgreSQL에서는 Supabase의 Row Level Security가 동작하지 않는다. 보안은 API 라우트 레벨의 `requireUser()` 검증으로 대체한다.
2. **NextAuth 세션 쿠키**: Supabase Auth 쿠키와 이름이 다르므로 전환 시 기존 로그인 세션이 만료된다 (재로그인 필요). 서비스 중단은 아님.
3. **Git LFS**: 스킨 이미지 용량 확인 후 필요 시 도입.
4. **DB 커넥션 풀**: Railway 환경에서 Drizzle + postgres.js 기본 설정으로 충분하나, 트래픽 증가 시 `max` 옵션 조정 필요.
5. **로그인 페이지**: 현재 `src/app/auth/` 커스텀 로그인 페이지가 존재한다. PostgreSQL 모드에서는 NextAuth.js가 `/api/auth/signin`을 자동 제공하므로, 기존 로그인 페이지를 NextAuth 라우트로 리디렉션하거나 커스텀 SignIn 페이지로 NextAuth를 연동해야 한다.
