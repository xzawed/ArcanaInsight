# DB Provider 추상화: Supabase ↔ 온프레미스 PostgreSQL 전환 지원

## Context

Supabase 요금 절감 및 장애 시 예비서버 운용을 위해, 환경변수(`DB_PROVIDER`)로 Supabase와 온프레미스 PostgreSQL을 전환할 수 있도록 한다. 현재 프로젝트는 Supabase에 강하게 결합되어 있으며(Auth, PostgREST 쿼리빌더, RLS, RPC), 이를 단계적으로 추상화한다.

**결정 사항:**
- 전환 방식: 환경변수 수동 전환
- Auth: Auth.js (NextAuth v5)
- DB 라이브러리: Drizzle ORM

---

## Phase 0: 설정 기반 구축

**목표:** Provider 선택 메커니즘과 의존성 설치

### 0-1. 의존성 설치
```bash
pnpm add drizzle-orm pg next-auth@beta @auth/drizzle-adapter
pnpm add -D drizzle-kit @types/pg
```

### 0-2. 환경변수 추가
- `.env.example`에 추가:
```env
# === DB Provider (supabase | postgres) ===
DB_PROVIDER=supabase

# === On-Premise PostgreSQL (DB_PROVIDER=postgres 일 때 필수) ===
DATABASE_URL=

# === Auth Provider (supabase | authjs) ===
AUTH_PROVIDER=supabase

# === Auth.js (AUTH_PROVIDER=authjs 일 때 필수) ===
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

### 0-3. Provider 설정 모듈 생성
- **새 파일:** `src/lib/config/providers.ts`
- `getDbProvider(): 'supabase' | 'postgres'` — `DB_PROVIDER` 환경변수 읽기
- `getAuthProvider(): 'supabase' | 'authjs'` — `AUTH_PROVIDER` 환경변수 읽기
- 필수 환경변수 미설정 시 에러 throw (예: `DB_PROVIDER=postgres`인데 `DATABASE_URL` 없으면)

---

## Phase 1: 데이터베이스 추상화 레이어 (Drizzle)

**목표:** Repository 인터페이스 도입 + Drizzle 기반 구현체 추가

### 1-1. Drizzle 스키마 정의
- **새 파일:** `src/lib/db/schema.ts`
- 기존 `supabase/migrations/001_initial_schema.sql` 기반으로 10개 테이블 Drizzle 스키마 정의
- 테이블: `users`, `projects`, `project_apis`, `generated_codes`, `api_catalog`, `organizations`, `memberships`, `user_daily_limits`, `platform_events`, `user_api_keys`(+ `feature_flags` 있으면 포함)

### 1-2. DB 연결 매니저
- **새 파일:** `src/lib/db/connection.ts`
- `DB_PROVIDER=postgres`일 때: `pg.Pool` 생성 → `drizzle(pool)` 래핑
- 싱글턴 `getDb()` export
- 기존 `src/lib/supabase/server.ts`는 수정하지 않음 (Supabase 모드에서 그대로 사용)

### 1-3. Repository 인터페이스 정의
- **새 파일:** `src/repositories/interfaces/IBaseRepository.ts`
```typescript
export interface IBaseRepository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: Record<string, unknown>, options?: QueryOptions): Promise<{ items: T[]; total: number }>;
  create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, input: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: Record<string, unknown>): Promise<number>;
}
```
- **추가 인터페이스 파일들:** `IProjectRepository.ts`, `IUserRepository.ts`, `ICodeRepository.ts`, `ICatalogRepository.ts`, `IOrganizationRepository.ts`, `IEventRepository.ts`, `IRateLimitRepository.ts`
- 각 인터페이스에 커스텀 메서드 포함 (예: `IProjectRepository.findByUserId()`, `ICatalogRepository.search()`)

### 1-4. 기존 Supabase Repository에 인터페이스 적용
- `BaseRepository` 및 6개 구체 Repository가 해당 인터페이스를 `implements` 하도록 수정
- **수정 파일:** `src/repositories/base/BaseRepository.ts`, `src/repositories/projectRepository.ts` 등
- 기존 로직 변경 없이 `implements IProjectRepository` 등만 추가

### 1-5. Drizzle Repository 구현체 생성
- **새 디렉토리:** `src/repositories/drizzle/`
- `DrizzleBaseRepository.ts` — Drizzle `db` 인스턴스 사용, `eq()`, `and()`, `desc()` 등 Drizzle 쿼리빌더로 CRUD 구현
- `DrizzleProjectRepository.ts`, `DrizzleUserRepository.ts`, `DrizzleCodeRepository.ts`, `DrizzleCatalogRepository.ts`, `DrizzleOrganizationRepository.ts`, `DrizzleEventRepository.ts`
- `DrizzleRateLimitRepository.ts` — RPC 함수를 `db.execute(sql`...`)` 로 호출

### 1-6. Repository 팩토리
- **새 파일:** `src/repositories/factory.ts`
```typescript
export async function createProjectRepository(supabase?: SupabaseClient): Promise<IProjectRepository> {
  if (getDbProvider() === 'postgres') {
    return new DrizzleProjectRepository(getDb());
  }
  return new ProjectRepository(supabase!);
}
// ... 각 Repository별 팩토리 함수
```

### 1-7. 직접 Supabase 호출 정리
- `src/app/api/v1/user-api-keys/route.ts` — `UserApiKeyRepository` 인터페이스 + 두 구현체 생성
- `src/app/api/v1/health/route.ts` — Provider별 분기 추가
- `src/app/api/v1/popular-services/route.ts` — Repository로 추출
- `src/lib/config/featureFlags.ts` — Provider별 분기 추가

---

## Phase 2: Auth 추상화 레이어 (Auth.js)

**목표:** 인증을 Provider 독립적으로 추상화

### 2-1. Auth 인터페이스 정의
- **새 파일:** `src/lib/auth/types.ts`
```typescript
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}
```

### 2-2. Supabase Auth 어댑터
- **새 파일:** `src/lib/auth/supabase-auth.ts`
- 기존 `supabase.auth.getUser()` 로직을 `AuthUser` 형태로 래핑

### 2-3. Auth.js 설정
- **새 파일:** `src/lib/auth/authjs-config.ts`
- Google + GitHub OAuth 프로바이더 설정
- Drizzle adapter로 세션을 같은 PostgreSQL에 저장
- 콜백에서 `users` 테이블에 레코드 생성 (기존 `callback/route.ts` 로직 이식)

### 2-4. Auth.js 어댑터
- **새 파일:** `src/lib/auth/authjs-auth.ts`
- Auth.js `auth()` 함수로 서버사이드 세션 조회 → `AuthUser` 반환

### 2-5. 통합 Auth 팩토리
- **새 파일:** `src/lib/auth/index.ts`
```typescript
export async function getAuthUser(): Promise<AuthUser | null> {
  if (getAuthProvider() === 'authjs') {
    return getAuthJsUser();
  }
  return getSupabaseAuthUser();
}
```

### 2-6. 미들웨어 수정
- **수정 파일:** `src/middleware.ts`
- `AUTH_PROVIDER` 에 따라 Supabase 세션 갱신 또는 Auth.js 미들웨어 분기

### 2-7. 클라이언트 Auth Hook 수정
- **수정 파일:** `src/hooks/useAuth.ts`
- Supabase 모드: 기존 `onAuthStateChange` 로직
- Auth.js 모드: `next-auth/react`의 `useSession()` 사용
- 동일한 `useAuth()` 반환 형태 유지

### 2-8. 로그인 페이지 수정
- **수정 파일:** `src/app/(auth)/login/page.tsx`
- Auth.js 모드: `signIn('google')` / `signIn('github')` 사용
- Supabase 모드: 기존 `signInWithOAuth` 유지

---

## Phase 3: Service 레이어 리팩토링

**목표:** Service가 인터페이스에 의존하도록 전환

### 3-1. Service 생성자 변경
- 기존: `constructor(supabase: SupabaseClient)` → 내부에서 Repository 직접 생성
- 변경: Repository 인터페이스를 인자로 받음
```typescript
export class ProjectService {
  constructor(
    private projectRepo: IProjectRepository,
    private catalogRepo: ICatalogRepository,
  ) {}
}
```
- **수정 파일:** `projectService.ts`, `catalogService.ts`, `authService.ts`, `generationService.ts`, `deployService.ts`, `rateLimitService.ts`

### 3-2. Service 팩토리
- **새 파일:** `src/services/factory.ts`
- Provider에 따라 올바른 Repository 구현체를 Service에 주입

### 3-3. API Route 수정
- 모든 API Route에서:
  - `const supabase = await createClient()` + `new Service(supabase)` → `await createService()` (팩토리 사용)
  - `supabase.auth.getUser()` → `await getAuthUser()`
- **수정 파일:** `src/app/api/v1/` 하위 10+ 라우트 파일

---

## Phase 4: RLS 대체 (애플리케이션 레이어 인가)

**목표:** 온프레미스 모드에서 RLS 없이도 동등한 보안 보장

### 4-1. 인가 유틸리티
- **새 파일:** `src/lib/auth/authorize.ts`
- `assertOwner(resource, userId)` — 소유권 검증 실패 시 `ForbiddenError` throw

### 4-2. Drizzle Repository에 userId 필터 내장
- 사용자 범위 테이블(`projects`, `generated_codes`, `user_api_keys`)의 Drizzle Repository에서 항상 `userId` WHERE 조건 포함
- Supabase 모드에서는 RLS가 이를 처리하므로 변경 없음

### 4-3. RPC 함수 온프레미스 배포
- 기존 `supabase/migrations/007_atomic_rate_limit.sql`의 함수들은 순수 PostgreSQL
- 온프레미스 DB에도 동일 마이그레이션 적용 (Drizzle Kit 또는 수동)
- `auth.uid()` 참조하는 RLS 정책만 제외하고 테이블/함수/인덱스는 그대로 재사용

---

## Phase 5: 마이그레이션 도구

**목표:** 온프레미스 DB 스키마 관리

### 5-1. Drizzle Kit 설정
- **새 파일:** `drizzle.config.ts`
- `DATABASE_URL` 기반 연결, `src/lib/db/schema.ts` 참조
- `drizzle-kit push` 또는 `drizzle-kit migrate`로 스키마 동기화

### 5-2. 온프레미스 초기화 스크립트
- 기존 Supabase 마이그레이션에서 RLS 정책 / Supabase 전용 구문 제거한 버전 생성
- 또는 Drizzle Kit의 `push` 명령으로 스키마 자동 생성

---

## Phase 6: 검증

### 6-1. 단위 테스트
- Repository 인터페이스 mock으로 Service 테스트
- Drizzle Repository 테스트 (로컬 PostgreSQL Docker)

### 6-2. 통합 테스트
- `DB_PROVIDER=postgres` + `AUTH_PROVIDER=authjs`로 로컬 실행
- 핵심 플로우 확인: 로그인 → 프로젝트 생성 → 코드 생성 → 미리보기 → 배포

### 6-3. Supabase 모드 회귀 테스트
- `DB_PROVIDER=supabase`(기본값)에서 기존 기능 모두 정상 동작 확인
- 기존 테스트 스위트 전체 통과 확인

---

## 수정 대상 핵심 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `.env.example` | 새 환경변수 추가 |
| `src/lib/config/providers.ts` | 새 파일 — Provider 설정 |
| `src/lib/db/schema.ts` | 새 파일 — Drizzle 스키마 |
| `src/lib/db/connection.ts` | 새 파일 — DB 연결 매니저 |
| `src/repositories/interfaces/*.ts` | 새 파일 — Repository 인터페이스 |
| `src/repositories/drizzle/*.ts` | 새 파일 — Drizzle 구현체 |
| `src/repositories/factory.ts` | 새 파일 — Repository 팩토리 |
| `src/repositories/base/BaseRepository.ts` | 인터페이스 implements 추가 |
| `src/repositories/*.ts` | 인터페이스 implements 추가 |
| `src/lib/auth/types.ts` | 새 파일 — Auth 인터페이스 |
| `src/lib/auth/supabase-auth.ts` | 새 파일 — Supabase Auth 어댑터 |
| `src/lib/auth/authjs-config.ts` | 새 파일 — Auth.js 설정 |
| `src/lib/auth/authjs-auth.ts` | 새 파일 — Auth.js 어댑터 |
| `src/lib/auth/index.ts` | 새 파일 — Auth 팩토리 |
| `src/services/*.ts` | 생성자 DI 패턴으로 변경 |
| `src/services/factory.ts` | 새 파일 — Service 팩토리 |
| `src/app/api/v1/**/*.ts` | Auth + Service 팩토리 사용으로 변경 |
| `src/middleware.ts` | Auth Provider 분기 추가 |
| `src/hooks/useAuth.ts` | Auth Provider 분기 추가 |
| `src/app/(auth)/login/page.tsx` | Auth Provider 분기 추가 |
| `drizzle.config.ts` | 새 파일 — Drizzle Kit 설정 |

---

## 구현 순서 및 의존관계

```
Phase 0 (설정) ──────────────────────┐
                                     ├─→ Phase 3 (Service 리팩토링)
Phase 1 (DB 추상화) ─────────────────┤      ↓
                                     ├─→ Phase 4 (RLS 대체)
Phase 2 (Auth 추상화) ───────────────┘      ↓
                                      Phase 5 (마이그레이션 도구)
                                            ↓
                                      Phase 6 (검증)
```

- Phase 0은 선행 필수
- Phase 1, 2는 **병렬 진행 가능**
- Phase 3은 Phase 1 + 2 완료 후
- Phase 4, 5는 Phase 1 완료 후
- Phase 6은 전체 완료 후
