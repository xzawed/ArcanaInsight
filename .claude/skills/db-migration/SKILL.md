---
name: db-migration
description: Supabase 마이그레이션 작성부터 운영 DB 적용·검증·문서 상태표 갱신까지의 절차를 안내한다. "마이그레이션 추가", "DB 스키마 변경", "컬럼 추가", "테이블 생성", "마이그레이션 적용", "RLS 정책" 등의 요청에 사용한다.
when_to_use: supabase/migrations/ 에 새 .sql 을 추가할 때, 컬럼/테이블/RLS 변경 시, 운영 DB 적용·적용상태 추적이 필요할 때
allowed-tools: Read Grep Bash(ls supabase/migrations*)
---

# Supabase 마이그레이션 절차 (작성 → 운영 적용 → 검증 → 문서)

> 정본: [`docs/architecture/db-abstraction.md`](../../../docs/architecture/db-abstraction.md) §4(마이그레이션 목록).
> 배경: 생성만 하고 운영 적용·추적이 자산화되지 않아 022(`failed_readings_dlq`)가 장기간 "⚠️ 운영 DB 미적용" drift 상태였다. 이 스킬은 그 공백을 메운다.

## 1. 번호 할당 (수동 확인)

```bash
ls supabase/migrations/ | tail -3
```
가장 큰 번호 +1로 `supabase/migrations/{NNN}_{설명}.sql` 생성. **자동 할당 아님** — 반드시 실제 디렉터리 확인 후 지정.

## 2. SQL 작성 원칙

- **멱등**: `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `DROP POLICY IF EXISTS` — 재실행 안전.
- **RLS**: 새 테이블은 `ENABLE ROW LEVEL SECURITY` + 정책 명시. 쓰기 경로가 전부 `getAdminDb()`(service_role)면 anon INSERT 정책 불필요(021과 일관). ⚠️ 운영 정책명이 파일 기준명과 out-of-band 드리프트될 수 있으니 `pg_policies` 실측으로 확인.
- **컬럼 추가 + best-effort 영속 패턴**: 앱이 본 insert와 **분리된 UPDATE**로 기록하면(예 `persistDirectAnswer`) 컬럼 미적용 환경에서도 본 저장 무영향(UPDATE만 조용히 실패). 이 패턴이면 **코드 배포와 마이그 적용 순서 무관**. (참고: `persistReadingSections`는 섹션 스키마 폐지로 2026-07-07 제거됨 — 컬럼 추가 자체가 앱에서 미사용으로 끝날 수 있음을 보여주는 사례.)
- 이름 충돌 확인(예 기존 `elements` jsonb vs 신규 컬럼).

## 3. 운영 DB 적용 (Supabase MCP)

프로덕션 프로젝트: `arcana-insight`(project_id `hkjrupbauexapmmzbcgw`). ToolSearch로 Supabase MCP 도구를 로드해 적용한다.

- `mcp__..._Supabase__apply_migration` — name + SQL로 적용 (또는 `execute_sql`로 실행).
- ⚠️ 원격 운영 DB에 직접 반영되므로 SQL을 먼저 검토.

## 4. 적용 검증

- `mcp__..._Supabase__list_migrations` — 적용 목록에 새 번호 존재 확인.
- 테이블/컬럼/RLS 실측: `execute_sql`로 `information_schema.columns`·`pg_policies` 조회(정책 0건=service_role 전용, 컬럼 존재, RLS on).

## 5. 문서 상태표 갱신 (필수)

- [`docs/architecture/db-abstraction.md`](../../../docs/architecture/db-abstraction.md) §4 목록에 새 행 추가 + **적용 상태 표기**: 적용 완료 시 `✅ 운영 DB 적용 완료(YYYY-MM-DD)`, 미적용 시 `⚠️ 운영 DB 미적용`.
- `CLAUDE.md`·관련 문서의 마이그레이션 번호 언급 동기화.
- best-effort UPDATE 헬퍼를 추가했다면 db-abstraction.md의 해당 목록에도 반영.

## 6. Drift 방지

적용 상태는 문서 표의 ✅/⚠️ 수기 마킹으로만 추적된다 → **적용과 동시에 표를 갱신**해 022 같은 장기 미적용 drift를 막는다. `divination-scaffold` 에이전트로 새 서비스를 만들 때 이 스킬 절차를 함께 따른다.
