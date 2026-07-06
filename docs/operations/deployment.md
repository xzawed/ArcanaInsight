# Railway 배포 가이드

> **담당**: Claude (배포 전략·머지 판단·롤백 결정) | Codex (롤백 명령 실행·핫픽스 브랜치 구현)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

ArcanaInsight는 Railway를 사용하여 자동 배포됩니다.

---

## 자동 배포 흐름

```
PR 머지 → main push → Railway 자동 빌드(nixpacks) → 헬스체크(/) 통과 → 트래픽 스왑
```

Railway는 `main` 브랜치의 모든 push에 자동으로 반응합니다. 수동 배포 트리거는 필요하지 않습니다.
헬스체크가 통과해야만 새 배포로 트래픽이 넘어가므로, 빌드/기동 실패 시 기존 배포가 계속 서빙됩니다(무중단·안전 스왑).

### 자산(이미지) 서빙

- **카드·서비스 배경·캐릭터 이미지는 Cloudflare R2**(`cdn.xzawed.xyz`)에서 서빙된다. 캐릭터는 `getCharacterImageUrl`(`src/lib/storage/character-image.ts`)이 `NEXT_PUBLIC_ASSET_BASE_URL` 설정 시 R2(`characters/…`), 미설정 시 로컬 public 폴백. 업로드: `pnpm upload:characters:r2`.

> ⚠️ **프로덕션 `NEXT_PUBLIC_ASSET_BASE_URL` 필수**: 카드·캐릭터 이미지가 R2에서 서빙되므로 이 변수가 없으면 이미지가 로컬 폴백을 시도한다(카드 자산이 이미 의존).

> **배포 이미지 최소화(standalone Dockerfile) — 2026-07-06 시도·롤백, 다음 세션 재분석 예정**: `output:"standalone"` + 멀티스테이지 Dockerfile로 런타임 이미지를 ~300MB로 줄이려 했으나(node_modules 580→38MB, `public/images/characters` 283MB 제외), Railway 서비스 특유의 문제가 연속 발생해 nixpacks로 롤백했다 — ① 서비스에 남은 `pnpm start` 시작 명령이 슬림 런타임(pnpm 없음)에서 실패, ② Railway가 시작 명령을 shell 없이 argv로 파싱해 `HOSTNAME=0.0.0.0` 프리픽스를 실행파일로 오인, ③ `sh -c` 래핑 후에도 DEPLOYING(헬스체크) 단계에서 실패(런타임 로그가 CLI·GraphQL 모두 접근 불가로 미규명). **재시도 전 규명 필요**: 대시보드에서 실패 배포의 Deploy 단계 로그(헬스체크 실패 사유·앱 바인딩 host:port)를 확보할 것. 관련 브랜치 히스토리: #482·#483·#485·#486·#487.

---

## 설정 파일

- `railway.toml` — 빌드/배포 설정 (`builder = "nixpacks"`, `startCommand = "pnpm start"`, `healthcheckPath = "/"`)
- `.github/workflows/deploy.yml` — PR CI 워크플로우 (Railway 배포 전 게이트)

> ⚠️ Railway **서비스 시작 명령**은 서비스 설정 값이 railway.toml보다 우선한다(2026-07-06 확인 — GraphQL `serviceInstance.startCommand`가 우선). 시작 명령을 바꾸려면 서비스 설정(또는 GraphQL `serviceInstanceUpdate`)을 함께 갱신해야 한다.

### GitHub Secrets (CI 전용)

> **Railway 배포는 Secrets 불필요**: Railway는 자체 GitHub 연동으로 `main` 브랜치를 자동 감지하여 배포합니다 (`railway.toml` 기준). `deploy.yml`은 코드 품질 검증 전용 워크플로우입니다.

| Secret | 설명 | 사용 워크플로우 |
|--------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | deploy.yml, weekly-qa.yml |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | deploy.yml, weekly-qa.yml |
| `GROK_API_KEY` | Grok API 키 | deploy.yml, weekly-qa.yml |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 | deploy.yml, weekly-qa.yml |
| `SONAR_TOKEN` | SonarCloud 분석 토큰 | sonar.yml |
| `CODECOV_TOKEN` | Codecov 업로드 토큰 | sonar.yml |

> `NEXT_PUBLIC_SITE_URL`은 CI에서 `http://localhost:3000`으로 하드코딩되어 있어 GitHub Secret 불필요.

---

## 롤백 방법

### 즉시 롤백 (이전 빌드)

Railway 대시보드 → 서비스 선택 → Deployments 탭 → 이전 배포 클릭 → "Redeploy"

### DB_PROVIDER 롤백 (재배포 불필요)

PostgreSQL → Supabase 즉시 전환:
```
Railway 환경변수: DB_PROVIDER=supabase (또는 변수 삭제)
→ 저장 즉시 적용 (재배포 없이 즉시 동작)
```

### 코드 롤백 (git revert)

```bash
git revert <commit-hash>
git push origin main
# → Railway 자동 재배포
```

---

## 환경변수 관리

- 모든 환경변수는 Railway 대시보드에서 관리
- `.env` 파일은 절대 커밋하지 않음
- 전체 환경변수 목록: [`env-variables.md`](env-variables.md)

---

## 자산 서빙 (Cloudflare R2)

- 카드 아트·카드 뒷면·서비스 배경(`card-styles`)은 **Cloudflare R2**에서 `NEXT_PUBLIC_ASSET_BASE_URL=https://cdn.xzawed.xyz` 기준으로 `unoptimized` 직접 서빙된다(2026-07-03 이전, Supabase 폴백). 프로덕션 `arcanainsight-production` 서비스에 설정됨.
- `NEXT_PUBLIC_`은 빌드 타임 인라인 → 변경 시 **재빌드 필요**.
- ⚠️ **자산 수정 배포**: 기존 R2 키를 덮어쓴 경우 `Cache-Control: immutable`이라 Cloudflare가 구버전을 계속 서빙 → 해당 URL **Cloudflare 캐시 퍼지 필요**. 업로드는 `pnpm upload:assets:r2`. 상세: [`../conventions/image-assets.md`](../conventions/image-assets.md) §5.

---

## Rate-Limit Redis 활성화 (Upstash)

현재 rate-limit은 서버 메모리 기반 fallback으로 동작합니다 (단일 인스턴스에서는 정상).
다중 인스턴스 또는 서버 재시작 시 카운터가 초기화되는 문제를 방지하려면 Upstash Redis를 연결합니다.

### 1단계 — Upstash 데이터베이스 생성

1. [console.upstash.com](https://console.upstash.com) 접속 → 새 Redis 데이터베이스 생성
2. **Region**: 서비스 지역에 가장 가까운 곳 선택 (지연 최소화)
3. **Type**: Regional (무료 티어: 10,000 req/day)

### 2단계 — Railway 환경변수 등록

Railway 대시보드 → 서비스 → Variables 탭:

```
UPSTASH_REDIS_REST_URL   = https://xxx-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = AXxx...
```

Upstash 콘솔의 **REST API** 탭에서 두 값을 복사합니다.

### 3단계 — 반영 확인

Railway 변수 저장 → 자동 재배포 완료 후, `/api/tarot/reading` 엔드포인트에 연속 요청 시
Redis INCR 카운터가 누적되면 정상. `railway logs --tail`로 rate-limit 관련 에러가 없으면 완료.

---

## 빌드 실패 대응

1. Railway 대시보드 → Build Logs 확인
2. 로컬에서 `pnpm build` 재현 시도
3. 주요 원인:
   - TypeScript 타입 오류 (PR CI에서 차단되어야 하나 누락 시)
   - 환경변수 누락 (`src/lib/env.ts` getter가 런타임에 throw)
   - Next.js 빌드 타임 API 호출 실패

---

## 서비스 헬스 체크

```bash
# 배포 상태 확인 (Railway CLI)
railway status

# 로그 스트리밍
railway logs --tail
```

---

## CI/CD 파이프라인 상세

→ [`../workflow/ci-cd.md`](../workflow/ci-cd.md)

## 016 마이그레이션 (locale 컬럼) 적용·롤백

### 적용 (이미 운영 적용 완료, 2026-05-06)
```sql
-- supabase/migrations/016_locale_columns.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ko'
  CHECK (locale IN ('ko','en','ja'));
-- (sessions·readings·saju_readings·shinjeom_readings 동일)
CREATE INDEX IF NOT EXISTS idx_sessions_user_locale ON public.sessions (user_id, locale);
```

### 롤백 (긴급 시)
```sql
DROP INDEX IF EXISTS public.idx_sessions_user_locale;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS locale;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS locale;
ALTER TABLE public.readings DROP COLUMN IF EXISTS locale;
ALTER TABLE public.saju_readings DROP COLUMN IF EXISTS locale;
ALTER TABLE public.shinjeom_readings DROP COLUMN IF EXISTS locale;
```

> 주의: 롤백 시 PR-A의 `db.insert("sessions", { ..., locale })` 호출이 unknown column 에러 → 코드도 함께 롤백 필요 (PR #226 revert).
