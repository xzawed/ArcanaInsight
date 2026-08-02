# 미구현 기능 및 기술 부채

> **정본 위치**: 이 파일이 단일 정본. `CLAUDE.md`의 관련 섹션은 이 파일을 링크로 참조.

---

## 미구현 기능

알고 있지만 아직 구현하지 않은 기능. Claude가 실수로 구현하거나 사용자에게 "있다"고 잘못 안내하지 않도록 명시한다.

현재 미구현 기능 없음.

---

## 기술 부채

의도적으로 아직 처리하지 않은 기술적 한계. Claude가 실수로 수정하거나 이미 검토된 방법을 다시 제안하지 않도록 명시한다.

| 항목 | 파일 | 현황 | 해결 조건 | 담당 |
|------|------|------|----------|------|
| 커버리지 측정 범위 협소 | `vitest.config.ts` coverage.include | whitelist 방식. **B-4 점진 확장(2026-06-30~07-01)**: 1차 `time-utils`·`guest-sessions`·`reading-saver`, 2차 `character-context`(stmts 100%), 3차 `postgres-adapter`(findManyIn·orderBy 분기 테스트 보강 → stmts 83→98%, sonar.coverage.exclusions에서도 제거) 추가 — 측정 statements 1450→1697(약 17% 확장), 임계값 불변 유지. 잔여 미측정은 jsdom 필요 client hooks·정적 데이터·auth/storage 등(의도적 제외). | 필요 시 exclude 방식 전환(임계값 재보정 동반) | Claude |
| **B: parseError 리딩 영속화 / resume** | `app/api/{tarot,saju,shinjeom}/reading\|message/route.ts`, `mypage-queries.ts` | parseError(잘림/파싱실패) 시 리딩 미저장 + 세션 in_progress 잔존. **현 동작 적절 판단(2026-07-01 조사·사용자 확정)**: ① `mypage-queries.ts`가 `completed` + **리딩 있는** in_progress만 표시하고 리딩 없는 in_progress(파싱실패·정상이탈)는 필터링하므로 broken/빈 항목 미노출(올바름), ② 세션 화면에 in-session 재시도 버튼 존재, ③ in_progress 대부분은 정상 이탈이라 영향 부차적. resume 기능은 저가치 엣지케이스 과설계로 **미구현 결정**. 강제 저장은 빈 결과 회귀 위험이라 금지 유지. | 잔여는 orphaned in_progress 행(표시엔 필터됨, cosmetic) — 필요 시 정리만 | 현 동작 유지 |
| ~~**C: 리딩 저장 fire-and-forget 관측성**~~ | `reading route`, `lib/db/reading-saver.ts` | **해소 (2026-06-30, A-1)** — `logReadingSaveFailure`가 `[reading-save-failed]` 단일 마커로 4개 저장 실패를 구조적 로깅(grep·알림 가능). 타로/사주/신점최종 저장을 `await`해 `saved:true/false` SSE 시그널 전송(결과는 `done`으로 선전송하여 가용성 유지). `fetchSSEStream`에 하위호환 `onSaveStatus` capability 추가. 설계: [`../superpowers/specs/2026-06-30-reading-save-observability-design.md`](../superpowers/specs/2026-06-30-reading-save-observability-design.md). **dead-letter 추가(2026-06-30)**: 마이그레이션 022 `failed_readings`(service_role RLS) + `recordFailedReading`(영구 실패 영속화) + 재처리 엔드포인트 `POST /api/internal/reading-dlq/retry`(secret 가드, MAX 5회). 설계: [`../superpowers/specs/2026-06-30-reading-dlq-design.md`](../superpowers/specs/2026-06-30-reading-dlq-design.md). **022 prod 적용 완료(2026-07-01)** — `failed_readings`(RLS on·정책 0건=service_role 전용·인덱스 2·컬럼 10) 생성 검증, Railway production에 `DLQ_RETRY_SECRET` 설정으로 재처리 엔드포인트(`POST /api/internal/reading-dlq/retry`) 활성화. | 잔여(선택): `saveStatus` UI 힌트(단 dead-letter 자가복구로 가치 재검토) | Claude |
| ~~**INSERT `WITH CHECK(true)` RLS 정책 7종**~~ | `sessions·readings·saju/shinjeom_readings·session_cards·daily_cards·shinjeom_messages` | **해소 완료 (migration 021, prod 적용 2026-06-24)** — 7테이블 병렬 심층 검증으로 anon/쿠키 클라이언트 INSERT 경로 부재 확인(모든 쓰기 getAdminDb=service_role) 후 `FOR INSERT WITH CHECK (true)` 정책 7종 제거. 적용 결과: 잔존 INSERT 정책 0행, service_role INSERT 성공·anon INSERT 차단(42501) 검증. ⚠️ 운영 shinjeom 정책이 파일 기준명(`shinjeom_*_insert`)이 아닌 `Anyone can insert shinjeom *`로 out-of-band 드리프트되어 있어 021 파일에 실측명 DROP 2종 추가(멱등 보정). | — | — |
| `postgres-adapter.ts` Drizzle `as any` 잔존 6건 | `src/lib/db/postgres-adapter.ts` | `.values(data as any)`·`.set(data as any)`·upsert SET 절·claim userId 등 6건(110·119·128·149·153·171행) — Drizzle `InferInsertModel`과 `DbClient` 제네릭 구조적 불일치. **3-에이전트 심층 검토 후 파기 확정(2026-04-26)**: 런타임 버그 없음, PostgreSQL 제약이 타입 검증 대체, 재설계 비용 불합리. | PostgresAdapter 전면 재설계 시 처리 (현시점 불필요) | 파기 확정 |
| 타로 `interpretation` 레거시 필드 (하위호환 fallback) | `src/services/tarot/tarot-service.ts`, `CardInterpretationList`, `services/tarot/result-view.ts` | 프리미엄 3-섹션 도입(#414, 2026-05-26) 후 **구포맷 저장 리딩 표시 전용** fallback. ⚠️ **기존 해결 조건("구포맷 데이터 소멸 대기")은 성립하지 않는다** — 리딩에 TTL·보존 정책이 없어 영구 보관이고(2026-08-01 조사), 회원 탈퇴 삭제도 미구현이다. **프로덕션 실측(2026-08-01)**: 구포맷 **105건**(2026-03-29~05-26) · 신포맷 57건(05-26~) · 빈 배열 11건 — 구포맷이 전체의 **61%** 다. 사라질 데이터가 아니다. 유지 비용은 옵셔널 타입 1줄 + 판정 1줄로 매우 작다. | **파기 — 영구 하위호환 유지.** 제거 가치 < 리스크. 필요해지면 백필 마이그레이션이 선행돼야 한다 | 파기 확정 |
| 의존성 취약점 현황 | `pnpm-lock.yaml`·`package.json` overrides | **runtime(prod) 0건** (`pnpm audit --prod` clean). **dev 전용 1건 보류**: brace-expansion(`eslint>minimatch` 경유) — lint 타임 전용·번들 미포함이라 실질 공격면 없음. Secret: 커밋된 `.env` 0·하드코딩 키 0·secret-scanning 알림 0. code-scanning 미활성(CodeQL 미설정). 점검 경위·판단 근거는 아래 **의존성 보안 점검 이력** 참조. | brace-expansion: 상류 eslint/minimatch가 patched 2.x line 채택 시 자동 해소 | 보류(노출 없음) |
| ~~E2E `load`/`networkidle` 대기 → web-first 점진 sweep~~ | `e2e/**` | **몰입형+홈 전면 sweep 완료 (2026-07-03, #459)** — 16 spec + 공유 헬퍼 `service-navigation.ts`에서 몰입형(6개 ServiceBackground 라우트) `goto` 기본-load→`domcontentloaded`(30건), 세션 `waitForURL` 기본-load→`commit`(12건, 헬퍼 4건 포함), 몰입형/홈 `networkidle`·`load`→web-first 어서션. 감사 워크플로우가 이전 추적(#457)이 놓친 파일(`tarot-flow`·`saju-flow`·`theme-atmosphere`·`theme-effects`·헬퍼 세션 `waitForURL`)을 발굴. 적대 검증으로 `form-validation` hydration 카운트 플레이키(성별 필터 12→6 재조정 전 one-shot `.count()`) 등 5건 사전 교정. **(site) 로컬 라우트 `networkidle` 37건도 전면 제거 완료 (#460)** — settings/login/mypage/result/terms/privacy/character를 web-first(`toBeVisible`/`toContainText`/`toHaveCount`/`waitForFunction`·404는 not-found 헤딩 대기)로 전환. **`eslint-plugin-playwright` `no-networkidle` 가드 도입**(`eslint.config.mjs`, e2e 스코프, error) → 이제 `e2e/`에 `networkidle` **0건**, 신규 사용은 CI lint 차단. | ✅ 완료 | Claude |
| ~~E2E "Target closed" 크래시 (DC·MA·iOS)~~ | `playwright.config.ts`, `.github/workflows/deploy.yml` | **해소 (2026-08-01)** — 원인은 인프라가 아니라 **앱 결함 2건**이었다: 동작 줄이기 사용자의 hydration 붕괴(#525→#526·#527)와 이미지 큐 포화로 커밋되지 않는 네비게이션(#530). `Target closed`는 원인이 아니라 **테스트 예산 소진 후의 후행 증상**이다. #462가 든 "2코어/7GB → 호스트 OOM" 가설은 실측(#522→#524)으로 **반증**됐다 — 러너는 4코어/16GB, 메모리 피크 15~21%, OOM 흔적 0. 계측값·시간순 이력·폐기된 가설은 [`e2e-incidents.md`](./e2e-incidents.md)가 **정본**이며, 새 인시던트는 이 표가 아니라 그 파일에 기록한다. | ✅ 완료. **S-3(workers 상향)은 이득 없음으로 종결**(임계경로가 DC↔MA 교대). 잔여는 `navigation.spec.ts:221` flake — trace로 실패 지점 확정이 선행 | Claude |
| ~~CI E2E가 카드 이미지 전량 404 상태로 실행 (가드는 retries에 흡수)~~ | `.github/workflows/deploy.yml`, `e2e/cross-platform.spec.ts` | **해소 (2026-07-29)** — deploy.yml이 `NEXT_PUBLIC_ASSET_BASE_URL`을 설정하지 않아 `storageBase()`가 `NEXT_PUBLIC_SUPABASE_URL`(=`placeholder.supabase.co`)로 폴백했고, Supabase `card-styles` 버킷은 **2026-07-03 삭제(0객체)** 라 **CI에서 카드 아트·스킨·배경이 약 3.5주간 전량 404**였다. 무결성 가드(`cross-platform.spec.ts` 이미지 로드)가 이를 정확히 탐지했으나 `retries:2`가 재시도 통과시켜 리포트에 `1 flaky`로만 남고 CI는 green — **깨진 이미지를 잡는 가드가 있는데도 3.5주간 아무도 몰랐다.** 수정: ① `NEXT_PUBLIC_ASSET_BASE_URL: https://cdn.xzawed.xyz`를 **build 잡과 e2e 잡 양쪽에** 설정(`NEXT_PUBLIC_`은 빌드 타임 인라인이라 build 잡 누락 시 클라이언트 번들 미반영), ② 결함 탐지 가드(이미지 로드·콘솔 에러)를 `test.describe.configure({ retries: 0 })`로 분리해 1회 실패=실패로 취급. 검증: 404였던 `dark-fantasy/major/13.png`·`15.png`가 R2에서 **200 응답** 확인. | — | — |
| SonarCloud CRITICAL Cognitive Complexity | — | **0건 해소 완료** (2026-05-01). Quality Gate PASSED. 재발 시 아래 섹션 참고. | — |

### 의존성 보안 점검 이력

> 표의 셀에 덧붙이지 않는다. 새 점검은 여기에 날짜 소제목으로 **추가**한다.
> 3회차가 쌓이거나 이 절이 3,000자를 넘으면 `e2e-incidents.md`처럼 별도 파일로 승격한다.

**2026-07-28 — 1차 점검**

- **next-auth beta.32 · @auth/core 0.41.3** (Dependabot #506) — Auth.js critical 인증우회·getToken DoS·이메일정규화·OAuth PKCE 등 11건 해소
- **next 16.2.6 → 16.2.11** (patch 보안 bump, 정책상 자율 허용)
- **sharp `>=0.35.0`** (0.35.3, libvips CVE — `next>sharp` runtime 이미지 최적화)
- **postcss `^8.5.18`** (source-map path traversal — @tailwindcss/postcss)
- **esbuild override** (`<0.25.0` + `>=0.27.3 <0.28.1` — tsx·drizzle-kit)
- 전 override를 type-check·lint·tsx·build로 실증 검증. audit 9건 → 1건

**2026-07-29 — 후속 보정**

- override로 새로 들어온 esbuild가 pnpm 승인 이력이 없어 `Ignored build scripts: esbuild@0.28.1`로 postinstall(플랫폼 바이너리 준비)이 차단됨
  → `pnpm.onlyBuiltDependencies: ["esbuild"]` 명시로 해소(신규 클론·CI에서도 승인 상태 재현)
- `eslint-config-next`가 `next`와 어긋난 16.2.6 → 16.2.11 정렬
- sharp 0.35.3은 install 계열 라이프사이클 스크립트가 없어(prebuilt 바이너리) 승인 목록 불필요

**판단 근거 — brace-expansion을 왜 보류하는가**

블랭킷 override를 걸면 `@eslint/config-array`·minimatch가 brace-expansion 5.x API와 비호환이라
**lint가 크래시한다(실증).** eslint 툴링을 깨지 않고는 올릴 수 없다. 반면 노출은 lint 타임 전용이고
프로덕션 번들에 포함되지 않으며, 악용하려면 자기 eslint config에 악성 glob을 주입해야 한다.
**같은 override를 다시 시도하지 말 것.**

### post-deploy 검사가 배포를 게이트해 데드락이 났다 (2026-08-01~02)

**원인 확정.** Railway 서비스가 `checkSuites=true`로 설정돼 있어 **GitHub 체크 스위트가
전부 통과해야 배포**한다(`validCheckSuites=3` = QA Recheck·SonarCloud·Post-Deploy Smoke).

| 커밋 | Post-Deploy Smoke | Railway 배포 |
|---|---|---|
| `58f60d8` | success | **SUCCESS** |
| `9942c12` | **failure** | **SKIPPED** |
| `57fab59` | **failure** | **SKIPPED** |

`SKIPPED`는 실패가 아니라 **빌드조차 시작되지 않은 상태**다 — 배포 이벤트 0건,
`"Deployment does not have an associated build"`. 그래서 실패 로그가 없었다.

#### 방아쇠는 우리가 당겼다

#546이 스모크에 `/api/health/db` 검사를 추가했다. **배포돼야 존재하는 것을 배포 전 게이트가
검사**하므로 순환이 닫힌다.

```
배포 안 됨 → 새 엔드포인트 404 → 스모크 실패 → Railway가 배포 SKIP → 영원히 반복
```

#547이 커밋 대조를 추가해 순환을 더 단단히 만들었다(배포 전에는 반드시 불일치).

#### 교정 — post-deploy 검사는 배포를 막으면 안 된다

애초에 **방향이 반대**다: 프로덕션이 깨졌을 때 정작 고칠 배포를 못 하게 된다.
`post-deploy-smoke.yml`의 스모크 스텝을 `continue-on-error: true`로 두고, 실패는
**Issue로 알린다**(라벨 `post-deploy-smoke`, 열린 이슈가 있으면 코멘트로 누적).
체크는 통과하므로 Railway가 배포를 진행한다.

> ⚠️ **새 검사를 스모크에 추가할 때는 "배포 전에도 참인가"를 먼저 물어라.** 아니라면
> 그 검사는 배포를 막는다. 이것이 `checkSuites=true`인 환경의 구조적 제약이다.

#### 검증 (2026-08-02 02:04) — 데드락 해소 확인

`ebdf36e`(#549) 머지 후 실측:

| 커밋 | Post-Deploy Smoke | Railway |
|---|---|---|
| `3f200c0` | failure (구 워크플로) | **SKIPPED** |
| `ebdf36e` | **success** (`continue-on-error`) | **BUILDING → 배포 완료** |

프로덕션 `/api/health`가 `{"status":"ok"}`(commit 필드 없음 = #547 이전 빌드)에서
`{"status":"ok","commit":"ebdf36e"}`로 전환됐고, 스모크 **6/6 통과**(`/api/health/db` 포함).

#### 남은 잡음과 최종 교정 — `on: push` → `on: deployment_status`

`continue-on-error`는 데드락을 풀었지만 **오탐 Issue가 매 push마다 생기는 문제**가 남았다
(#551이 1호). 원인은 순서다 — Railway가 이 체크를 기다리므로 스모크는 **원리적으로 자기 커밋을
볼 수 없다**:

```
push → 스모크(커밋 불일치로 실패) → 체크 통과 → 그제서야 Railway 배포 시작
```

트리거를 **`on: deployment_status`**(state=success, environment=`xzawed / production`)로 바꿔
배포 완료 후에 돌게 하면 순환이 사라진다. Railway가 `success` 상태를 실제로 올리는 것을 확인했다
(`ebdf36e` → `success` 02:04:50Z. 반면 SKIP된 배포는 `inactive`로 끝나 발화하지 않는다).

⚠️ **`continue-on-error`는 그대로 유지한다.** 이유가 바뀌었을 뿐 필요는 남는다 — 이 워크플로가
만드는 체크 스위트는 커밋 X에 붙고, **X를 롤백 재배포할 때 다시 평가될 수 있다.** 빨간 스모크가
롤백을 막으면 "프로덕션이 깨졌는데 되돌릴 수도 없는" 최악이 된다.

⚠️ **`deployment_status` 워크플로는 기본 브랜치의 파일만 실행된다** — PR에서 시험할 수 없으므로
머지 직후 실제 발화 여부를 반드시 확인한다.

#### 그 교정에서 다시 걸린 함정 — concurrency가 자기 스모크를 죽인다

`deployment_status` 전환 1차안은 기존 `concurrency`를 그대로 뒀다가 **매 배포마다 스모크가
취소되는** 설계가 됐다. 적대 검증에서 제기돼 실측으로 확정했다.

`deployment_status`는 in_progress·success·inactive **모든 상태마다** 런을 만들고,
job-level `if`는 **런이 만들어진 뒤에** 평가되므로 그룹 합류를 막지 못한다. 그리고 Railway는
새 배포가 성공하는 **바로 그 순간** 이전 배포를 inactive로 바꾼다:

```
e9d149a  success   02:18:36Z   ← 새 배포 성공, 진짜 스모크 시작
ebdf36e  inactive  02:18:36Z   ← 같은 초
ebdf36e  inactive  02:18:38Z   ← 2초 뒤 한 번 더
```

상수 그룹 + `cancel-in-progress: true`였다면 저 inactive 런이 방금 시작한 스모크를 **0~2초 만에**
취소한다. 결과는 잡음 제거가 아니라 **커버리지 0**이고, 게다가 **취소는 `continue-on-error`로
막을 수 없어** 커밋에 `cancelled` 체크런이 영구히 남는다(= 롤백 재배포를 막는 상태). 스텝이
돌지 않았으니 Issue도 안 열려 아무도 모른다.

교정: 그룹 키에 커밋을 넣고(`post-deploy-smoke-${{ github.event.deployment.sha || github.sha }}`)
`cancel-in-progress: false`로 둔다. 다른 커밋의 이벤트는 서로를 취소할 수 없고, 같은 커밋의
후행 inactive는 취소 대신 대기한다.

> ⚠️ **워크플로 레벨 `concurrency`는 job-level `if`로 걸러질 런까지 포함한다.**
> 이벤트가 많은 트리거(`deployment_status` 등)에서 상수 그룹 + 취소는 자기 자신을 죽인다.

`checkout`·`setup-node`에도 `continue-on-error`를 붙였다. 일시적 네트워크·레이트리밋 실패
한 번이 커밋에 빨간 체크를 남기면 나중에 그 커밋으로 롤백할 수 없다.

---

### 프로덕션이 main보다 뒤처져도 알 방법이 없었다 (2026-08-01~02)

> ⚠️ **후속 (2026-08-01 16:28): 재현 확인. 코드는 무결하고 Railway 쪽 문제다.**
>
> GitHub Deployments 기록상 웹훅은 **정상 발화**했다. 문제는 배포가 `success`에 도달하지 못하는 것이다.
>
> | 커밋 | 상태 추이 |
> |---|---|
> | `9942c12` | `in_progress@11:56` → `inactive@12:00` — **success 없음** |
> | `57fab59` | `in_progress@16:17` → `inactive@16:28` — **success 없음** |
> | `58f60d8` | `in_progress` → `success` (정상) |
>
> 다른 배포의 `inactive`는 전부 `success` **뒤에** 오는 정상 교체다. 연속 2회 같은 양상이므로
> 일시적 문제가 아니다.
>
> **코드 배제 근거 (Railway와 동일 파이프라인 로컬 재현)**:
> `docker build`(같은 Dockerfile·build-arg) **exit 0**, 405MB 이미지 →
> `node server.js` + `HOSTNAME=0.0.0.0` 기동 → `/api/health` **200**.
> 빌드도 헬스체크도 통과한다.
>
> 남은 후보는 **Railway 서비스 config 드리프트**(`startCommand`·`HOSTNAME`), 리소스 한도, 인프라다.
> 확정에는 대시보드 로그가 필요하다:
> `https://railway.com/project/24bdc6b7-db99-4487-896e-d4bd68dbb6b3`


#546을 머지했는데 **하루가 지나도 Railway가 배포하지 않았다.** 신설한 `/api/health/db`가
404였는데, 그것이 **"배포 안 됨"인지 "코드 결함"인지 구분할 수단이 없었다** —
로컬 standalone 빌드로 직접 재현(`{"db":"ok","latencyMs":74}`)해 보고서야 배포 누락임을 알았다.

| 신호 | 당시 |
|---|---|
| `/api/health` | 200 — **어느 코드인지 알 수 없음** |
| post-deploy-smoke | 실패했지만 원인 불명 |
| 고정 `sleep 180` | 배포가 더 오래 걸리면 **옛 빌드를 검사** |

#### 조치

- `/api/health`가 `RAILWAY_GIT_COMMIT_SHA`(7자리)를 함께 반환한다. 비밀이 아니다
- 워크플로가 **고정 sleep 대신 커밋 반영까지 폴링**한다(최대 10분)
- 스모크가 `SMOKE_EXPECT_COMMIT`과 대조해 **격차를 실패로** 보고한다

> ⚠️ Railway 배포가 왜 누락됐는지는 **미규명**이다. Railway 대시보드 접근이 필요하며
> `pnpm verify:railway-config`는 토큰이 있어야 한다(`~/.railway/config.json`에 토큰 없음).
> 서비스 config 드리프트(`startCommand`·`HOSTNAME=0.0.0.0`)로 배포가 FAILED 되는 알려진
> 실패 모드가 있으므로 재발 시 그것부터 확인한다.

---

### 프로덕션 DB가 9일간 죽어 있었는데 모든 자동 신호가 초록이었다 (2026-07-23 ~ 08-01)

프로덕션 Supabase 프로젝트(`hkjrupbauexapmmzbcgw`)가 **일시정지(INACTIVE)** 상태였다.
그동안 세션·리딩 저장이 전부 실패했는데 **아무 신호도 울리지 않았다.**

| 신호 | 상태 | 이유 |
|---|---|---|
| `/api/health` | **200** | DB를 보지 않는다(의도적 경량 — Railway 기동 판정용) |
| `pnpm smoke:prod` | **5/5 통과** | health·홈·R2만 본다 |
| Railway 배포 | **성공** | 앱 프로세스는 멀쩡했다 |
| DLQ `failed_readings` | **0건** | ⚠️ **DLQ도 같은 DB에 쓴다** — 완전 다운이면 기록 자체가 안 남는다 |
| `parse_failures` | **0건** | 동일 |

> ⚠️ **"DLQ가 비었으니 피해가 없었다"는 틀린 추론이다.** 완전 다운이면 피해 기록도 못 남긴다.
> 유실 규모는 DB만으로 복원할 수 없고 Railway 런타임 로그(`[reading-save-failed]`)가 정본이다.

**데이터 공백만으로는 판정할 수 없다** — 이 프로젝트는 저트래픽이라 **평소에도 4~8일 공백**이
흔하다(2026-04~07 내내 관측). 즉 "며칠 데이터가 없다"는 일시정지의 증거가 되지 못한다.

#### 조치

- **`GET /api/health/db` 신설** — DB 준비 상태 전용. `pnpm smoke:prod`가 매 배포마다 검사한다
- ⚠️ **`/api/health`에는 DB 체크를 넣지 않는다.** `railway.toml`의 `healthcheckPath`가 그것을
  가리켜, DB 장애 시 **배포 롤아웃이 막히고 재기동 루프**에 빠진다. 기동 판정과 의존성 상태는
  다른 질문이므로 엔드포인트를 나눴다

#### 남은 위험

Supabase 저사양 플랜은 **비활동 시 자동 일시정지**된다. 스모크는 **배포 시에만** 돌므로,
배포가 없는 기간에 정지되면 여전히 며칠간 모른다. 주기적 외부 모니터가 필요하다(미착수).

복구 후 실측: RLS INSERT 정책 **0건 유지**(마이그 021), 마이그 022·023·025 **전부 적용**,
리딩 173건·세션 269건 무손상.

---

### 옵트인 검사는 아무도 안 누르면 죽은 검사다 (2026-08-01)

`pnpm smoke:prod --reading`(리딩 1건 SSE)은 AI 비용 때문에 `post-deploy-smoke.yml`에서
**`workflow_dispatch` + 입력 체크박스**로만 실행된다. 그래서 아무도 누르지 않는 동안
요청 본문에 `birthTime`이 빠진 채로 **항상 400**이었고, 리딩 검증 경로가 통째로 죽어 있었다.
(`TarotReadingSchema`는 `birthTime`을 nullable로 두지만 **키 자체는 필수**다.)

기본 off 정책은 유지하되(비용), 드리프트는 **무료로** 잡는다 —
`src/__tests__/smoke-request-schema.test.ts`가 스모크 요청 본문을 실제 Zod 스키마로
매 CI마다 검증한다. 스모크가 실제로 통과하는지는 여전히 수동 실행이 판정하지만,
**요청이 400으로 죽는 종류의 실패는 여기서 먼저 걸린다.**

> 같은 패턴을 다른 옵트인 검사에도 적용할 것: `pnpm eval:reading`, `pnpm verify:railway-config`.

---

### SonarCloud 이슈 현황 (2026-07-05 기준)

Quality Gate: **PASSED** | Bugs: 0 | Vulnerabilities: 0 | **Open code smell: 0건**

- **2026-05-01**: CRITICAL Cognitive Complexity 12건 해소(각 함수 로직을 명명 헬퍼로 추출).
- **2026-07-05 (PR #472·#473)**: SonarLint 연결모드 누적 백로그 **240건 → 0**. 파일별 병렬 워크플로로 **203건 수정**(행동 보존 — Readonly props·`replaceAll`·`Number.parseInt`·`.at`·`globalThis`·인지복잡도 헬퍼 추출 등), 나머지 **38건은 SonarCloud에서 Accept(Won't Fix) 처리**(프롬프트 `\n` 이스케이프·`hash |= 0` 래핑·정규식 백트래킹·`force-click`·사유 명시 조건부 `test.skip` 등 — 고치면 동작이 바뀌는 정당 skip). CI SonarCloud Quality Gate는 신규 코드만 검사하므로 백로그와 무관하게 항상 PASSED였음.

### 파기 확정 항목 (재제안 금지)

3-에이전트 병렬 분석(2026-04-26) 결과 다음 항목은 **작업 불필요**로 최종 확정. Claude가 다시 제안하거나 구현을 시도해서는 안 된다.

| 항목 | 파기 근거 | 담당 |
|------|----------|------|
| **rate-limit Redis 전환** | **이미 구현 완료** — `src/lib/rate-limit.ts`의 `checkUpstash`가 Upstash Redis(REST pipeline `INCR`+`EXPIRE NX`) 경로를 제공하며 `UPSTASH_REDIS_REST_URL` 설정 시 활성·미설정 시 in-memory Map fallback. Railway 단일 인스턴스에선 Map도 동등하므로 env는 선택 사항. `getClientIp`(x-forwarded-for 첫 번째 값)도 Railway 환경에서 정상. **재구현 금지.** | 구현 완료 (재제안 금지) |
| **SupabaseAdapter 통합 테스트** | insert/upsert 하드-throw는 올바른 설계(쓰기 실패 무음 처리 금지). CI Supabase Test DB 설정 투자 대비 효용 불충분. E2E 19개 spec이 DB 계층 간접 커버. 현행 100% 단위 테스트로 충분. | 파기 확정 (Claude 결정) |

---

## Visual Overhaul 진행 현황

카드 아트 스타일 시스템(Visual Overhaul) Phase별 상태:

| Phase | 내용 | 상태 | 비고 |
|-------|------|------|------|
| Phase 1 | AI 생성 카드 이미지 (Replicate API) — 4종 스타일 × 78장 앞면 + 뒷면 | ✅ 완료 | 341장 생성·업로드 (2026-05-14). **이후 2026-07-03 Cloudflare R2(`arcana-assets/card-styles`, `cdn.xzawed.xyz`)로 무손실 이전, Supabase `card-styles` 버킷 삭제(PR #450~#452)** |
| Phase 2 (카드 스타일) | `CardStyleSelector` UI, `useCardStyleStore`, `CardFace`/`CardBack` styleId 지원 | ✅ 완료 | 코드 구현 완료. 이미지 없으면 SVG fallback 렌더링 |
| Phase 3 (카드 스타일) | 설정 페이지 CardStyleSelector 통합, SkinGallery 연동, 테마 자동 매핑 표시 | ✅ 완료 | `/settings` 카드 스킨 섹션에 11개 버튼 통합 |
| Effect Phase 2 | 5-레이어 테마 이펙트 시스템 — `ThemeEffectEngine`, `ThemeAtmosphereLayer`, `InteractionClickParticles`, `theme-effects.css`, CSS variable 주입 | ✅ 완료 (PR #361) | 글로우·파티클·대기층·클릭 이펙트. `document.addEventListener` 방식으로 pointer-events 충돌 없음. PR #362(Phase 3)는 phase2 브랜치에 스택 후 PR #361로 main 통합 |
| Effect Phase 3 | 서비스 이펙트 + 타로 카드 텍스트 reveal — `showLabel` prop chain, `useReadingReveal`, `ServiceBackground` | ✅ 완료 (PR #361 포함) | result phase 진입 시에만 카드명 텍스트 노출. `useSession` 스토어는 persist 없는 인메모리 스토어. `useReadingReveal` hook이 `showLabel` 플래그 관리. ShuffleCeremony 캔버스 애니메이션은 PR #419에서 제거됨 |

> Phase 1 이미지 미생성 상태에서도 서비스는 SVG 스킨으로 정상 동작함.

---

## Verum 침투적 통합 제거 이력

비침투적 재도입 준비를 위해 `src/lib/verum/` SDK 및 모든 관련 코드를 제거한 작업 (2026-04-25).

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **Verum 제거** | `refactor/remove-verum-invasive-integration` / PR #163 | ✅ merged | `src/lib/verum/` 삭제, route.ts·env.ts·테스트·문서 전체 정리, CI 빌드·SonarCloud·Codecov 통과 (620→575) |

**배경**: Verum 자동 생성 PR #161 이 침투적 방식으로 코드베이스를 수정해 SonarCloud/Codecov 실패. 사용자 직접 운영 서비스이므로 향후 비침투적(외부 프록시/사이드카) 방식으로 재도입 예정. git tag `verum-removal-base`(`780bb04`) — 롤백 기준점.

---

## i18n 다국어 — 잔여 항목 (2026-05-14 기준)

모든 PR (#230~#235 포함 9건) 머지 완료. 아래는 의도적으로 보류 중인 항목이다.

| 항목 | 영역 | 상태·근거 |
|------|------|-----------|
| **AuthUser 타입 locale 필드 미포함** | `src/lib/auth/index.ts` | 현재 쿠키(`ai_locale`)가 SSOT, `profiles.locale`은 보조 동기화로 충분. cross-locale 쿼리 필요 시 별도 PR에서 `getCurrentUser()` 반환 타입 확장. |
| **`daily_cards` 테이블 locale 컬럼 의도적 미포함** | `supabase/migrations/003_daily_cards.sql` | 옵션 B 확정 — `(date, character_id)` UNIQUE 단일 사전 정책. locale 분리 시 4×용량 폭증 우려. |
| **translations 사전 SonarCloud 중복도 모니터링** | `src/i18n/translations/{ko,en,ja}/index.ts` | `shared/keys.ts` 공통 베이스로 1차 방어 중. SonarCloud `new_duplicated_lines_density` 3% 임계 모니터링 필요. |
| **외부 번역가 미사용** | — | **사용자 확정(2026-05-14)**: 외부 번역 발주 계획 없음. 현행 직역 사전으로 운영 지속. |

상세 인프라: [`../architecture/i18n.md`](../architecture/i18n.md) / 컨벤션: [`../conventions/i18n-style.md`](../conventions/i18n-style.md)

---

## 리딩·배포 후속 항목 (2026-07-06 회고 도출)

이번 세션(리딩 안정성 #480, 배포 최적화 #482~#490)에서 **해결은 됐으나 근본/부차적으로 남은 개선 항목**. 배포 안전 절차는 [`deploy-safety-guide.md`](deploy-safety-guide.md) 참고.

| 항목 | 영역 | 상태·근거 | 우선순위 |
|------|------|-----------|----------|
| ~~**리딩 스키마 중복 근본 제거**~~ | `saju-service.ts`·`shinjeom-service.ts` 프롬프트 | **✅ 해소(2026-07-07, 리딩 신뢰성 기술부채 정리)** — 간헐 무결과의 뿌리이던 `sajuSections`/`shinjeomSections`(flat 필드와 내용 중복인 과적재 스키마)를 타입·프롬프트·파서·영속·UI·i18n 전 계층에서 제거하고 `overallReading`을 정본으로 통합. `promoteNestedFields`·`persistReadingSections`·`ReadingSectionBlock`의 사주·신점 렌더도 함께 제거(타로 카드별 3-섹션 렌더는 유지). 마이그 024 컬럼은 하위 호환 위해 DROP하지 않고 유지(미사용). | — |
| ~~**parseError 실패 계량/dead-letter**~~ | reading route·`reading-saver.ts` | parseError 리딩은 저장 게이트로 미저장 + failed_readings에도 안 들어가 지배적 실패 모드가 관측 불가했다. **✅ 해소(2026-07-07)** — **①** `logReadingParseError` `[reading-parse-error]` grep 마커 + **②** DB 영속 계량 `parse_failures`(마이그 025, `recordParseFailure` best-effort, 3 라우트 배선). 재처리 큐(`failed_readings`)와 **분리**(retry 재저장 위험 차단). 집계는 db-abstraction.md §4의 SQL 쿼리(Supabase MCP/대시보드). 잔여(선택·低): 실시간 대시보드 UI(현재 온디맨드 SQL로 대체). | — |
| **배포 이미지 추가 슬림** | `public/images/{icons,backgrounds}` | standalone+캐릭터R2로 ~300MB 달성. 잔여 이미지 내 `icons`(21MB)·`backgrounds`(13MB)도 R2 이전 시 추가 축소 가능(캐릭터와 동일 패턴). 효과 대비 소규모. | 低 |
| **Railway 서비스 config 취약성** | Railway 서비스(startCommand·`HOSTNAME=0.0.0.0`) | standalone 배포 필수 2조건이 **repo가 아닌 Railway 서비스 config**에 있어 서비스 재생성 시 유실 위험. 문서화 완료 + **검증 자동화(2026-07-07): `pnpm verify:railway-config`**가 Railway API로 두 조건 assert(불일치 exit 1). ⚠️ **감지는 자동화돼 있지 않다** — `verify:railway-config`를 호출하는 워크플로우가 0건이고(2026-08-01 실측), 이 스크립트는 토큰(`RAILWAY_TOKEN`=프로젝트 / `RAILWAY_API_TOKEN`=계정) 또는 `railway login`이 필요해 현재는 **수동 실행 전용**이다. 자동화하려면 토큰을 시크릿으로 등록하고 배포 워크플로우에 스텝을 추가해야 한다(프로젝트 토큰이 권한 범위가 좁아 더 적합). | 低 |
| ~~**배포 후 자동 스모크 검증 부재**~~ | CI/배포 | 헬스체크(`/api/health`) 통과가 이미지·리딩 정상을 보장하지 않던 사각. **✅ 해소(2026-07-07)** — `.github/workflows/post-deploy-smoke.yml`이 main push마다 배포 대기 후 `pnpm smoke:prod`(health·홈 자산호스트 인라인·R2 이미지 200) 자동 실행. 리딩 스모크는 `--reading`/`pnpm eval:reading`로 온디맨드. | — |
| **로컬 Docker의 IPv6 미재현** | 로컬 검증 | 로컬 Docker는 Railway의 IPv6-우선 `/etc/hosts`를 재현 못 함 → 바인딩 이슈가 로컬에서 안 보임. 인프라 수정은 프로덕션 실측으로 확정하는 원칙 준수. 도구화 여지 낮음. | 低 |

> 조사용으로 Railway에 SSH 키(`claude-railway-debug`) 등록 + 로컬 `~/.ssh/config`에 `StrictHostKeyChecking accept-new` 추가 상태. 향후 배포 디버깅에 유용하나 불필요 시 제거 가능.
