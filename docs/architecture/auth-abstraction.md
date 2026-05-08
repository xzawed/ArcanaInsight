# Auth 추상화 레이어

`DB_PROVIDER`에 따라 Supabase Auth ↔ NextAuth.js v5를 자동으로 선택합니다.

---

## 1. 공통 Auth 함수 (`src/lib/auth/index.ts`)

| 함수 | 설명 |
|------|------|
| `getCurrentUser()` | 현재 로그인 사용자 반환. 비로그인 시 `null` |
| `requireUser()` | 로그인 필수. 비로그인 시 `Error("Unauthorized")` throw |
| `assertSessionOwnership(sessionId)` | 세션 소유자 확인. 불일치 시 403, 세션 없으면 404 |
| `assertReadingAccess(sessionId, mode)` | `"public"` = 항상 허용, `"owner"` = 소유자만 허용 |

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

## 3. API 보안 패턴 (6개 라우트 공통)

모든 세션 생성 API + AI 리딩 API 라우트에 동일하게 적용:

**세션 생성 라우트** (`/api/tarot/session`, `/api/saju/session`, `/api/shinjeom/session`):
```
요청 수신
  │
  ├─ 1. Rate Limiting — checkRateLimit() (src/lib/rate-limit.ts)
  │      세션 API: 20 req/min / 초과 시 429
  │      ※ locale 선언을 rate limit 호출 전 최상단에 배치 (locale 없는 429 응답 방지)
  │
  ├─ 2. 입력 검증 — Zod safeParse()
  │      실패 시 400
  │
  ├─ 3. 인증 — requireUser()
  │      비로그인 시 401
  │
  └─ 4. DB INSERT → 세션 ID 반환
```

**AI 리딩/대화 라우트** (`/api/tarot/reading`, `/api/saju/reading`, `/api/shinjeom/message`):
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
         SSE_HEADERS / jsonError() (src/lib/request-utils.ts)
```

---

## 4. 공유 결과 열람

`share_token`을 가진 누구나 결과 열람 가능 (`assertReadingAccess("public")`):

```ts
// 공유 결과 조회 라우트 패턴
const err = await assertReadingAccess(sessionId, "public");  // 항상 통과 (null 반환)
if (err) return err;
const result = await getDb().findOne("readings", { share_token });
// whitelist 직렬화 — 새 컬럼이 추가돼도 명시하지 않으면 응답에서 자동 제외
return Response.json(pickFields(result, READING_PUBLIC_FIELDS));
```

소유자 전용 쓰기·삭제:
```ts
const err = await assertReadingAccess(sessionId, "owner");   // 소유자만 통과 (통과 시 null, 실패 시 Response 반환)
if (err) return err;
```

**응답 whitelist 패턴** (`src/lib/request-utils.ts`):
- blacklist 방식(`delete result.user_id`)은 새 민감 컬럼 추가 시 누출 위험
- `pickFields(obj, allowedKeys)` — 허용 필드만 추출해 IDOR/PII 회귀 방지

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

## i18n locale 필드

`AuthUser` 타입은 `{ id, email }`만 포함한다. locale은 인증 객체에 싣지 않고 쿠키(`ai_locale`)를 요청 기준 SSOT로 사용하며, 인증 사용자의 `profiles.locale`은 `/api/locale` POST로 보조 동기화한다. 상세: [`i18n.md`](i18n.md)
