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
| SonarCloud CRITICAL Cognitive Complexity | — | **0건 해소 완료** (2026-05-01). Quality Gate PASSED. 재발 시 아래 섹션 참고. | — |

### SonarCloud CRITICAL 이슈 현황 (2026-05-01 기준)

Quality Gate: **PASSED** | Bugs: 0 | Vulnerabilities: 0 | CRITICAL: **0건**

**2026-05-01 멀티 에이전트 정리 세션에서 12건 전부 해소 완료.**  
해소 방식: 각 함수에서 로직을 명명된 헬퍼 함수로 추출 (파일 내부, export 없음).

### 파기 확정 항목 (재제안 금지)

3-에이전트 병렬 분석(2026-04-26) 결과 다음 항목은 **작업 불필요**로 최종 확정. Claude가 다시 제안하거나 구현을 시도해서는 안 된다.

| 항목 | 파기 근거 |
|------|----------|
| **rate-limit Redis 전환** | Railway 단일 인스턴스에서 in-memory Map이 Redis와 동등. 서비스 규모(일 수천 건, 공격 대상성 낮음)에서 배포 시 카운터 초기화는 허용 수준. Upstash는 트래픽 급증 시 선택적 추가. `getClientIp`(x-forwarded-for 첫 번째 값)도 Railway 환경에서 정상. |
| **SupabaseAdapter 통합 테스트** | insert/upsert 하드-throw는 올바른 설계(쓰기 실패 무음 처리 금지). CI Supabase Test DB 설정 투자 대비 효용 불충분. E2E 19개 spec이 DB 계층 간접 커버. 현행 100% 단위 테스트로 충분. |

---

## Verum 침투적 통합 제거 이력

비침투적 재도입 준비를 위해 `src/lib/verum/` SDK 및 모든 관련 코드를 제거한 작업 (2026-04-25).

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **Verum 제거** | `refactor/remove-verum-invasive-integration` / PR #163 | ✅ merged | `src/lib/verum/` 삭제, route.ts·env.ts·테스트·문서 전체 정리, CI 빌드·SonarCloud·Codecov 통과 (620→575) |

**배경**: Verum 자동 생성 PR #161 이 침투적 방식으로 코드베이스를 수정해 SonarCloud/Codecov 실패. 사용자 직접 운영 서비스이므로 향후 비침투적(외부 프록시/사이드카) 방식으로 재도입 예정. git tag `verum-removal-base`(`780bb04`) — 롤백 기준점.
