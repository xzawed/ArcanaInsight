# Auth 추상화 레이어

`DB_PROVIDER`에 따라 Supabase Auth ↔ NextAuth.js v5를 자동으로 선택합니다.

---

## 1. 공통 Auth 함수 (`src/lib/auth/index.ts`)

| 함수 | 설명 |
|------|------|
| `getCurrentUser()` | 현재 로그인 사용자 반환. 비로그인 시 `null` |
| `requireUser()` | 로그인 필수. 비로그인 시 401 반환 |
| `assertSessionOwnership(sessionId, userId)` | 세션 소유자 확인. 불일치 시 403 |
| `assertReadingAccess(mode)` | `"public"` = 항상 허용, `"owner"` = 소유자만 허용 |

---

## 2. DB_PROVIDER별 구현

| 함수 | `supabase` 모드 | `postgres` 모드 |
|------|----------------|-----------------|
| `getCurrentUser()` | `supabase.auth.getUser()` | NextAuth.js v5 `auth()` |
| `requireUser()` | Supabase Auth Helpers | NextAuth.js session |

구현 파일:
- `src/lib/auth/supabase-auth.ts` — Supabase 래핑
- `src/lib/auth/nextauth.ts` — NextAuth.js v5 Google Provider 설정

---

## 3. API 보안 패턴 (3개 AI API 라우트 공통)

모든 AI API 라우트(`/api/tarot/reading`, `/api/saju/reading`, `/api/shinjeom/message`)에 동일하게 적용:

```
요청 수신
  │
  ├─ 1. Rate Limiting — checkRateLimit() (src/lib/rate-limit.ts)
  │      타로/사주: 10 req/min / 신점: 20 req/min / 초과 시 429
  │
  ├─ 2. 입력 검증 — Zod safeParse() (src/lib/validation/api-schemas.ts)
  │      실패 시 400
  │
  ├─ 3. 인증 — requireUser() / getCurrentUser()
  │      비로그인 시 401
  │
  ├─ 4. IDOR 방어 — assertSessionOwnership()
  │      세션 소유자 불일치 시 403
  │
  └─ 5. AI 처리 → SSE 스트리밍 응답
```

---

## 4. 공유 결과 열람

`share_token`을 가진 누구나 결과 열람 가능 (`assertReadingAccess("public")`):

```ts
// 공유 결과 조회 라우트 패턴
await assertReadingAccess("public");  // 항상 통과
const result = await getDb().findOne("readings", { share_token });
```

소유자 전용 쓰기·삭제:
```ts
await assertReadingAccess("owner");   // 소유자만 통과
```

---

## 5. NextAuth.js 설정 (PostgreSQL 모드)

`src/lib/auth/nextauth.ts` — Google Provider 설정

```
NEXTAUTH_SECRET=    # openssl rand -base64 32
NEXTAUTH_URL=       # 프로덕션 URL
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Google Cloud Console에서 Authorized redirect URI에 `{NEXTAUTH_URL}/api/auth/callback/google` 추가 필요.

API 라우트: `src/app/api/auth/[...nextauth]/` — PostgreSQL 모드 전용
