# 리딩 저장 관측성 보강 (A-1) 설계

작성일: 2026-06-30 / 상태: 승인됨 / 담당: Claude

## 배경

타로·사주·신점 리딩의 DB 저장은 SSE 스트림 종료부에서 수행된다. 현재 3개 라우트가 저장 결과를 무음 처리한다:

- `tarot/reading`, `saju/reading`: `done:true,result` 전송 후 `void saveX().catch((e)=>console.error(...))` — fire-and-forget, 결과는 즉시 렌더(가용성 우선, DB 健康과 분리).
- `shinjeom/message`(최종): shareToken 때문에 저장을 먼저 `await` 후 `done` 전송. 실패 시 `console.error`만.
- `shinjeom/message`(중간): `void saveShinjeomMessages().catch(console.error)`.

문제: `withRetry`(3회 백오프, 영구에러 즉시 throw)가 transient는 흡수하나, **지속 장애 시 무음 데이터 유실** + dead-letter/알림 부재 + **클라이언트가 저장 성공 여부를 모름**. (`docs/operations/known-issues.md` 기술부채 C)

`parseError`(잘림/파싱 실패) 시 미저장은 **의도된 설계**(`.claude/rules/services.md`, 빈 결과 페이지 방지)이므로 변경하지 않는다.

## 핵심 제약

`src/hooks/useSSEStream.ts`의 `fetchSSEStream`은 `done:true`를 수신하면 읽기 루프를 즉시 `break`한다(`useSSEStream.ts:104-106`). 따라서 **현재 클라이언트는 `done` 이후 이벤트를 수신하지 못한다.** saved 시그널을 `done` 이후에 보내려면 클라이언트 계약 변경이 필요하다.

## 설계

승인된 접근: **(1) saved SSE 이벤트 + 구조적 로그, 마이그레이션 없음.** 두 파트로 구성.

### Part 1 — 구조적 실패 로깅 (무위험·핵심)

`src/lib/db/reading-saver.ts`에 헬퍼 추가:

```ts
export function logReadingSaveFailure(
  service: "tarot" | "saju" | "shinjeom" | "shinjeom-message",
  sessionId: string | null,
  error: unknown,
): void
```

- 단일 grep 가능 마커 `[reading-save-failed]` + `service`, `sessionId`, PostgreSQL `code`(있으면), `message`를 한 줄 구조적 로그(`console.error`)로 출력.
- 4개 저장 실패 catch(타로·사주·신점 최종·신점 중간 메시지)가 기존 자유형식 `console.error` 대신 이 헬퍼 호출.
- 효과: 지속 장애가 운영 로그에서 일관 마커로 추적·알림 가능 → 무음 유실 해소. **클라이언트 계약 변경 0.**

### Part 2 — saved SSE 시그널 (클라이언트 인지)

**가용성 보존 원칙**: 결과(`done`)는 지금처럼 **먼저** 전송한다. 저장 실패가 결과 표시를 막지 않는다.

**서버 (tarot/saju):**
```
enqueue({ done:true, result, ... })     // 결과 즉시 — 가용성 유지
if (db && sessionId && !result.parseError) {
  try { await saveX(...); enqueue({ saved:true }) }
  catch (e) { logReadingSaveFailure(...); enqueue({ saved:false }) }
}
controller.close()
```
`done`이 이미 전송됐으므로 `await`가 결과 렌더를 지연시키지 않는다 — 스트림 close와 saved 이벤트만 지연. AI 생성(수초~수십초) 뒤 ≤1s(withRetry 상한)는 무영향.

**서버 (shinjeom 최종):** 저장은 이미 `done` 전에 `await`됨. 저장 성공/실패를 캡처해 `done` 전송 **직후** `{ saved:boolean }` 이벤트를 추가 후 close. 실패 시 `logReadingSaveFailure` 호출(+shareToken=null 기존 유지).

**서버 (shinjeom 중간):** 결과 UI에 영속 노출되는 항목이 아니므로 saved SSE 이벤트는 생략. 실패 로깅만 `logReadingSaveFailure`로 업그레이드.

**클라이언트 (`fetchSSEStream`) — 하위호환 변경:**
- `onSaveStatus?: (saved: boolean) => void` 콜백을 옵션으로 추가.
- **미제공 시**: 기존 동작 그대로 — `done`에서 즉시 종료(완전 하위호환).
- **제공 시**: `done`에서 `onDone` 호출하되 루프를 멈추지 않고 계속 읽음 → `{saved}` 수신 시 `onSaveStatus(saved)` 후 종료, 또는 스트림 close/타임아웃 시 상태 미상으로 종료(이미 결과 보유).
- 익명 리딩(저장 없음)·구경로: saved 이벤트 없이 close → 미상 종료로 안전 처리.

**클라이언트 훅 (타로·사주·신점) — 후속 PR로 분리:** `fetchSSEStream`에 `onSaveStatus` capability를 추가하는 것까지가 본 PR 범위다. 3개 훅이 `onSaveStatus`를 opt-in해 `saveStatus` 상태를 노출하고 UI 힌트(예: "이력 저장 실패" 토스트)를 보여주는 작업은 **소비할 UI와 함께 후속 PR로 진행**한다. 소비 UI 없이 상태만 보유하면 dead state(YAGNI)이므로, 훅 배선은 UI 설계와 한 묶음으로 처리한다. 서버는 이미 saved 이벤트를 전송하나 `onSaveStatus` 미제공 훅은 기존처럼 done에서 종료하며, 미수신 trailing 이벤트는 무해하다.

## 에러 처리

- `parseError` 경로: 저장·saved 이벤트 모두 없음(기존 `result.parseError` 시그널 유지).
- 영구 에러(23xxx 등): `withRetry`가 즉시 throw → catch → `saved:false` + 구조적 로그.
- transient: `withRetry` 3회 후 throw → 동일 처리.
- 저장 행(hang): 결과는 이미 전송됨. 페이지 240s 하드타임아웃 + `AbortController`가 극단 케이스 커버.

## 테스트 (TDD)

`src/__tests__/api/`:
- 타로·사주: 저장 성공 시 `saved:true` 이벤트 emit, 저장 throw 시 `saved:false` emit + `logReadingSaveFailure` 호출, `parseError` 시 saved 이벤트 없음.
- 신점 최종: 저장 성공/실패 시 `saved` 이벤트, 실패 시 shareToken=null 유지.
- `reading-saver` 단위: `logReadingSaveFailure`가 마커·code·sessionId 포함 로그 출력.
- `useSSEStream`: `onSaveStatus` 미제공 시 done 즉시 종료(하위호환), 제공 시 trailing `saved` 수신.

## 범위·비범위

- **범위(본 PR)**: 3 라우트(await + saved 시그널 + 구조적 로깅), `reading-saver.ts`(`logReadingSaveFailure` 헬퍼), `useSSEStream.ts`(`onSaveStatus` 하위호환 capability), 단위 테스트.
- **비범위(후속 PR)**: 3 클라이언트 훅의 `onSaveStatus` opt-in + `saveStatus` UI 힌트(토스트), dead-letter 테이블·자동 재처리, 신점 중간 메시지 saved 시그널.
- **마이그레이션 0.**
