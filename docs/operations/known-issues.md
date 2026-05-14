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
| 커버리지 측정 범위 협소 | `vitest.config.ts` coverage.include | whitelist 방식, 전체 코드의 일부만 측정 | include 확장 또는 exclude 방식 전환 시 처리 | Claude |
| `postgres-adapter.ts` Drizzle `as any` 잔존 5건 | `src/lib/db/postgres-adapter.ts` | `.values(data as any)`·`.set(data as any)`·upsert SET 절 등 — Drizzle `InferInsertModel`과 `DbClient` 제네릭 구조적 불일치. **3-에이전트 심층 검토 후 파기 확정(2026-04-26)**: 런타임 버그 없음, PostgreSQL 제약이 타입 검증 대체, 재설계 비용 불합리. | PostgresAdapter 전면 재설계 시 처리 (현시점 불필요) | 파기 확정 |
| SonarCloud CRITICAL Cognitive Complexity | — | **0건 해소 완료** (2026-05-01). Quality Gate PASSED. 재발 시 아래 섹션 참고. | — |

### SonarCloud CRITICAL 이슈 현황 (2026-05-01 기준)

Quality Gate: **PASSED** | Bugs: 0 | Vulnerabilities: 0 | CRITICAL: **0건**

**2026-05-01 멀티 에이전트 정리 세션에서 12건 전부 해소 완료.**  
해소 방식: 각 함수에서 로직을 명명된 헬퍼 함수로 추출 (파일 내부, export 없음).

### 파기 확정 항목 (재제안 금지)

3-에이전트 병렬 분석(2026-04-26) 결과 다음 항목은 **작업 불필요**로 최종 확정. Claude가 다시 제안하거나 구현을 시도해서는 안 된다.

| 항목 | 파기 근거 | 담당 |
|------|----------|------|
| **rate-limit Redis 전환** | Railway 단일 인스턴스에서 in-memory Map이 Redis와 동등. 서비스 규모(일 수천 건, 공격 대상성 낮음)에서 배포 시 카운터 초기화는 허용 수준. Upstash는 트래픽 급증 시 선택적 추가. `getClientIp`(x-forwarded-for 첫 번째 값)도 Railway 환경에서 정상. | 파기 확정 (Claude 결정) |
| **SupabaseAdapter 통합 테스트** | insert/upsert 하드-throw는 올바른 설계(쓰기 실패 무음 처리 금지). CI Supabase Test DB 설정 투자 대비 효용 불충분. E2E 19개 spec이 DB 계층 간접 커버. 현행 100% 단위 테스트로 충분. | 파기 확정 (Claude 결정) |

---

## Visual Overhaul 진행 현황

카드 아트 스타일 시스템(Visual Overhaul) Phase별 상태:

| Phase | 내용 | 상태 | 비고 |
|-------|------|------|------|
| Phase 1 | AI 생성 카드 이미지 (Replicate API) — 4종 스타일 × 78장 앞면 + 뒷면 | ✅ 완료 | 351장 생성 및 Supabase Storage(`card-styles` 버킷) 업로드 완료 (2026-05-14) |
| Phase 2 (카드 스타일) | `CardStyleSelector` UI, `useCardStyleStore`, `CardFace`/`CardBack` styleId 지원 | ✅ 완료 | 코드 구현 완료. 이미지 없으면 SVG fallback 렌더링 |
| Phase 3 (카드 스타일) | 설정 페이지 CardStyleSelector 통합, SkinGallery 연동, 테마 자동 매핑 표시 | ✅ 완료 | `/settings` 카드 스킨 섹션에 11개 버튼 통합 |
| Effect Phase 2 | 5-레이어 테마 이펙트 시스템 — `ThemeEffectEngine`, `ThemeAtmosphereLayer`, `InteractionClickParticles`, `theme-effects.css`, CSS variable 주입 | ✅ 완료 (PR #361) | 글로우·파티클·대기층·클릭 이펙트. `document.addEventListener` 방식으로 pointer-events 충돌 없음. PR #362(Phase 3)는 phase2 브랜치에 스택 후 PR #361로 main 통합 |
| Effect Phase 3 | 서비스 이펙트 + 타로 카드 텍스트 reveal — `showLabel` prop chain, `useReadingReveal`, `ShuffleCeremony` motion trail, `ServiceBackground` | ✅ 완료 (PR #361 포함) | result phase 진입 시에만 카드명 텍스트 노출. `useSession` 스토어는 persist 없는 인메모리 스토어. `useReadingReveal` hook이 `showLabel` 플래그 관리 |

> Phase 1 이미지 미생성 상태에서도 서비스는 SVG 스킨으로 정상 동작함.

---

## Verum 침투적 통합 제거 이력

비침투적 재도입 준비를 위해 `src/lib/verum/` SDK 및 모든 관련 코드를 제거한 작업 (2026-04-25).

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **Verum 제거** | `refactor/remove-verum-invasive-integration` / PR #163 | ✅ merged | `src/lib/verum/` 삭제, route.ts·env.ts·테스트·문서 전체 정리, CI 빌드·SonarCloud·Codecov 통과 (620→575) |

**배경**: Verum 자동 생성 PR #161 이 침투적 방식으로 코드베이스를 수정해 SonarCloud/Codecov 실패. 사용자 직접 운영 서비스이므로 향후 비침투적(외부 프록시/사이드카) 방식으로 재도입 예정. git tag `verum-removal-base`(`780bb04`) — 롤백 기준점.

---

## i18n 다국어 — 미해결·후속 PR 의존 (2026-05-06 multi-agent 감사)

| 항목 | 영역 | 상태·근거 |
|------|------|-----------|
| **AuthUser 타입 locale 필드 미포함** | `src/lib/auth/index.ts` | PR-4 예정. 현재는 쿠키(`ai_locale`)가 SSOT, `profiles.locale`은 보조 동기화. cross-locale 쿼리 필요 시 PR-4에서 `getCurrentUser()` 반환 타입 확장. |
| **`daily_cards` 테이블 locale 컬럼 의도적 미포함** | `supabase/migrations/003_daily_cards.sql` | 옵션 B 확정 — `(date, character_id)` UNIQUE 단일 사전 정책. locale 분리 시 4×용량 폭증. 표시 시점 locale 분리는 PR-3·PR-5에서 처리. |
| **PR-2 사전 정의됨, 페이지 미적용 i18n 키 19개** | `src/i18n/translations/ko/index.ts` (`home.*` 8 + `settings.*` 11) | PR-2에서 사전만 정의됨 (정의 자체는 정상). 페이지 코드(`src/app/page.tsx`·`src/app/settings/page.tsx`) `t()` 적용은 PR-3 영역. SharedKeys 타입은 모든 locale 강제하므로 정의됨 미사용 키도 타입 안전 유지. |
| **translations 사전 SonarCloud 중복도 모니터링** | `src/i18n/translations/{ko,en,ja}/index.ts` | 현재 4 파일(인덱스+공유키+3 locale). PR-3·PR-5에서 카드·캐릭터 데이터가 추가되면 중복도 누적 위험. `shared/keys.ts` 공통 베이스 + `flatten()` 헬퍼로 1차 방어 중. SonarCloud `new_duplicated_lines_density` 3% 임계 모니터링 필요. |
| **외부 번역가 발주 시점 미결정** | `docs/i18n/glossary.md`·`character-voice-guide.md` | PR-3 진입 시점에 발주 권장 (사용자 결정). 발주 자료는 PR-3·PR-4 시 작성될 예정. 현재 영어 사전은 1차 임시 직역 placeholder. |

상세 인프라: [`../architecture/i18n.md`](../architecture/i18n.md) / 컨벤션: [`../conventions/i18n-style.md`](../conventions/i18n-style.md)
