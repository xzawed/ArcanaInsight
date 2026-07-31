# 환경변수 목록

`src/lib/env.ts`의 getter 함수와 대응하는 전체 환경변수 목록입니다.
환경변수는 코드에 하드코딩 금지 — 원칙적으로 `src/lib/env.ts`의 getter 함수를 통해 접근합니다.
단, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ASSET_BASE_URL`은 클라이언트/스토리지 초기화 코드에서 `process.env.*`로 직접 접근합니다 (Next.js NEXT_PUBLIC_ 패턴 준수).

---

## Supabase 모드 (현재 기본값)

`DB_PROVIDER=supabase` 또는 미설정 시 Supabase가 기본값입니다.

### 필수 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `GROK_API_KEY` | xAI Grok API 키 (1순위 AI) | `xai-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버 전용) | `eyJ...` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL | `https://arcana.example.com` |

### 선택 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DB_PROVIDER` | DB 공급자 선택 | `supabase` |
| `GROK_MODEL` | Grok 텍스트 생성 모델 | `grok-3` (CI 하드코딩값. `grok-4-fast-non-reasoning`은 reasoning 토큰 차단이 필요할 때의 선택적 대안) |
| `GROK_REASONING_EFFORT` | Grok-3 계열 reasoning 노력 수준. `low`/`high`. 비-reasoning 모델은 무시됨 | `low` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API 키 (Grok 장애 시 자동 fallback) | 미설정 시 Grok 단독 사용 |

---

## 자산 CDN (선택 — Cloudflare R2)

카드·배경 이미지의 서빙 베이스를 전환하는 선택 변수입니다. DB 모드와 무관하게 적용됩니다. **card-styles 카드아트·서비스배경은 2026-07-03 R2로 무손실 이전됐고, 프로덕션(`arcanainsight-production`)에는 설정돼 R2 서빙이 활성 상태입니다.**

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_ASSET_BASE_URL` | 자산 CDN 루트. 설정 시 `{base}/card-styles/...`·`{base}/card-skins/...`·`{base}/characters/...`로 서빙 (R2 버킷 `arcana-assets`). 미설정 시 Supabase Storage/로컬 폴백 | 코드 기본값 미설정 / **프로덕션은 `https://cdn.xzawed.xyz` 설정됨(R2 활성)** |
| `NEXT_PUBLIC_CHARACTER_VARIANTS` | `1`이면 캐릭터 이미지를 **사전 생성 WebP 변형**으로 서빙해 `next/image` 런타임 최적화를 건너뛴다(#521). ⚠️ **변형이 해당 환경에 존재할 때만 켠다** — R2에 업로드 전에 켜면 프로덕션 이미지가 전량 404가 된다. 롤백은 이 값을 끄면 끝(마스터 PNG 경로는 그대로 살아 있다) | 미설정(꺼짐) / 로컬·CI는 변형이 저장소에 커밋돼 있어 `1` 가능 / **프로덕션은 R2 업로드 후 설정** |

- 예시: `NEXT_PUBLIC_ASSET_BASE_URL=https://cdn.xzawed.xyz`
- `NEXT_PUBLIC_` 접두사라 **빌드 타임에 인라인**됩니다 → Railway에 설정 후 재배포해야 반영.
- ⚠️ **롤백 주의**: 코드 폴백 경로는 존재하나 Supabase `card-styles` 버킷이 **삭제(2026-07-03, 0객체)**돼 변수만 제거하면 **전량 404**가 됩니다. Supabase로 롤백하려면 먼저 버킷에 자산을 재업로드해야 합니다(현 정본은 R2).
- ⚠️ 자산 **수정(기존 키 덮어쓰기)** 시 R2 `immutable` 캐시로 인해 Cloudflare 캐시 퍼지 필요.
- 코드: [`src/lib/storage/card-style.ts`](../../src/lib/storage/card-style.ts) `storageBase()`, [`next.config.ts`](../../next.config.ts) `images.remotePatterns`(호스트 자동 파생). 업로드: `pnpm upload:assets:r2`(`.env.r2.local` 자격증명).
- 설계·이전 절차 정본: [`../superpowers/plans/archive/2026-06-26-supabase-storage-r2-migration.md`](../superpowers/plans/archive/2026-06-26-supabase-storage-r2-migration.md)

---

## PostgreSQL 모드 (온프레미스 전환 시)

`DB_PROVIDER=postgres` 설정 시 활성화됩니다.

### 필수 변수 (postgres 모드 전용)

| 변수 | 설명 | 예시 |
|------|------|------|
| `DB_PROVIDER` | DB 공급자 선택 | `postgres` |
| `POSTGRES_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:5432/arcana` |
| `NEXTAUTH_SECRET` | NextAuth.js 세션 암호화 키 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 프로덕션 사이트 URL | `https://arcana.example.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | 기존 Supabase OAuth 재사용 가능 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | 기존 Supabase OAuth 재사용 가능 |

### 선택 변수 (postgres 모드)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `POSTGRES_POOL_SIZE` | DB 커넥션 풀 크기 | `10` |

> **Google Cloud Console**: PostgreSQL 모드 사용 시 Authorized redirect URI에 `{NEXTAUTH_URL}/api/auth/callback/google` 추가 필요.

---

## Rate-Limit (선택 — Upstash Redis)

미설정 시 서버 메모리 Map 기반 fallback 사용 (단일 인스턴스·로컬 개발 호환).

| 변수 | 설명 | 비고 |
|------|------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 토큰 | Upstash 콘솔에서 발급 |

> 다중 서버 인스턴스 운영 시 Redis 전환 권장. 무료 티어 10K req/day.

---

## 리딩 dead-letter 재처리 (선택)

리딩 저장이 영구 실패하면 `failed_readings`(마이그레이션 022)에 영속화된다. 재처리 엔드포인트 `POST /api/internal/reading-dlq/retry`를 시크릿으로 가드한다.

| 변수 | 설명 | 비고 |
|------|------|------|
| `DLQ_RETRY_SECRET` | dead-letter 재처리 엔드포인트 시크릿 (`x-dlq-secret` 헤더로 검증) | 미설정 시 엔드포인트 404(비활성). Railway cron/수동 curl로 호출 |

---

## AI 공급자 튜닝 (선택)

미설정 시 기본값을 사용합니다.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `GROK_BASE_URL` | Grok API 엔드포인트 | `https://api.x.ai/v1` |
| `CLAUDE_MODEL` | Claude 모델 ID | `claude-opus-4-7` |
| `CLAUDE_BASE_URL` | Claude API 엔드포인트 오버라이드 | `https://api.anthropic.com/v1` |
| `AI_TIMEOUT_MS` | AI 스트림 타임아웃 (10장+ 타로 / full-fortune 사주 등 대형 응답 대응) | `240000` |
| `AI_DEFAULT_MAX_TOKENS` | AI 응답 최대 토큰 기본값 | `4000` |
| `AI_TEMPERATURE` | AI 온도 파라미터 | `0.7` |
| `AI_FALLBACK_COOLDOWN_MS` | Fallback 쿨다운 — 5xx/network | `300000` (5분) |
| `AI_AUTH_COOLDOWN_MS` | Fallback 쿨다운 — 401/403 | `1800000` (30분) |

---

## 전환 방법

```bash
# Supabase → PostgreSQL 전환 (Railway 환경변수에서)
DB_PROVIDER=postgres
POSTGRES_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# 저장 후 즉시 적용 (재배포 불필요)

# PostgreSQL → Supabase 롤백
DB_PROVIDER=supabase
# 또는 DB_PROVIDER 변수 삭제
```

---

## 관련 파일

- `src/lib/env.ts` — 모든 getter 함수 정의 (18개)
- `src/lib/auth/index.ts` — DB_PROVIDER 기반 auth 전환
- `src/lib/db/index.ts` — DB_PROVIDER 기반 DB 전환
- `src/lib/storage/index.ts` — DB_PROVIDER 기반 이미지 URL 전환
- [`../architecture/db-abstraction.md`](../architecture/db-abstraction.md) — DB 추상화 상세
- [`../architecture/auth-abstraction.md`](../architecture/auth-abstraction.md) — Auth 추상화 상세

## E2E 테스트 전용 변수

| 변수 | 설명 | 비고 |
|------|------|------|
| `SKIP_WEBKIT` | `1` 설정 시 `playwright.config.ts`에서 Mobile iOS(WebKit) 프로젝트 제외 | 로컬 개발·CI에서 WebKit 설치 없이 Desktop+Android만 실행 |

> `SKIP_WEBKIT=1`은 로컬 개발 편의용. PR CI는 원래 Mobile iOS를 포함하지 않으므로 별도 설정 불필요. 주간 QA는 `SKIP_WEBKIT` 없이 전체 3개 디바이스 실행.

---

## i18n locale 컬럼 호환 (postgres 모드)

`DB_PROVIDER=postgres` 모드에서도 016 마이그레이션 동일하게 적용해야 한다. PostgreSQL 자체 환경에서 마이그레이션 도구로 `supabase/migrations/016_locale_columns.sql` 적용 또는 동일 ALTER 문 수동 실행. `idx_sessions_user_locale` 인덱스도 함께 생성 필요. Drizzle `schema/index.ts`에 이미 `locale` 필드 정의되어 있어 ORM 레벨은 자동 처리.

i18n 자체에는 신규 환경변수 없음 — 쿠키(`ai_locale`)와 헤더(`x-locale`)로 처리.

상세: [`../architecture/i18n.md`](../architecture/i18n.md)

---

## 개발 도구 (런타임 불필요)

로컬 개발·에셋 생성 스크립트에서만 사용하며, 서버 런타임에는 불필요합니다.

| 변수 | 설명 | 비고 |
|------|------|------|
| `REPLICATE_API_KEY` | Replicate API 인증 키 | 이미지 생성 스크립트(`generate:assets`) 실행 시 필수. 런타임에는 불필요. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 S3 자격증명 | 루트 `.env.r2.local`(gitignore)에서 로드. `pnpm upload:assets:r2` 실행 시 필수. 런타임에는 불필요(`NEXT_PUBLIC_` 아님). |
