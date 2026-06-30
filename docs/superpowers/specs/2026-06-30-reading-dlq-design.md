# 리딩 저장 dead-letter 큐 (A-1 잔여) 설계

작성일: 2026-06-30 / 상태: 승인됨 / 담당: Claude

## 배경

A-1(#435)로 리딩 저장 실패의 **관측성**(구조적 로깅 + `saved` SSE 시그널)은 확보됐으나, 영구 저장 실패 시 데이터는 여전히 유실된다. 본 작업은 실패한 저장을 **영속화 + 재처리**하여 무음 유실을 완전 차단한다. (기술부채 C 잔여)

## 설계 (승인됨)

### 1. 마이그레이션 022 — `failed_readings` 테이블

- 컬럼: `id`(uuid pk), `service`(text), `session_id`(text null), `payload`(jsonb — 재저장 인자), `error_code`(text null), `error_message`(text null), `attempts`(int default 0), `status`(text default 'pending': pending/resolved/abandoned), `created_at`(timestamptz default now()), `last_attempt_at`(timestamptz null).
- 인덱스: `(status, created_at)` — pending 조회용.
- **RLS: enable, anon/authenticated 정책 없음 (service_role 전용)** — 021 하드닝과 일관. 모든 접근은 `getAdminDb()`(service_role).
- ⚠️ prod 적용은 사용자(021처럼 수동 적용). 본 PR은 파일만 생성.

### 2. `recordFailedReading(db, service, sessionId, payload, error)` (reading-saver)

- 영구 저장 실패 catch에서 `logReadingSaveFailure`와 함께 호출 → `failed_readings`에 best-effort insert.
- **best-effort**: 이 insert 자체가 실패해도 throw하지 않고 `logReadingSaveFailure`로 로깅만 (스트림 가용성 보호).
- `payload`는 재저장에 필요한 서비스별 인자(JSON 직렬화 가능 형태).

### 3. 재처리 엔드포인트 `POST /api/internal/reading-dlq/retry`

- **Secret 헤더 가드**: `x-dlq-secret` === env `DLQ_RETRY_SECRET`. env 미설정 시 404 (기능 비활성). 불일치 시 401.
- pending `failed_readings` 조회(상한 N=20) → `service`로 dispatch해 `saveXReading(payload)` 재시도.
  - 성공: `status='resolved'`, `last_attempt_at` 갱신.
  - 실패: `attempts++`, `last_attempt_at` 갱신, `attempts >= MAX_ATTEMPTS(5)`면 `status='abandoned'`.
- 응답: `{ processed, resolved, failed, abandoned }`.
- Railway cron 또는 수동 curl로 트리거.

### 4. saveStatus UI 힌트 (별도 단계)

- `useTarotReading`·`useSajuReading`·`useShinjeomChat`가 `fetchSSEStream`의 `onSaveStatus`를 opt-in → 저장 실패 시 은은한 토스트("이력 저장 실패, 결과는 정상 표시됩니다"). i18n 3언어 키.

## payload 형태 (서비스별 재저장 인자)

- tarot: `{ reading: ReadingResult, cards: {cardId,position,isReversed,selectedAt?}[], locale }`
- saju: `{ sajuReadingData: Record<string,unknown>, locale }`
- shinjeom: `{ result: {overallReading,topicReading?,advice}, locale }`

재처리 dispatch가 `selectedAt`(jsonb 문자열) → `Date` 복원 등 직렬화 경계를 처리한다.

## 에러 처리·안전성

- `recordFailedReading` 실패는 무음 흡수(로깅) — 스트림·사용자 영향 0.
- 엔드포인트는 service_role(`getAdminDb`)로만 DB 접근. RLS는 anon/user 차단.
- `MAX_ATTEMPTS` 초과 시 `abandoned`로 무한 재시도 방지.
- 멱등: `resolved`/`abandoned`는 재조회 대상에서 제외.

## 테스트

- `recordFailedReading`: 정상 insert, insert 실패 시 무음(throw 없음).
- 재처리 엔드포인트: secret 불일치 401, env 미설정 404, pending dispatch 성공→resolved, 실패→attempts++, MAX 초과→abandoned, 서비스별 dispatch.
- saveStatus UI: 훅 onSaveStatus 수신 시 토스트 상태.

## 범위·비범위

- **범위**: 마이그레이션 022, `recordFailedReading` + 3라우트 배선, 재처리 엔드포인트, `DLQ_RETRY_SECRET` env + 문서, 테스트. (별도 단계로 saveStatus UI)
- **비범위**: 자동 cron 등록(인프라 — Railway 설정은 사용자), 알림(Slack 등) 연동.
