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
| 타로 `interpretation` 레거시 필드 (하위호환 fallback) | `src/services/tarot/tarot-service.ts`, `src/components/tarot/CardInterpretationList.tsx` | 프리미엄 3-섹션(symbolism/situation/action) 도입 후 구포맷 저장 리딩 표시 전용 fallback. 신규 리딩은 미사용. 즉시 제거 시 과거 저장 리딩 표시 깨짐. | 구포맷 저장 데이터 소멸(충분 기간 경과) 확인 후 필드·렌더 제거 검토 | Claude |
| 의존성 취약점 현황 (2026-07-28 보안 점검) | `pnpm-lock.yaml`·`package.json` overrides | **runtime(prod) 0건**(`pnpm audit --prod` clean). 이번 처리: **next-auth beta.32·@auth/core 0.41.3**(Dependabot #506 머지 — Auth.js critical 인증우회·getToken DoS·이메일정규화·OAuth PKCE 등 11건 해소), **next 16.2.6→16.2.11**(patch 보안 bump, 정책상 자율 허용), **sharp `>=0.35.0`**(0.35.3, libvips CVE — `next>sharp` runtime 이미지최적화), **postcss `<8.5.18: ^8.5.18`**(source-map path traversal — @tailwindcss/postcss), **esbuild override**(`<0.25.0`+`>=0.27.3 <0.28.1` — tsx·drizzle-kit, tsx 동작 검증). 전 override는 type-check·lint·tsx·build로 실증 검증. **후속(2026-07-29)**: override로 새로 들어온 esbuild가 pnpm 승인 이력이 없어 `Ignored build scripts: esbuild@0.28.1`로 postinstall(플랫폼 바이너리 준비)이 차단됨 → `pnpm.onlyBuiltDependencies: ["esbuild"]` 명시로 해소(신규 클론·CI에서도 승인 상태 재현). `eslint-config-next`도 `next`와 어긋난 16.2.6 → 16.2.11 정렬. sharp 0.35.3은 install 계열 라이프사이클 스크립트가 없어(prebuilt 바이너리) 승인 목록 불필요. audit 9→1건. 잔여 **dev 전용 1건(보류·노출 없음)**: brace-expansion(`eslint>minimatch` 경유) — **블랭킷 override 시 `@eslint/config-array`/minimatch가 brace-expansion 5.x API 비호환으로 lint 크래시(실증)** → eslint 툴링을 깨지 않고는 불가. lint 타임 전용·프로덕션 번들 미포함·악용에 자기 eslint config에 악성 glob 주입 필요 → 실질 공격면 없음. ws·@babel/core·js-yaml은 기존 overrides로 해소. **Secret: 커밋된 `.env` 0·하드코딩 키 0·secret-scanning 알림 0. code-scanning 미활성(CodeQL 미설정).** | brace-expansion: 상류 eslint/minimatch가 patched 2.x line 채택 시 자동 해소 | 보류(노출 없음) |
| ~~E2E `load`/`networkidle` 대기 → web-first 점진 sweep~~ | `e2e/**` | **몰입형+홈 전면 sweep 완료 (2026-07-03, #459)** — 16 spec + 공유 헬퍼 `service-navigation.ts`에서 몰입형(6개 ServiceBackground 라우트) `goto` 기본-load→`domcontentloaded`(30건), 세션 `waitForURL` 기본-load→`commit`(12건, 헬퍼 4건 포함), 몰입형/홈 `networkidle`·`load`→web-first 어서션. 감사 워크플로우가 이전 추적(#457)이 놓친 파일(`tarot-flow`·`saju-flow`·`theme-atmosphere`·`theme-effects`·헬퍼 세션 `waitForURL`)을 발굴. 적대 검증으로 `form-validation` hydration 카운트 플레이키(성별 필터 12→6 재조정 전 one-shot `.count()`) 등 5건 사전 교정. **(site) 로컬 라우트 `networkidle` 37건도 전면 제거 완료 (#460)** — settings/login/mypage/result/terms/privacy/character를 web-first(`toBeVisible`/`toContainText`/`toHaveCount`/`waitForFunction`·404는 not-found 헤딩 대기)로 전환. **`eslint-plugin-playwright` `no-networkidle` 가드 도입**(`eslint.config.mjs`, e2e 스코프, error) → 이제 `e2e/`에 `networkidle` **0건**, 신규 사용은 CI lint 차단. | ✅ 완료 | Claude |
| ~~E2E "Target closed" 크래시 (DC·MA·iOS)~~ | `playwright.config.ts`, `public/images/characters/*` | **근본원인 규명·수정 (2026-07-04, #462)** — 만성 "Target page/context/browser has been closed"(Weekly QA #461)는 테스트 버그가 아니라 **호스트 OOM**: `workers:2`+`fullyParallel`이 브라우저 2개 + `pnpm start` Next 서버 + cold-cache sharp 이미지 최적화(원본 2816×1536 84장 → 16.5MiB 비트맵 디코드)를 한 2코어/7GB ubuntu 러너에 공존 → OOM-killer가 브라우저 프로세스 kill. **chromium·webkit 양쪽 재현 = 엔진 무관** ∴ `--disable-dev-shm-usage`는 no-op·반증(Playwright 기본 적용·bare VM shm는 GB급·webkit 무시). 4-각도 진단 워크플로우로 확정. **수정: CI `workers: 2→1`**(chromium DC·MA 해소, #462). **webkit(iOS)은 workers:1으로도 무거운 홈 이미지 테스트에서 크래시**(webkit 메모리-취약) → `cross-platform:60`(홈 이미지 로드 검사)을 **Desktop Chrome 전용 스코프**(깨진 이미지는 엔진 무관) + `daily-card` webkit `_rsc` 프리페치 benign 에러 필터(PR #464, 이슈 #463). #465는 비로그인 `GET /api/profile/favorite-character`를 401→200(`{characterId:null}`)로 바꿔 몰입형 진입 콘솔 401 제거(POST는 401 유지). 부수 perf: 테마 아이콘 `unoptimized` 제거(653KB→webp). ⚠️ 캐릭터 이미지 다운스케일은 **재검토 후 보류** — `nukki-enhanced` 2816×1536은 오독이 아니라 **고DPI 큰 표시(캐릭터 상세 모바일 100vw·세션)를 위한 의도된 2x 보정본**(docs/conventions/image-assets.md). 1408로 낮추면 고DPI 표시 품질 저하 → 균일 품질 요구와 충돌. CI 메모리는 workers:1로 해소되므로 에셋 변경 불필요. | ✅ 완료 (에셋 변경 없이 config로 해소) | Claude |
| ~~CI E2E가 카드 이미지 전량 404 상태로 실행 (가드는 retries에 흡수)~~ | `.github/workflows/deploy.yml`, `e2e/cross-platform.spec.ts` | **해소 (2026-07-29)** — deploy.yml이 `NEXT_PUBLIC_ASSET_BASE_URL`을 설정하지 않아 `storageBase()`가 `NEXT_PUBLIC_SUPABASE_URL`(=`placeholder.supabase.co`)로 폴백했고, Supabase `card-styles` 버킷은 **2026-07-03 삭제(0객체)** 라 **CI에서 카드 아트·스킨·배경이 약 3.5주간 전량 404**였다. 무결성 가드(`cross-platform.spec.ts` 이미지 로드)가 이를 정확히 탐지했으나 `retries:2`가 재시도 통과시켜 리포트에 `1 flaky`로만 남고 CI는 green — **깨진 이미지를 잡는 가드가 있는데도 3.5주간 아무도 몰랐다.** 수정: ① `NEXT_PUBLIC_ASSET_BASE_URL: https://cdn.xzawed.xyz`를 **build 잡과 e2e 잡 양쪽에** 설정(`NEXT_PUBLIC_`은 빌드 타임 인라인이라 build 잡 누락 시 클라이언트 번들 미반영), ② 결함 탐지 가드(이미지 로드·콘솔 에러)를 `test.describe.configure({ retries: 0 })`로 분리해 1회 실패=실패로 취급. 검증: 404였던 `dark-fantasy/major/13.png`·`15.png`가 R2에서 **200 응답** 확인. | — | — |
| SonarCloud CRITICAL Cognitive Complexity | — | **0건 해소 완료** (2026-05-01). Quality Gate PASSED. 재발 시 아래 섹션 참고. | — |

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
| **Railway 서비스 config 취약성** | Railway 서비스(startCommand·`HOSTNAME=0.0.0.0`) | standalone 배포 필수 2조건이 **repo가 아닌 Railway 서비스 config**에 있어 서비스 재생성 시 유실 위험. 문서화 완료 + **검증 자동화(2026-07-07): `pnpm verify:railway-config`**가 Railway API로 두 조건 assert(불일치 exit 1). 자동 *설정*은 아니라 재생성 시 수동 교정 필요하나 감지는 자동화됨. | 低 |
| ~~**배포 후 자동 스모크 검증 부재**~~ | CI/배포 | 헬스체크(`/api/health`) 통과가 이미지·리딩 정상을 보장하지 않던 사각. **✅ 해소(2026-07-07)** — `.github/workflows/post-deploy-smoke.yml`이 main push마다 배포 대기 후 `pnpm smoke:prod`(health·홈 자산호스트 인라인·R2 이미지 200) 자동 실행. 리딩 스모크는 `--reading`/`pnpm eval:reading`로 온디맨드. | — |
| **로컬 Docker의 IPv6 미재현** | 로컬 검증 | 로컬 Docker는 Railway의 IPv6-우선 `/etc/hosts`를 재현 못 함 → 바인딩 이슈가 로컬에서 안 보임. 인프라 수정은 프로덕션 실측으로 확정하는 원칙 준수. 도구화 여지 낮음. | 低 |

> 조사용으로 Railway에 SSH 키(`claude-railway-debug`) 등록 + 로컬 `~/.ssh/config`에 `StrictHostKeyChecking accept-new` 추가 상태. 향후 배포 디버깅에 유용하나 불필요 시 제거 가능.
