# DB 추상화 레이어

`DB_PROVIDER` 환경변수 하나로 Supabase ↔ 온프레미스 PostgreSQL을 즉시 전환합니다.

---

## 1. 추상화 구조

```
API Route
    │
    ├─ getDb()           → src/lib/db/index.ts
    │   ├─ DB_PROVIDER=postgres  → PostgresAdapter (Drizzle ORM)
    │   └─ 그 외          → SupabaseAdapter
    │
    ├─ getCurrentUser()  → src/lib/auth/index.ts
    │   ├─ postgres 모드 → NextAuth.js v5 auth()
    │   └─ supabase 모드 → supabase.auth.getUser()
    │
    └─ getCardImageUrl() → src/lib/storage/index.ts
        ├─ postgres 모드 → /images/skins/... (정적 파일)
        └─ supabase 모드 → Supabase Storage URL
```

---

## 2. 핵심 규칙

- **모든 API 라우트**는 `createClient()` 대신 `getDb()` + `getCurrentUser()` 사용
  - 로직 변경 없이 DB 전환 가능
- **롤백**: Railway 환경변수 `DB_PROVIDER=supabase`로 변경 → 즉시 복귀 (재배포 불필요)

---

## 3. DB 파일 구조

```
src/lib/db/
├── index.ts                    # getDb() 팩토리
├── types.ts                    # DbClient 공통 인터페이스 (findMany limit/offset, claimSessions: 익명 세션 user_id 귀속)
├── supabase-adapter.ts         # Supabase 구현체
├── supabase-admin-adapter.ts   # service_role 기반 RLS 우회 어댑터 (Supabase 전용)
├── postgres-adapter.ts         # Drizzle ORM 구현체
├── reading-saver.ts            # DB 저장 추상화 — 3회 retry + 지수 백오프
├── character-context.ts        # getRecentCharacterMemory() / fetchMemoryPrompt() — 캐릭터 메모리 공통 추출 (tarot/saju/shinjeom 3개 라우트에서 import)
└── schema/index.ts             # Drizzle 스키마 (supabase/migrations/ 동기화 대상)
```

---

## 4. Supabase 마이그레이션 목록

`supabase/migrations/` — 번호 순서 유지, **002는 결번**

| 파일 | 내용 |
|------|------|
| `001_initial_schema.sql` | 초기 스키마 (sessions, readings 등) |
| `003_daily_cards.sql` | daily_cards + profiles.favorite_character_id |
| `004_user_info.sql` | 사용자 정보 (생년월일, 성별, 혈액형 등) |
| `005_session_character_and_topics.sql` | sessions 캐릭터/토픽 확장 |
| `006_saju_readings.sql` | saju_readings 테이블 |
| `007_skin_selection.sql` | 스킨 선택 컬럼 |
| `008_shinjeom.sql` | shinjeom_messages, shinjeom_readings |
| `009_shinjeom_topics_expand.sql` | 신점 직장/이직 + 택일 토픽 |
| `010_share_token_default_fix.sql` | readings share_token NULL 백필 |
| `011_saju_shinjeom_share_token_defaults.sql` | saju/shinjeom share_token NULL 백필 |
| `012_spread_type_expand.sql` | sessions.spread_type CHECK 제약 확장 (10개 스프레드, PR #216) |
| `013_shinjeom_rls.sql` | shinjeom_messages RLS 추가 (008에서 누락) |
| `014_fix_share_token_rls.sql` | readings/saju_readings share_token 전체 공개 정책 제거 — service_role 서버 레이어로 대체 |
| `015_fix_sessions_rls.sql` | sessions SELECT: 익명 세션(user_id IS NULL) 조회 허용 (assertSessionOwnership 지원) |
| `016_locale_columns.sql` | 5개 테이블 locale 컬럼 + idx_sessions_user_locale (PR #223) |
| `017_daily_fortune_areas.sql` | daily_cards.area 컬럼 추가 + UNIQUE(date, character_id, area) 재구성 (DailyFortune 5영역) |
| `018_birthtime_mbti.sql` | profiles.birth_hour HH:MM 형식 외 NULL 처리 + profiles.mbti 컬럼 추가 |
| `019_fix_saju_readings.sql` | saju_readings.birth_hour NOT NULL 제약 해제 + saju_readings.mbti 컬럼 추가 (018 누락분) |
| `020_harden_anon_rls.sql` | 익명 over-grant 하드닝 — readings/saju/shinjeom SELECT 소유자 전용(공개 `using(true)` 제거), sessions·saju_readings UPDATE 익명 분기 제거 (#4/#6). result는 service_role(getAdminDb) 조회라 무영향 |
| `021_harden_anon_insert_rls.sql` | 익명 INSERT over-grant 하드닝 — `FOR INSERT WITH CHECK (true)` 정책 7종 제거 (sessions·session_cards·readings·saju_readings·daily_cards·shinjeom_messages·shinjeom_readings). 모든 쓰기는 getAdminDb(service_role)라 무영향, anon 직접 삽입만 차단 (020 INSERT 후속) |
| `022_failed_readings_dlq.sql` | 리딩 저장 dead-letter 큐 — `failed_readings` 테이블 신설(영구 저장 실패분 payload 영속화·재처리). service_role 전용, anon 정책 없음(021과 일관). ⚠️ 운영 DB 미적용 |
| `023_direct_answer.sql` | 질문 직답 영속 — `readings`·`saju_readings`·`shinjeom_readings`에 `direct_answer TEXT DEFAULT ''` 추가(재방문·공유 결과 노출). 앱은 `persistDirectAnswer` **best-effort UPDATE**로 기록하므로 컬럼 미적용 환경에서도 본 리딩 insert 무영향(컬럼 없으면 UPDATE만 조용히 실패·로깅). ✅ 운영 DB 적용 완료(2026-07-04) |

PostgreSQL 모드: `src/lib/db/schema/index.ts` (Drizzle)에 동일 스키마 정의됨

---

## 5. share_token 공개 정책

- 타로/사주/신점 결과 페이지(`/*/result/[id]`)는 `share_token` URL 기반 공개 공유 링크
- share_token 보유자 = 공개 열람 허용 (공유 링크 생성 = 공개 의도)
- **공개 열람은 service_role 서버 레이어로 구현**: result 라우트가 `getAdminDb()`(service_role, RLS 우회)로 `share_token` 조회 → 리딩 테이블의 RLS는 **소유자 전용 SELECT**만 둔다(`using(true)` 공개 정책 없음, 020). anon 키 직접 호출로는 타인 리딩 열람 불가.
- 소유자 전용 쓰기/삭제: `assertReadingAccess("owner")` 사용
- **모든 INSERT 는 service_role 전용**(021): 세션·카드·리딩·일일카드·신점메시지 등 7개 테이블의 `FOR INSERT WITH CHECK (true)` 정책을 제거 — 서버는 전부 `getAdminDb()`(service_role, RLS 우회)로 삽입하므로 무영향, anon 키 직접 삽입만 차단된다.
- share_token NULL 방지: Drizzle `$defaultFn(() => crypto.randomUUID())` + DB DEFAULT `gen_random_uuid()` 이중 보장

---

## 6. DB 저장 패턴

`src/lib/db/reading-saver.ts` — tarot/saju/shinjeom reading 라우트의 DB 저장 공통 모듈 (PR D에서 구현 완료)

- **3회 retry + 지수 백오프** (200ms, 400ms, 600ms)
- 모든 저장 실패는 `console.error`로 로깅 (SSE 스트림에 영향 없음)
- 제공 함수: `saveTarotReading`, `saveSajuReading`, `saveShinjeomFinalReading`, `saveShinjeomMessages`

```typescript
// 호출 패턴 (fire-and-forget, 스트림 차단 없음)
void saveTarotReading(db, sessionId, result, cards, locale).catch(
  (e) => console.error("타로 DB 저장 최종 실패:", e)
)
```

---

## 7. 환경 변수

### Supabase 모드

```
DB_PROVIDER=supabase          # 또는 미설정
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### PostgreSQL 모드

```
DB_PROVIDER=postgres
POSTGRES_URL=postgresql://user:password@host:5432/arcana
POSTGRES_POOL_SIZE=           # 기본 10
NEXTAUTH_SECRET=              # openssl rand -base64 32
NEXTAUTH_URL=                 # 프로덕션 URL
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> Google Cloud Console: PostgreSQL 모드 사용 시 Authorized redirect URI에 `{NEXTAUTH_URL}/api/auth/callback/google` 추가 필요

## i18n locale 컬럼 (016 마이그레이션)

5개 테이블에 `locale TEXT DEFAULT 'ko' CHECK (locale IN ('ko','en','ja'))` 컬럼:
- `profiles` — 사용자 선호 locale (인증 사용자 SSOT)
- `sessions` — 세션 작성 시점 locale (`idx_sessions_user_locale` 인덱스, PR-4 character-context 필터)
- `readings` / `saju_readings` / `shinjeom_readings` — 결과 텍스트 작성 언어

`daily_cards`는 `(date, character_id)` UNIQUE 단일 사전 정책으로 locale 미포함 (옵션 B 확정 — 용량 4배 폭증 방지). 표시 텍스트는 작성 시점 locale 사전을 따른다.

INSERT 시 `getRequestLocale()` (`src/i18n/server-locale.ts`)로 결정한 locale 명시 동봉. 미동봉 시 DEFAULT 'ko' 자동 입력 — PR-A 정합성 핫픽스에서 6개 INSERT 경로에 추가됨.

상세: [`i18n.md`](i18n.md)
