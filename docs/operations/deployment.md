# Railway 배포 가이드

ArcanaInsight는 Railway를 사용하여 자동 배포됩니다.

> 배포 관련 변경 시 품질 손상을 막는 절차·체크리스트·함정은 [`deploy-safety-guide.md`](deploy-safety-guide.md)를 먼저 확인한다.

---

## 자동 배포 흐름

```
PR 머지 → main push → Railway 자동 빌드(Dockerfile/standalone) → /api/health 통과 → 트래픽 스왑
```

Railway는 `main` 브랜치의 모든 push에 자동으로 반응합니다. 수동 배포 트리거는 필요하지 않습니다.
**헬스체크(`/api/health`)가 통과해야만 새 배포로 트래픽이 넘어가므로**, 빌드/기동 실패 시 기존 배포가 계속 서빙됩니다(무중단·안전 스왑).

### 빌드 최적화 (배포 이미지 최소화 → 배포 가속)

`next.config.ts` `output:"standalone"` + 멀티스테이지 `Dockerfile`로 런타임 이미지를 최소화한다:
- standalone이 런타임 필요한 의존성만 추적 → 런타임 `node_modules` 580MB → **38MB**(실측)
- 슬림 런타임 스테이지에 `.next/standalone`+`.next/static`+`public`만 복사
- `.dockerignore`로 `node_modules`·`.next`·테스트·docs·`.env`, 그리고 **`public/images/characters`(283MB)** 제외 → 이미지 내 `public` 317MB→35MB (캐릭터는 R2 서빙)
- 실측(amd64): 전체 이미지 ~1.1GB(nixpacks 추정) → **~300MB**

**standalone 배포 필수 조건 2가지 (2026-07-06 실측 확정 — 이게 없으면 헬스체크 실패로 배포 FAILED, 프로덕션 서비스에 적용 완료):**

1. **서비스 startCommand = `node server.js`** (env 프리픽스·따옴표·`sh -c` 금지):
   Railway는 startCommand를 **shell 없이 공백으로 argv 분해(따옴표 미존중)** 한다. `HOSTNAME=0.0.0.0 node server.js`는 `HOSTNAME=0.0.0.0`을 실행파일로 오인, `sh -c "..."`는 따옴표가 깨져 서버가 안 뜬다. 순수 `node server.js`여야 함.
2. **서비스 변수 `HOSTNAME=0.0.0.0` 필수**:
   Railway 컨테이너의 `HOSTNAME`은 컨테이너ID(예 `f47c8b41151b`)이고 `/etc/hosts`에서 **IPv6(fd12:…)가 먼저, IPv4(10.168.67.211) 나중**으로 해석된다. Next standalone `server.js`는 `process.env.HOSTNAME`에 바인딩하므로 그대로 두면 **IPv6에만 바인딩** → Railway 헬스체크(IPv4)가 도달 못 해 배포 FAILED. `HOSTNAME=0.0.0.0` 서비스 변수를 주입하면 **IPv4 전 인터페이스(0.0.0.0)** 에 바인딩해 도달한다(앱 로그 `Network: http://0.0.0.0:8080` 확인). PORT는 Railway가 8080 주입. (nixpacks `next start`는 0.0.0.0로 바인딩돼 이 문제가 없었음.)

   설정: `railway variable set HOSTNAME=0.0.0.0 -s ArcanaInsight -e production`. ⚠️ 서비스 재생성 시 재설정 필요 — repo가 아니라 Railway 서비스 config에 있음.

> ⚠️ **NEXT_PUBLIC_* 빌드 인자 필수**: `NEXT_PUBLIC_SUPABASE_URL`·`_ANON_KEY`·`_SITE_URL`·`_ASSET_BASE_URL`은 `next build` 시 클라이언트 번들에 인라인되므로 Railway 서비스 변수로 설정되어 있어야 Dockerfile `ARG`로 주입된다. 특히 `NEXT_PUBLIC_ASSET_BASE_URL` 누락 시 R2 캐릭터 이미지가 이미지에서도 제외돼 404.

> ⚠️ **서비스 startCommand가 railway.toml보다 우선**(GraphQL `serviceInstance.startCommand`). railway.toml에 `node server.js`를 두더라도 서비스에 남은 값(과거 `pnpm start`)이 우선하므로, 배포 시 `serviceInstanceUpdate`로 `node server.js`로 맞춰야 한다.

---

## 설정 파일

- `Dockerfile` — 멀티스테이지 (deps → build → 슬림 runtime, `node server.js` 기동)
- `.dockerignore` — 빌드 컨텍스트 제외 (node_modules·.next·테스트·docs·캐릭터 이미지·.env)
- `railway.toml` — (`builder = "dockerfile"`, `startCommand = "node server.js"`, `healthcheckPath = "/api/health"`)
- `.github/workflows/deploy.yml` — PR CI 워크플로우 (Railway 배포 전 게이트, CI는 `next start` 사용)

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
