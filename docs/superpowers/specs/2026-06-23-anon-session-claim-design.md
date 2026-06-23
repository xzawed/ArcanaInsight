# 익명 세션 로그인 시 자동 claim — 설계

> 신고 버그: "로그인한 계정의 과거 타로 리딩 이력이 mypage에 미노출".
> 진단(프로덕션 데이터 forensic): 리딩이 자주 익명(`user_id=NULL`)으로 저장되는데(전체 세션의 47%, 최근 활동은 대부분 익명), 로그인 후 이를 계정에 연결하는 claim 메커니즘이 전혀 없어(grep 0건) `.eq("user_id", uuid)` 필터에서 영구 누락. 데이터·RLS·쿼리 자체는 정상(완료 리딩 64건 전부 저장·가시 확인).

## 목표

게스트/만료 세션 상태에서 만든 익명 리딩 세션을, 사용자가 로그인하면 자동으로 그 계정에 연결해 mypage 이력에 노출한다. 기존 게스트 리딩 UX는 그대로 유지한다.

## 비목표 (이번 범위 외)

- parseError 시 리딩 영속화(B) — 데이터상 부차적, 별도 처리.
- 로그인 게이트(리딩 전 로그인 강제) — 게스트 UX 보존 위해 채택 안 함.
- fire-and-forget 저장 관측성(C).

## 아키텍처

```
[세션 생성(tarot/saju/shinjeom session/page.tsx)]
   └─ rememberGuestSession(id)  → localStorage "arcana_guest_sessions" (최근 30개 cap)

[로그인 발생] onAuthStateChange(SIGNED_IN | INITIAL_SESSION)
   └─ SessionClaimer(client, 루트 레이아웃) → pending id 존재 시
        POST /api/sessions/claim { sessionIds }
           └─ RateLimit → Zod → requireUser → getAdminDb().claimSessions(ids, userId)
                 UPDATE sessions SET user_id=<me> WHERE id IN(ids) AND user_id IS NULL
           ← { claimed: n }
        → 성공 id를 localStorage에서 제거

[다음 mypage 로드] findMany("sessions",{user_id}) → claim된 세션 노출
```

## 컴포넌트별 책임

### 1. `src/lib/guest-sessions.ts` (신규, 클라이언트 유틸)
- `rememberGuestSession(id: string): void` — localStorage 배열에 prepend, dedup, 최근 30개 cap. try/catch graceful(차단 환경 무동작).
- `getGuestSessions(): string[]` — 저장된 id 배열.
- `clearGuestSessions(ids: string[]): void` — 지정 id 제거(claim 성공분).
- 항상 저장(인증 여부 무관) — claim의 `WHERE user_id IS NULL` 가드가 멱등 보장(이미 소유/타인 소유 세션은 no-op).

### 2. `src/components/common/SessionClaimer.tsx` (신규, client)
- `useEffect`에서 `createClient().auth.onAuthStateChange` 구독.
- 인증된 상태(`session` 존재) + `getGuestSessions().length > 0` 일 때 1회 claim 호출(in-flight ref로 중복 방지).
- `POST /api/sessions/claim` 성공 → `clearGuestSessions(claimedIds)`.
- 실패 → localStorage 유지(다음 로그인에 재시도). 조용히 실패(콘솔 warn).
- 루트 레이아웃(`src/app/layout.tsx`)의 Provider 내부에 마운트 → 어떤 경로에서 로그인해도 동작.

### 3. `POST /api/sessions/claim` (`src/app/api/sessions/claim/route.ts`, 신규)
- 보안 순서: `checkRateLimit("claim:"+ip, 20, 60_000)` → `ClaimSessionsSchema.safeParse` → `requireUser()`(401 throw) → `getAdminDb().claimSessions(parsed.sessionIds, user.id)`.
- 응답: `{ claimed: number }`.
- requireUser 실패(미인증) → 401. (claim은 로그인 필수)

### 4. `ClaimSessionsSchema` (`src/lib/validation/api-schemas.ts`)
- `z.object({ sessionIds: z.array(z.string().uuid()).min(1).max(100) })`.

### 5. `DbClient.claimSessions` (`src/lib/db/types.ts` + 양쪽 어댑터)
- 인터페이스: `claimSessions(sessionIds: string[], userId: string): Promise<number>` (claim된 행 수).
- Supabase(`supabase-adapter.ts`): `.from("sessions").update({user_id:userId}).in("id",sessionIds).is("user_id",null).select("id")` → 길이 반환. (기존 `.eq` 루프는 `IS NULL`을 못 다뤄 전용 메서드 필요)
- Postgres(`postgres-adapter.ts`): Drizzle `.update(sessions).set({userId}).where(and(inArray(sessions.id, sessionIds), isNull(sessions.userId))).returning({id})` → 길이.
- `getAdminDb()`(supabase 모드 = service role)로 호출 → RLS 우회, `IS NULL` 가드가 소유권 보호.

### 6. quick-win #5 — result rate-limit 키 분리
- `tarot/saju/shinjeom result/[id]/route.ts`의 `result:${ip}` → `tarot-result:`/`saju-result:`/`shinjeom-result:` 로 서비스별 분리.

## 데이터 흐름 / 멱등성

- 항상-저장 + claim의 `IS NULL` 가드 = 멱등. 이미 소유·타인 소유 세션은 UPDATE 미적용(0건).
- SessionClaimer는 pending id가 있을 때만 호출 → 반복 SIGNED_IN/refresh에도 안전.

## 에러 처리

- claim API 실패/네트워크 오류 → localStorage 유지, 다음 로그인 재시도. 사용자 흐름 비차단.
- 빈 sessionIds → 클라이언트가 호출 안 함.
- localStorage 차단 환경 → 유틸이 graceful no-op(claim 미동작, 기존 동작 유지).

## 보안

- claim은 호출자가 UUID를 아는 익명 세션만 자기 것으로 귀속. `WHERE user_id IS NULL` 가드로 타 사용자 소유 세션 탈취 불가. session_id는 UUID v4(추측 불가). 익명 세션엔 신원 결부 PII 없음 → 영향 낮음.
- 보안 패턴(RateLimit→Zod→Auth) 준수. requireUser로 미인증 차단.

## 테스트

- `src/__tests__/api/sessions-claim.test.ts`: rate-limit 차단, Zod 거부(빈/비UUID/초과), requireUser 401, 정상 claim count, 멱등(이미 소유 0건).
- 어댑터 `claimSessions` 단위 테스트(supabase mock — `.in`/`.is` 호출 검증).
- `src/__tests__/lib/guest-sessions.test.ts`: 저장/조회/제거/cap/dedup/차단환경.
- E2E: 실 Supabase 인증 세션 필요(claim은 로그인 전제) → 이번 자동화 보류, smart-ci 영역. 메모만.

## DB_PROVIDER 분기

- supabase 모드: getAdminDb()=service role. claimSessions가 RLS 우회.
- postgres 모드: getAdminDb()=PostgresAdapter(RLS 없음), Drizzle로 동일 의미 구현. requireUser=NextAuth.

## 영향 파일 요약

신규: `src/lib/guest-sessions.ts`, `src/components/common/SessionClaimer.tsx`, `src/app/api/sessions/claim/route.ts`, 테스트 3종.
수정: `src/lib/db/types.ts`, `src/lib/db/supabase-adapter.ts`, `src/lib/db/postgres-adapter.ts`, `src/lib/validation/api-schemas.ts`, `src/app/layout.tsx`(SessionClaimer 마운트), `src/app/(immersive)/{tarot,saju,shinjeom}/session/page.tsx`(rememberGuestSession 호출), `src/app/api/{tarot,saju,shinjeom}/result/[id]/route.ts`(rate-limit 키). sonar exclusions(신규 TS 파일) 동기화.
