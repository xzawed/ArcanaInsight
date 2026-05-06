# share_token 스트리밍 통합 + 저장 실패 통지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 9 에이전트 × 3 라운드 교차 검증(2026-05-06)에서 D2 (P1) 로 식별된 두 결함을 해소한다 — (1) reading SSE 응답이 share_token 을 포함하지 않아 클라이언트가 즉시 공유 링크를 알 수 없는 문제, (2) fire-and-forget DB 저장 실패 시 클라이언트가 인지하지 못해 "결과 공유하기" 클릭 시점에 비로소 실패가 드러나는 문제.

**Architecture:** SSE 메시지 프로토콜에 `share_token` 필드를 도입하고, 저장 결과(성공/실패)를 두 번째 SSE 이벤트로 클라이언트에 통지한다. 서버는 reading row 를 INSERT 한 후 그 결과(share_token)를 별도 이벤트로 푸시한다. 클라이언트(Zustand)는 share_token 을 보관해 공유 버튼이 즉시 활성화되도록 한다. 저장 실패 시 UI 에 "결과는 표시되었지만 공유 링크 생성 실패" 토스트를 띄운다.

**Tech Stack:** Next.js App Router SSE Routes, Zustand v5, fetchSSEStream (`useSSEStream.ts`), Vitest, Playwright

## Context (왜 이 변경이 필요한가)

D1 (PR #220, 본 브랜치) 으로 RLS-과 페이지의 anon 클라이언트 불일치는 해소되었으나, 다음 두 시나리오는 여전히 사용자 경험을 저해한다:

1. **공유 토큰 미동기화**: 사용자가 리딩 직후 "결과 공유하기" 버튼을 누르면, 클라이언트는 share_token 을 모르므로 sessionId 로 별도 API 호출이 필요하다. fire-and-forget 저장이 늦거나 실패하면 토큰이 없거나 잘못된 토큰을 노출할 수 있다.
2. **무성 저장 실패**: `void saveTarotReading(...).catch(e => console.error(...))` 패턴은 영구 에러(FK/UNIQUE/타입/권한 위반)를 즉시 콘솔에만 남긴다. 사용자는 결과를 보지만 재방문/공유 시 404. 운영 측면에서도 알람 신호가 약하다.

본 변경으로 기대 효과:
- 공유 버튼이 SSE done 직후 즉시 활성 (지연 없음)
- 저장 실패 시 사용자가 즉시 인지 (재시도 또는 결과 캡처 가능)
- console.error 의존 모니터링을 메트릭 가능한 SSE 이벤트로 격상

## 적용 가능 위험 항목 (CLAUDE.md 필수 주의사항)
- [ ] SSR/Hydration: 해당 없음 (SSE 라우트 + 클라이언트 컴포넌트)
- [ ] 비슷한 파일 N개 생성 여부 → tarot/saju/shinjeom reading 라우트 3개 동일 패턴 → SSE 메시지 인코딩 헬퍼를 `src/lib/request-utils.ts` 에 추가하여 중복 제거
- [ ] UI 텍스트 변경 여부 → "결과는 표시되었지만 공유 링크 생성 실패" 토스트 1종 추가 → E2E 셀렉터 검토 불요(신규 텍스트)

---

## 파일 구조

| 동작 | 파일 | 역할 |
|------|------|------|
| Modify | `src/lib/request-utils.ts` | `encodeSseEvent({ done, persisted, share_token, error })` 헬퍼 추가 |
| Modify | `src/lib/db/reading-saver.ts` | `saveTarotReading` 등이 `share_token` 을 포함한 객체 반환하도록 시그니처 확장 |
| Modify | `src/app/api/tarot/reading/route.ts` | `done` 메시지에 `share_token` 포함, 저장 결과 두 번째 이벤트로 통지 |
| Modify | `src/app/api/saju/reading/route.ts` | 동일 패턴 적용 |
| Modify | `src/app/api/shinjeom/message/route.ts` | 동일 패턴 적용 |
| Modify | `src/hooks/useSession.ts` | `lastShareToken: string \| null`, `setLastShareToken` 추가 |
| Modify | `src/hooks/useSajuSession.ts` | 동일 패턴 적용 |
| Modify | `src/hooks/useShinjeomSession.ts` | 동일 패턴 적용 |
| Modify | `src/app/tarot/session/page.tsx` | `onDone({ result, share_token })` 처리 + "공유 링크 생성 실패" 토스트 |
| Modify | `src/app/saju/session/page.tsx` | 동일 |
| Modify | `src/app/shinjeom/session/page.tsx` | 동일 |
| Modify | `src/data/error-messages.ts` | `SAVE_FAILURE_TOAST` 카피 추가 |
| Modify | `src/__tests__/api/tarot-reading.test.ts` | done 메시지 share_token 포함 + 저장 실패 시 persisted:false 이벤트 검증 |
| Modify | `src/__tests__/api/saju-reading.test.ts` | 동일 |
| Modify | `src/__tests__/api/shinjeom-message.test.ts` | 동일 |
| Modify | `src/__tests__/lib/reading-saver.test.ts` | 반환 객체 share_token 포함 검증 |
| Create | `e2e/share-flow.spec.ts` | 리딩 완료 → 공유 버튼 클릭 → 토큰 추출 → 새 컨텍스트 접근 정상 표시 (3 서비스) |

---

## Task 1: SSE 이벤트 헬퍼 추출 [P1]

**Files:**
- Modify: `src/lib/request-utils.ts`

- [ ] **Step 1**: `encodeSseEvent(payload: object): string` 추가 — `data: ${JSON.stringify(payload)}\n\n` 인코딩
- [ ] **Step 2**: 기존 3개 reading route 의 `controller.enqueue(encoder.encode(...))` 호출처를 신헬퍼로 치환 (가독성 + 누락 방지)

**검증**: `pnpm type-check && pnpm lint && pnpm vitest run src/__tests__/lib/request-utils.test.ts` (해당 테스트 없으면 추가)

---

## Task 2: reading-saver 시그니처 확장 [P1]

**Files:**
- Modify: `src/lib/db/reading-saver.ts`

- [ ] **Step 1**: `saveTarotReading` / `saveSajuReading` / `saveShinjeomReading` 의 반환 타입을 `Promise<{ share_token: string }>` 으로 변경
- [ ] **Step 2**: INSERT 시 `RETURNING share_token` 사용 (또는 INSERT 후 select), share_token 값 반환
- [ ] **Step 3**: 영구 에러는 그대로 throw (재시도 정책 유지) — 호출자가 catch 에서 persisted:false 통지하도록 위임
- [ ] **Step 4**: `src/__tests__/lib/reading-saver.test.ts` 에 share_token 반환 검증 케이스 + 영구 에러 throw 검증 케이스 보강

**검증**: `pnpm vitest run src/__tests__/lib/reading-saver.test.ts`

---

## Task 3: SSE 라우트 — share_token + persisted 이벤트 [P1]

**Files:**
- Modify: `src/app/api/tarot/reading/route.ts`
- Modify: `src/app/api/saju/reading/route.ts`
- Modify: `src/app/api/shinjeom/message/route.ts`

기존 (현행):
```typescript
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`));
if (db && sessionId) {
  void saveTarotReading(db, sessionId, result, cards).catch(e => console.error(...))
}
```

변경 (제안):
```typescript
controller.enqueue(encodeSseEvent({ done: true, result }));
if (db && sessionId) {
  saveTarotReading(db, sessionId, result, cards)
    .then(({ share_token }) =>
      controller.enqueue(encodeSseEvent({ persisted: true, share_token }))
    )
    .catch(e => {
      console.error("[tarot-save]", e);
      controller.enqueue(encodeSseEvent({ persisted: false }));
    })
    .finally(() => controller.close());
} else {
  controller.close();
}
```

- [ ] **Step 1**: 위 패턴을 3개 라우트에 적용 (인덴테이션·캐릭터 ID 변수명 등 라우트별 차이 반영)
- [ ] **Step 2**: 기존 catch-then-error 분기 유지 (스트림 도중 AI 에러 시 error 이벤트는 그대로)
- [ ] **Step 3**: `controller.close()` 가 정확히 한 번만 호출되도록 보장

**검증**: `pnpm vitest run src/__tests__/api/tarot-reading.test.ts src/__tests__/api/saju-reading.test.ts src/__tests__/api/shinjeom-message.test.ts && pnpm type-check && pnpm lint`

---

## Task 4: useSSEStream + Zustand 통합 [P1]

**Files:**
- Modify: `src/hooks/useSSEStream.ts`
- Modify: `src/hooks/useSession.ts` (+ saju/shinjeom 변형)

- [ ] **Step 1**: `useSSEStream` 의 핸들러 시그니처 검토 — `onDone(data)` 가 `share_token` / `persisted` 필드까지 받을 수 있는지 (이미 자유 객체일 가능성 높음 — 기존 사용처 영향 검토)
- [ ] **Step 2**: 3개 Zustand store 에 `lastShareToken: string | null` + `setLastShareToken` 추가
- [ ] **Step 3**: persist 미적용 (세션 종료 시 휘발 목적)

**검증**: `pnpm type-check && pnpm lint`

---

## Task 5: 세션 페이지 — share_token 즉시 사용 + 저장 실패 토스트 [P1]

**Files:**
- Modify: `src/app/tarot/session/page.tsx`
- Modify: `src/app/saju/session/page.tsx`
- Modify: `src/app/shinjeom/session/page.tsx`
- Modify: `src/data/error-messages.ts`

- [ ] **Step 1**: `error-messages.ts` 에 `SAVE_FAILURE_TOAST = "결과는 표시되었지만 공유 링크 생성에 실패했어요. 새로고침은 피하고 결과를 캡처하시는 것을 권장합니다."` 추가
- [ ] **Step 2**: 각 session page 에서 SSE handler:
   - `done: true` + `share_token` → `setLastShareToken(share_token)` 즉시 호출
   - `persisted: false` → 기존 토스트 유틸로 `SAVE_FAILURE_TOAST` 노출
- [ ] **Step 3**: "결과 공유하기" 버튼 클릭 핸들러를 `lastShareToken` 우선 사용하도록 수정 (없으면 기존 fallback 유지)

**검증**: 로컬 `pnpm dev` 로 타로 → 사주 → 신점 각각 1회 리딩 → 공유 버튼 즉시 활성 확인 → 시크릿 창에서 공유 URL 정상 표시 확인

---

## Task 6: E2E — 공유 플로우 전수 검증 [P1]

**Files:**
- Create: `e2e/share-flow.spec.ts`

- [ ] **Step 1**: `tarot-flow.spec.ts` 헬퍼 재사용으로 리딩 1회 완료
- [ ] **Step 2**: "결과 공유하기" 버튼 클릭 → URL/토큰 추출 (clipboard 또는 button data attr)
- [ ] **Step 3**: `browser.newContext({ storageState: undefined })` 로 비인증 컨텍스트 생성
- [ ] **Step 4**: 공유 URL 접근 → 결과 텍스트 일부가 정상 표시되는지 검증
- [ ] **Step 5**: tarot/saju/shinjeom 3개 서비스 동일 패턴

**검증**: `pnpm test:e2e e2e/share-flow.spec.ts` (3 디바이스 = 9 테스트)

---

## Task 7: 문서 동기화 [필수]

- [ ] CLAUDE.md "필수 주의사항 — API · 보안" 섹션에 항목 추가:
  - "**SSE 라우트 share_token 통지 패턴**: reading 결과 SSE 는 `done` 메시지에 share_token 미포함 시 클라이언트가 공유 토큰을 알 수 없음 → 저장 후 두 번째 이벤트 `{ persisted, share_token }` 으로 통지 필수. — 2026-05-06 D2 발견."
- [ ] `pnpm exec tsx scripts/sync-test-count.ts` 실행 후 CLAUDE.md 의 "테스트 705개" 수치 갱신
- [ ] `docs/architecture/ai-infrastructure.md` 의 SSE 섹션에 신 이벤트 형식 도식 1줄 추가

---

## 전체 검증 체크리스트

- [ ] `pnpm type-check && pnpm lint && pnpm test:coverage` 모두 통과
- [ ] `pnpm build` 성공
- [ ] 로컬 dev 서버에서 3개 서비스 모두 리딩 → 즉시 공유 버튼 활성 → 비인증 시크릿 창에서 공유 URL 정상 → DB 강제 실패 시 토스트 노출 (수동 시뮬레이션: 마이그레이션 임시 ROLLBACK 또는 service_role 키 변조)
- [ ] `pnpm test:e2e e2e/share-flow.spec.ts` 9 테스트 통과
- [ ] PR 본문에 "왜" 섹션 + 3 라운드 검증 보고서 링크 포함

---

## 참고

- 본 계획의 발견 근거: `~/.claude/plans/imperative-toasting-matsumoto.md` (9 에이전트 × 3 라운드 교차 검증 보고서)
- 선행 PR: D1 (브랜치 `claude/fix-tarot-reading-validation-OeleL`, commit `8e72c05` + `ecade99`)
- 관련 이전 PR: #219 (RLS 보안 수정 — share_token USING(true) DROP, getAdminDb 도입)
