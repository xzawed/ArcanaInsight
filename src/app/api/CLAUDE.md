# src/app/api/ 가이드

Next.js App Router API 라우트. 모든 라우트는 동일한 보안·검증 패턴을 따른다.

## 디렉토리 구조

```
api/
├── tarot/
│   ├── session/route.ts    # 세션 생성 (POST)
│   ├── reading/route.ts    # SSE 스트리밍 리딩 (POST)
│   └── result/[id]/route.ts
├── saju/
│   ├── session/route.ts
│   ├── reading/route.ts
│   └── result/[id]/route.ts
├── shinjeom/
│   ├── session/route.ts
│   ├── message/route.ts    # SSE 스트리밍 메시지 (POST)
│   └── result/[id]/route.ts
├── auth/
│   └── [...nextauth]/      # NextAuth.js (DB_PROVIDER=postgres 모드)
├── daily-card/route.ts
├── daily-fortune/route.ts
├── health/route.ts         # 헬스체크 (GET, 배포 모니터링용)
├── locale/route.ts
├── sessions/
│   └── claim/route.ts    # 익명 세션 user_id 귀속 (POST, 로그인 필수)
├── internal/
│   └── reading-dlq/retry/route.ts  # dead-letter 재처리 (POST, secret 가드, 마이그 022)
└── profile/
    └── favorite-character/route.ts
```

## 필수 보안 패턴 (순서 엄수)

모든 POST 라우트는 아래 순서를 지킨다. 5단계 순서·근거는 [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md) 참조.

```ts
export async function POST(request: NextRequest) {
  try {
    const locale = await getRequestLocale();

    // 1. Rate Limit
    const ip = getClientIp(request.headers);
    if (!(await checkRateLimit(`<key>:${ip}`, limit, windowMs))) return rateLimitResponse(locale);

    // 2. Zod 입력 검증
    const parsed = SomeSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid request");

    // 3. 인증 (필요한 경우)
    const user = await getCurrentUser();  // 비로그인 허용 시
    // 또는
    const user = await requireUser();     // 로그인 필수 시

    // 4. 소유권 검증 (세션/결과 조회 시)
    await assertSessionOwnership(sessionId, user?.id ?? null);

    // 5. 비즈니스 로직
    const db = getAdminDb();
    ...
  } catch (e) {
    // outer catch — checkRateLimit 예외 등 예상치 못한 오류
    return jsonError("Internal server error", 500);
  }
}
```

## SSE 스트리밍 패턴

`tarot/reading`, `saju/reading`, `shinjeom/message`은 SSE로 응답한다. 필수 요소 7개는 [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md) 참조.

```ts
import { SSE_HEADERS } from "@/lib/request-utils";

return new Response(
  new ReadableStream({
    async start(controller) {
      // provider.generateReadingStream() 사용
      // done: true 청크로 스트림 종료 신호
    }
  }),
  { headers: SSE_HEADERS }
);
```

클라이언트는 `fetchSSEStream()` 훅으로 소비한다. 세션 페이지 하드 타임아웃: **240,000ms (240초)**.

## 리딩 저장 패턴

best-effort 분리 UPDATE 절차(본 리딩 insert → `persistDirectAnswer` 별도 UPDATE → 실패 시 dead-letter)는 [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md) 참조.

## 테스트 위치

API 라우트 테스트 배치 규칙은 [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md) 참조.

```ts
// ✅ 올바른 위치
src/__tests__/api/tarot-reading.test.ts

// ✅ 올바른 import
import { POST } from "@/app/api/tarot/reading/route";
```

테스트 setup 패턴:
- `setupDoMock()` — `beforeEach(vi.resetModules)` 자동 등록
- `setup()` 내부에 rate-limit 통과 mock 반드시 포함 (누출 방지)
- SSE 테스트는 `timeout: 15000` 명시

## Zod 스키마 위치

`src/lib/validation/api-schemas.ts`에 중앙 관리(규칙: [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md)). 새 API 추가 시 이 파일에 스키마를 추가한다.

## DB 접근

`getAdminDb()`/`getDb()` 사용 기준은 [`.claude/rules/api-routes.md`](../../../.claude/rules/api-routes.md) 참조. RLS 우회가 필요한 서버 작업은 항상 `getAdminDb()` 사용.

## 환경변수 분기

`DB_PROVIDER=supabase`(기본) vs `DB_PROVIDER=postgres`:
- Auth: Supabase Auth vs NextAuth.js v5
- DB: Supabase vs Drizzle + PostgreSQL
- `getCurrentUser()` / `requireUser()` / `getAdminDb()`는 분기를 내부에서 처리하므로 호출 측에서 신경 쓰지 않아도 된다.
