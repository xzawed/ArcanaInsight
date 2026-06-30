# 미구현 기능 및 기술 부채

> **담당**: Claude (이슈 발굴·해결 방향 결정·파기 확정) | Codex (구현으로 해결 가능한 이슈 처리)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

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
| 커버리지 측정 범위 협소 | `vitest.config.ts` coverage.include | whitelist 방식. **B-4 점진 확장(2026-06-30)**: 1차 `time-utils`·`guest-sessions`·`reading-saver`, 2차 `character-context`(stmts 100%) 추가 — 측정 statements 1450→1550, 임계값 불변 유지. 잔여 `postgres-adapter`(DB_PROVIDER=postgres 경로)는 stmts 83%·branch 70%(`as any` upsert/에러 분기 미커버)로 추가 시 게이트 하회 → 테스트 보강 선행 필요. | postgres-adapter 테스트 보강 후 추가, 또는 exclude 방식 전환 | Claude |
| **B: parseError 리딩 영속화 / resume** | `app/api/{tarot,saju,shinjeom}/reading\|message/route.ts`, `mypage-queries.ts` | parseError(잘림/파싱실패) 시 리딩 미저장 + 세션 in_progress 잔존 → mypage 누락. **단 `.claude/rules/services.md`가 parseError=의도적 미저장(빈 결과 페이지 방지)을 명문화** — 단순 강제 저장은 회귀 위험. 데이터상 in_progress 대부분은 정상 이탈(세션이 카드선택 화면 진입 시 생성)이라 영향 부차적. | resume/재시도 UX 별도 설계 후 처리 (강제 저장 금지) | Claude |
| ~~**C: 리딩 저장 fire-and-forget 관측성**~~ | `reading route`, `lib/db/reading-saver.ts` | **해소 (2026-06-30, A-1)** — `logReadingSaveFailure`가 `[reading-save-failed]` 단일 마커로 4개 저장 실패를 구조적 로깅(grep·알림 가능). 타로/사주/신점최종 저장을 `await`해 `saved:true/false` SSE 시그널 전송(결과는 `done`으로 선전송하여 가용성 유지). `fetchSSEStream`에 하위호환 `onSaveStatus` capability 추가. 설계: [`../superpowers/specs/2026-06-30-reading-save-observability-design.md`](../superpowers/specs/2026-06-30-reading-save-observability-design.md) | 잔여(후속 PR): dead-letter 자동 재처리 + 클라이언트 `saveStatus` UI 힌트 | Claude |
| ~~**INSERT `WITH CHECK(true)` RLS 정책 7종**~~ | `sessions·readings·saju/shinjeom_readings·session_cards·daily_cards·shinjeom_messages` | **해소 완료 (migration 021, prod 적용 2026-06-24)** — 7테이블 병렬 심층 검증으로 anon/쿠키 클라이언트 INSERT 경로 부재 확인(모든 쓰기 getAdminDb=service_role) 후 `FOR INSERT WITH CHECK (true)` 정책 7종 제거. 적용 결과: 잔존 INSERT 정책 0행, service_role INSERT 성공·anon INSERT 차단(42501) 검증. ⚠️ 운영 shinjeom 정책이 파일 기준명(`shinjeom_*_insert`)이 아닌 `Anyone can insert shinjeom *`로 out-of-band 드리프트되어 있어 021 파일에 실측명 DROP 2종 추가(멱등 보정). | — | — |
| `postgres-adapter.ts` Drizzle `as any` 잔존 6건 | `src/lib/db/postgres-adapter.ts` | `.values(data as any)`·`.set(data as any)`·upsert SET 절·claim userId 등 6건(110·119·128·149·153·171행) — Drizzle `InferInsertModel`과 `DbClient` 제네릭 구조적 불일치. **3-에이전트 심층 검토 후 파기 확정(2026-04-26)**: 런타임 버그 없음, PostgreSQL 제약이 타입 검증 대체, 재설계 비용 불합리. | PostgresAdapter 전면 재설계 시 처리 (현시점 불필요) | 파기 확정 |
| 타로 `interpretation` 레거시 필드 (하위호환 fallback) | `src/services/tarot/tarot-service.ts`, `src/components/tarot/CardInterpretationList.tsx` | 프리미엄 3-섹션(symbolism/situation/action) 도입 후 구포맷 저장 리딩 표시 전용 fallback. 신규 리딩은 미사용. 즉시 제거 시 과거 저장 리딩 표시 깨짐. | 구포맷 저장 데이터 소멸(충분 기간 경과) 확인 후 필드·렌더 제거 검토 | Claude |
| esbuild dev 서버 취약점 (Dependabot low) | `pnpm-lock.yaml` (drizzle-kit→@esbuild-kit→esbuild 0.18.20) | **보류(노출 없음, 2026-06-30)** — 0.18.20이 deprecated `@esbuild-kit/core-utils`에 ~0.18 API로 고정돼 override 시 drizzle-kit 파손. dev 전용 + esbuild dev 서버(`--serve`) 미사용으로 실제 노출 없음. ws(high)·@babel/core(low)는 pnpm.overrides로 해소함. | drizzle-kit 상류가 @esbuild-kit 의존 제거 시 자동 해소 | 보류 |
| SonarCloud CRITICAL Cognitive Complexity | — | **0건 해소 완료** (2026-05-01). Quality Gate PASSED. 재발 시 아래 섹션 참고. | — |

### SonarCloud CRITICAL 이슈 현황 (2026-05-01 기준)

Quality Gate: **PASSED** | Bugs: 0 | Vulnerabilities: 0 | CRITICAL: **0건**

**2026-05-01 멀티 에이전트 정리 세션에서 12건 전부 해소 완료.**  
해소 방식: 각 함수에서 로직을 명명된 헬퍼 함수로 추출 (파일 내부, export 없음).

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
| Phase 1 | AI 생성 카드 이미지 (Replicate API) — 4종 스타일 × 78장 앞면 + 뒷면 | ✅ 완료 | 341장 생성 및 Supabase Storage(`card-styles` 버킷) 업로드 완료 (2026-05-14) |
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
