# 미구현 기능 및 기술 부채

> **정본 위치**: 이 파일이 단일 정본. `CLAUDE.md`의 관련 섹션은 이 파일을 링크로 참조.

---

## 미구현 기능

알고 있지만 아직 구현하지 않은 기능. Claude가 실수로 구현하거나 사용자에게 "있다"고 잘못 안내하지 않도록 명시한다.

현재 미구현 기능 없음.

---

## 기술 부채

의도적으로 아직 처리하지 않은 기술적 한계. Claude가 실수로 수정하거나 이미 검토된 방법을 다시 제안하지 않도록 명시한다.

| 항목 | 파일 | 현황 | 해결 조건 |
|------|------|------|----------|
| 커버리지 측정 범위 협소 | `vitest.config.ts` coverage.include | whitelist 방식, 전체 코드의 일부만 측정 | include 확장 또는 exclude 방식 전환 시 처리 |
| `postgres-adapter.ts` Drizzle `as any` 잔존 4건 | `src/lib/db/postgres-adapter.ts` | `.values(data as any)`·`.set(data as any)` — Drizzle `InferInsertModel`과 `DbClient` 제네릭 구조적 불일치. **3-에이전트 심층 검토 후 파기 확정(2026-04-26)**: 런타임 버그 없음, PostgreSQL 제약이 타입 검증 대체, 재설계 비용 불합리. | PostgresAdapter 전면 재설계 시 처리 (현시점 불필요) |

### 파기 확정 항목 (재제안 금지)

3-에이전트 병렬 분석(2026-04-26) 결과 다음 항목은 **작업 불필요**로 최종 확정. Claude가 다시 제안하거나 구현을 시도해서는 안 된다.

| 항목 | 파기 근거 |
|------|----------|
| **rate-limit Redis 전환** | Railway 단일 인스턴스에서 in-memory Map이 Redis와 동등. 서비스 규모(일 수천 건, 공격 대상성 낮음)에서 배포 시 카운터 초기화는 허용 수준. Upstash는 트래픽 급증 시 선택적 추가. `getClientIp`(x-forwarded-for 첫 번째 값)도 Railway 환경에서 정상. |
| **SupabaseAdapter 통합 테스트** | insert/upsert 하드-throw는 올바른 설계(쓰기 실패 무음 처리 금지). CI Supabase Test DB 설정 투자 대비 효용 불충분. E2E 19개 spec이 DB 계층 간접 커버. 현행 100% 단위 테스트로 충분. |

---

## 테스트 개선 6-PR 계획 진행 상태

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **A** | `fix/security-share-token-auth` / PR #119 | ✅ merged | Drizzle $defaultFn 2곳, migration 011, assertReadingAccess() |
| **B** | `feat/pr-b-api-unit-test-infra` / PR #122 | ✅ merged | vitest exclude 완화, mock 헬퍼 4개, 세션 라우트 3개 테스트 (469→504) |
| **C** | `feat/pr-c-api-smoke-tests` / PR #123 | ✅ merged | API 스모크 테스트 8개 라우트 추가 (504→539) |
| **D** | `fix/sonar-badge-followup` | ✅ merged | reading-saver.ts 신설·retry 3회, tarot·saju·shinjeom 라우트 위임 (539→558) |
| **E** | PR-N (임계값 상향) | ✅ merged | branches 75/functions 85/lines 88/statements 88, 587개 |
| **F** | (미시작) | 선택 | 우회 주석 태깅 |

---

## API 헬퍼 리팩토링 D-시리즈 진행 상태

코드 중복·SonarCloud CPD 개선을 위해 4단계로 분해한 리팩토링 (2026-04-25).

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **D1** | `chore/sonar-cpd-exclusions` / PR #155 | ✅ merged | sonar.cpd.exclusions 정적 데이터·타입 파일 제외 |
| **D2** | `refactor/test-route-helpers` / PR #156 | ✅ merged | `makeStreamingRouteSetup` 헬퍼 신설 → 테스트 setup 중복 감소 |
| **D3** | `refactor/api-helpers` / PR #157 | ✅ merged | `request-utils.ts`: getClientIp·pickFields·jsonError·SSE_HEADERS 추출, API 라우트 CPD 해소 (599→606) |
| **D4** | `refactor/service-helpers` / PR #158 | ✅ merged | `circuit-breaker.ts`·`http-utils.ts` 신설, FallbackProvider·GrokProvider·ClaudeProvider 중복 제거 (606→620) |
| **Doc** | `docs/post-d-series-update` / PR #159 | ✅ merged | D-시리즈 결과 문서 반영 (ai-infrastructure·auth-abstraction·unit-testing·task-playbooks) |

---

## Verum 침투적 통합 제거 이력

비침투적 재도입 준비를 위해 `src/lib/verum/` SDK 및 모든 관련 코드를 제거한 작업 (2026-04-25).

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **Verum 제거** | `refactor/remove-verum-invasive-integration` / PR #163 | ✅ merged | `src/lib/verum/` 삭제, route.ts·env.ts·테스트·문서 전체 정리, CI 빌드·SonarCloud·Codecov 통과 (620→575) |

**배경**: Verum 자동 생성 PR #161 이 침투적 방식으로 코드베이스를 수정해 SonarCloud/Codecov 실패. 사용자 직접 운영 서비스이므로 향후 비침투적(외부 프록시/사이드카) 방식으로 재도입 예정. git tag `verum-removal-base`(`780bb04`) — 롤백 기준점.

---

## SonarCloud Quality Gate 수정 이력

| PR | 번호 | 상태 | 내용 |
|----|------|------|------|
| **Q1** | PR #148 | ✅ merged | E2E cross-platform.spec.ts testPaths miko/default.jpg → nukki/*.png (PR-K 누락 수정) |
| **Q3** | PR #149 | ✅ merged | Reliability Bug 2개(접근성), Security Hotspot 2개(ReDoS regex·Math.random) 해소 → Quality Gate Passed |
| **Q4** | PR #157 | ✅ merged | New Code Duplication 6.8% → 해소 (`src/app/api/**` CPD 제외), Codecov patch 87.50% → 100% |
