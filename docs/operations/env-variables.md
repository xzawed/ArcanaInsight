# 환경변수 목록

`src/lib/env.ts`의 getter 함수와 대응하는 전체 환경변수 목록입니다.
환경변수는 코드에 하드코딩 금지 — 반드시 `src/lib/env.ts`의 getter 함수를 통해 접근합니다.

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
| `GROK_MODEL` | Grok 텍스트 생성 모델 | `grok-3` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API 키 (Grok 장애 시 자동 fallback) | 미설정 시 Grok 단독 사용 |

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

## i18n 무료 NMT (선택 — Z2 시나리오 빌드타임 전용)

정적 영역(UI 라벨·카드 키워드·스프레드 등 약 900 항목) 자동 번역 전용. **모두 카드 등록 불필요 + 상업 사용 명시 허용 + 학습 미사용**. 빌드타임 `pnpm i18n:translate` 스크립트만 사용하므로 production 라우트 호출 없음. 미설정 시 fallback chain의 다음 Provider로 자동 전환.

| 변수 | 설명 | 무료 한도 | 가입 |
|------|------|----------|------|
| `CEREBRAS_API_KEY` | 1순위 Provider (Llama 3.3 70B) | 1M tokens/일, 30 RPM | email만 |
| `GROQ_API_KEY` | 2순위 fallback | 14,400 RPD, 30 RPM | email만 |
| `SAMBANOVA_API_KEY` | 3순위 fallback (영구 무료 보장) | 20~30 RPM | email만 |
| `HUGGINGFACE_API_KEY` | 4순위 fallback | 100K credits/월 | email만 |

> **회피 옵션**: ❌ Gemini Free (EEA/UK ToS 위반·2025-12 quota 50~80% 삭감) / ❌ DeepL Free (신규 가입 종료) / ❌ Papago (외국 사용자 가입 차단) / ❌ Azure F0 (카드 등록 강제, 부수 비용 0원 정책 위반).

> **데이터 정책**: 정적 메타데이터(UI·카드·스프레드)만 NMT 호출. 사용자 PII·사주·readings 본문은 절대 무료 NMT 미전송 (Z-08 PII 유출 방지). AI 동적 응답은 기존 paid Grok/Claude 사용.

---

## AI 공급자 튜닝 (선택)

미설정 시 기본값을 사용합니다.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `GROK_BASE_URL` | Grok API 엔드포인트 | `https://api.x.ai/v1` |
| `CLAUDE_MODEL` | Claude 모델 ID | `claude-opus-4-7` |
| `CLAUDE_BASE_URL` | Claude API 엔드포인트 오버라이드 | `https://api.anthropic.com/v1` |
| `AI_TIMEOUT_MS` | AI 스트림 타임아웃 | `60000` |
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

- `src/lib/env.ts` — 모든 getter 함수 정의 (16개)
- `src/lib/auth/index.ts` — DB_PROVIDER 기반 auth 전환
- `src/lib/db/index.ts` — DB_PROVIDER 기반 DB 전환
- `src/lib/storage/index.ts` — DB_PROVIDER 기반 이미지 URL 전환
- [`../architecture/db-abstraction.md`](../architecture/db-abstraction.md) — DB 추상화 상세
- [`../architecture/auth-abstraction.md`](../architecture/auth-abstraction.md) — Auth 추상화 상세

## i18n locale 컬럼 호환 (postgres 모드)

`DB_PROVIDER=postgres` 모드에서도 016 마이그레이션 동일하게 적용해야 한다. PostgreSQL 자체 환경에서 마이그레이션 도구로 `supabase/migrations/016_locale_columns.sql` 적용 또는 동일 ALTER 문 수동 실행. `idx_sessions_user_locale` 인덱스도 함께 생성 필요. Drizzle `schema/index.ts`에 이미 `locale` 필드 정의되어 있어 ORM 레벨은 자동 처리.

i18n 자체에는 신규 환경변수 없음 — 쿠키(`ai_locale`)와 헤더(`x-locale`)로 처리.

상세: [`../architecture/i18n.md`](../architecture/i18n.md)
