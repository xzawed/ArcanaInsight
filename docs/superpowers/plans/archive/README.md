# 아카이브된 구현 계획 인덱스

> 머지 완료된 PR의 사전 계획서를 보관하는 디렉토리. 활성 작업 디렉토리(`docs/superpowers/plans/`)를 깔끔하게 유지하기 위해 분리.

## 보관 정책

- 머지 완료된 PR의 계획서는 본 디렉토리로 이동한다.
- 파일 자체는 삭제하지 않는다 (의사결정 흐름·논의 맥락 보존).
- 새 계획서를 작성하면 부모 디렉토리에 위치시키고, 머지 후 본 디렉토리로 옮긴다.

## 인벤토리 (37개)

| 파일 | 작성 시점 | 주제 | 관련 PR/구현 |
|---|---|---|---|
| `01-arcana-insight-mvp.md` | 2026-03-29 | MVP 초기 구현 | 초기 릴리즈 |
| `02-character-selection-jrpg.md` | 2026-03-29 | JRPG 풍 캐릭터 선택 | GenderFilter UI로 변경 적용 |
| `03-premium-home.md` | 2026-03-29 | 프리미엄 홈 디자인 | 홈 페이지 구현 |
| `04-tarot-visual-upgrade.md` | 2026-03-29 | 타로 비주얼 강화 | 카드·셔플 UI |
| `05-card-skin-system.md` | 2026-03-31 | 카드 스킨 시스템 | 스킨 매니저·DB |
| `06-saju-service.md` | 2026-03-31 | 사주 서비스 도입 | 사주 라우트·서비스 |
| `2026-03-31-character-expansion-gender-filter.md` | 2026-03-31 | 캐릭터 확장 + 성별 필터 | 12 캐릭터 확장 |
| `2026-04-01-project-agents-6-types.md` | 2026-04-01 | 프로젝트 에이전트 6종 | `.claude/agents/` |
| `2026-04-02-saju-process-redesign.md` | 2026-04-02 | 사주 프로세스 재설계 | 사주 프롬프트·모델 |
| `2026-04-11-code-doc-cross-validation.md` | 2026-04-11 | 코드·문서 상호 검증 (구) | 정합성 도구·문서 분리 |
| `2026-04-11-db-provider-abstraction-drizzle.md` | 2026-04-11 | DB Provider 추상화 (Drizzle) | `getDb()` 어댑터 |
| `2026-04-11-db-provider-migration.md` | 2026-04-11 | DB Provider 마이그레이션 | Supabase ↔ PostgreSQL 전환 |
| `2026-04-26-railway-sonarcloud-mcp.md` | 2026-04-26 | Railway·SonarCloud MCP 연동 | MCP 자율 진단 규칙 |
| `2026-05-01-character-experience-enhancement.md` | 2026-05-01 | 캐릭터 경험 강화 | 6-mood·waiting-lines·메모리 |
| `2026-05-01-code-doc-cleanup.md` | 2026-05-01 | 코드·문서 심층 정리 (계획) | 결과는 `2026-05-01-code-doc-cleanup-result.md`(본 archive/)에 보관 |
| `2026-05-01-code-doc-cleanup-result.md` | 2026-05-01 | 코드·문서 정리 결과 기록(메타) | #426·#437·#440 후속 정리 기준점 |
| `2026-05-01-e2e-multiagent.md` | 2026-05-01 | 멀티 에이전트 E2E 전수 검증 | `scripts/e2e-full/` |
| `2026-05-01-phase1-ui-revitalization.md` | 2026-05-01 | UI 리바이탈 Phase 1 | 비주얼 FX 1차 |
| `2026-05-01-phase2-ui-revitalization.md` | 2026-05-01 | UI 리바이탈 Phase 2 | 비주얼 FX 2차 |
| `2026-05-01-visual-fx-revitalization.md` | 2026-05-01 | Visual FX 리바이탈 | 캐릭터 오라·글로우·배경 |
| `2026-05-02-shuffle-ceremony.md` | 2026-05-02 | ShuffleCeremony 도입 | `src/components/tarot/ShuffleCeremony.tsx` |
| `2026-05-05-rls-security-fix.md` | 2026-05-05 | RLS 보안 취약점 수정 | PR #219 (013·014·015 마이그레이션) |
| `2026-05-06-share-token-streaming-resilience.md` | 2026-05-06 | share_token 스트리밍 통합 | PR #221 |
| `2026-05-06-grok-i18n-completion-plan.md` | 2026-05-06 | Grok i18n 완성 계획 | i18n 다국어 |
| `2026-05-07-retrospective-quality-improvement.md` | 2026-05-07 | 회고 기반 품질 개선 | 프로세스 개선 |
| `2026-05-10-doc-audit-role-alignment.md` | 2026-05-10 | 문서 감사·역할 정렬 | 문서 정합성 |
| `2026-05-10-visual-overhaul-phase1-image-generation.md` | 2026-05-10 | Visual Overhaul P1 이미지 생성 | 카드 아트 스타일 |
| `2026-05-10-visual-overhaul-phase2-theme-effects.md` | 2026-05-10 | Visual Overhaul P2 테마 이펙트 | 테마 FX |
| `2026-05-10-visual-overhaul-phase3-service-effects.md` | 2026-05-10 | Visual Overhaul P3 서비스 이펙트 | 서비스 일러스트 |
| `2026-05-11-daily-fortune.md` | 2026-05-11 | 데일리 포춘 | daily-fortune |
| `2026-05-11-doc-full-rewrite-plan-B.md` | 2026-05-11 | 문서 전면 재작성 (Plan B) | 문서 구조 |
| `2026-05-12-userinfo-birthtime-mbti.md` | 2026-05-12 | UserInfo 생년월일시·MBTI | UserInfoForm |
| `2026-05-15-code-doc-cleanup.md` | 2026-05-15 | 전체 코드·문서 정리 (3-PR) | 문서 감사·컴포넌트 분리(#426·#437·#440) |
| `2026-05-26-premium-reading-experience.md` | 2026-05-26 | 프리미엄 리딩 경험 | PR #414·#420 |
| `2026-05-29-tarot-reading-quality.md` | 2026-05-29 | 타로 리딩 품질 | 리딩 프롬프트 |
| `i18n-consistency-fix.md` | (초기) | i18n 정합성 수정 | i18n 다국어 |
| `i18n-master-plan.md` | (초기) | i18n 마스터 플랜 | i18n 다국어 |

## 상위 디렉토리(활성 `plans/`) 현재 파일

- `docs/superpowers/plans/2026-06-26-supabase-storage-r2-migration.md` — Supabase Storage → R2 자산 이전 계획(#450·#451·#452).

> `2026-05-01-code-doc-cleanup-result.md`는 본 `archive/`로 이동되어 위 인벤토리에 포함됨(과거 상위 `plans/` 보존 항목이었음).
