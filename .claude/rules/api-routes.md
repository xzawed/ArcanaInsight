---
paths:
  - "src/app/api/**"
---

# API 라우트 규칙

## 필수 보안 순서 (절대 변경 금지)

모든 POST 라우트는 반드시 이 순서를 따른다:

```
1. Rate Limit     — checkRateLimit(key, limit, windowMs)
2. Zod 검증       — Schema.safeParse(rawBody)
3. 인증            — getCurrentUser() 또는 requireUser()
4. 소유권 검증    — assertSessionOwnership(sessionId, userId)
5. 비즈니스 로직
```

## SSE 스트리밍 필수 요소 7개

SSE 라우트(`tarot/reading`, `saju/reading`, `shinjeom/message`)는 반드시 포함:

1. `import { SSE_HEADERS } from "@/lib/request-utils"` — Nginx 버퍼링 차단
2. `new Response(new ReadableStream({...}), { headers: SSE_HEADERS })`
3. `TextEncoder.encode(\`data: ${JSON.stringify(chunk)}\n\n\`)`
4. `done: true` 종료 신호
5. `AbortController` + `signal` 전달
6. try/catch 내 `controller.error(e)` 처리
7. `getAdminDb()` 사용 (RLS 우회 서비스 롤)

클라이언트는 `fetchSSEStream()` 훅으로 소비하며, 세션 페이지 하드 타임아웃은 **280,000ms(280초)** 이다.
서버 `AI_TIMEOUT_MS` 기본값 240s보다 **40초 길다** — 서버가 먼저 끊고 클라이언트가 그 결과를 받도록 한 의도적 차이다.

## 리딩 저장 패턴 (best-effort 분리 UPDATE)

`done` 이벤트로 결과를 먼저 전송(가용성)한 뒤 DB에 저장한다. 본 리딩과 부가 필드를 **분리**해 배포 순서 하자를 없앤다:

1. 본 리딩 insert: `saveTarotReading` / `saveSajuReading` / `saveShinjeomFinalReading`(`reading-saver.ts`, 3회 retry)
2. `persistDirectAnswer`(마이그 023 `direct_answer` 컬럼) — 본 insert와 **분리된 best-effort UPDATE**. 컬럼 미적용 환경에서도 조용히 실패해 본 저장을 깨지 않는다(배포 순서 무관). `freeQuestion`이 있는데 `directAnswer`가 비면 route가 관측 경고를 남긴다.
3. 저장 실패 시 `recordFailedReading`(dead-letter, 마이그 022)로 payload 영속화 → `POST /api/internal/reading-dlq/retry`가 재처리.

⚠️ `persistReadingSections`(마이그 024 섹션 컬럼)는 섹션 스키마 폐지(2026-07-07)로 제거됨. 상세: `docs/architecture/db-abstraction.md`.

## DB 접근

- `getAdminDb()` — INSERT/UPDATE/DELETE, RLS 우회 필요 시
- `getDb()` — SELECT 위주, 사용자 롤

## Zod 스키마 위치

`src/lib/validation/api-schemas.ts`에 **중앙 관리**. route 파일 인라인 금지.

## 테스트 위치

```
src/__tests__/api/{service-name}.test.ts  ← 반드시 여기에
```

`src/app/api/` 하위 `*.test.ts`는 vitest에서 수집되지 않음 (exclude 설정).

## 자주 발생하는 실수

- `getDb()` 대신 `getAdminDb()`를 써야 하는 상황을 혼동 → 403 또는 빈 결과
- `SSE_HEADERS` 미사용 → Railway/Nginx에서 버퍼링되어 스트리밍 무효
- Zod 스키마를 route 파일에 인라인으로 작성 → docs 정합성 검사 실패
