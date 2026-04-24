# 미구현 기능 및 기술 부채

> **정본 위치**: 이 파일이 단일 정본. `CLAUDE.md`의 관련 섹션은 이 파일을 링크로 대체할 예정(PR-5).

---

## 미구현 기능

알고 있지만 아직 구현하지 않은 기능. Claude가 실수로 구현하거나 사용자에게 "있다"고 잘못 안내하지 않도록 명시한다.

| 기능 | 위치 | 현재 상태 | 비고 |
|------|------|----------|------|
| 신점 결과 공유 페이지 | `app/shinjeom/result/[id]/` | 미구현 | mypage에서 링크 비활성화됨 |
| `useFavoriteCharacter` DB_PROVIDER 적용 | `hooks/useFavoriteCharacter.ts` | Supabase 직접 사용 | postgres 모드 전환 시 수정 필요 |
| GenderFilter 홈 노출 | `components/home/GenderFilter.tsx` | 컴포넌트 존재, `page.tsx` 미사용 | — |
| StatsCounter 홈 노출 | `components/home/StatsCounter.tsx` | 컴포넌트 존재, `page.tsx` 미사용 | — |
| ReviewCarousel 홈 노출 | `components/home/ReviewCarousel.tsx` | 컴포넌트 존재, `page.tsx` 미사용 | — |

---

## 기술 부채

의도적으로 아직 처리하지 않은 기술적 한계. Claude가 실수로 수정하거나 이미 검토된 방법을 다시 제안하지 않도록 명시한다.

| 항목 | 파일 | 현황 | 해결 조건 |
|------|------|------|----------|
| `useFavoriteCharacter` Supabase 직접 사용 | `hooks/useFavoriteCharacter.ts` | DB_PROVIDER 추상화 미적용 | postgres 모드 전환 시 처리 |
| miko·seonhwa JPG 레거시 경로 | `public/images/characters/miko/`, `seonhwa/` | nukki/ PNG 미전환 | 이미지 재생성 + 코드 수정 필요 |
| `generate-character-images.mjs` 구버전 잔존 | `scripts/` | v2로 대체됨, 삭제 미완료 | 정리 작업 시 삭제 가능 |
| `reading-saver.ts` 미구현 — inline fire-and-forget 산재 | `app/api/tarot/reading/route.ts` 외 2곳 | DB 저장 로직 3곳에 inline 산재, 추상화 미완료 | PR D에서 `src/lib/db/reading-saver.ts` 신설 후 통합 |
| 커버리지 측정 범위 협소 | `vitest.config.ts` coverage.include | 전체 코드의 22.2%만 측정 대상 | PR E에서 include 확장 + 임계값 상향 |

---

## 테스트 개선 6-PR 계획 진행 상태

| PR | 브랜치/번호 | 상태 | 완료 기준 |
|----|------------|------|----------|
| **A** | `fix/security-share-token-auth` / PR #119 | ✅ merged | Drizzle $defaultFn 2곳, migration 011, assertReadingAccess() |
| **B** | `feat/pr-b-api-unit-test-infra` / PR #122 | ✅ merged | vitest exclude 완화, mock 헬퍼 4개, 세션 라우트 3개 테스트 (469→504) |
| **C** | `feat/pr-c-api-smoke-tests` / PR #123 | ✅ merged | API 스모크 테스트 8개 라우트 추가 (504→539) |
| **D** | (미시작) | pending B+C | reading-saver.ts 신설, inline 3곳 통합 |
| **E** | (미시작) | pending B+C+D | coverage.include 확장, 임계값 branches 65/functions 75/lines 75 |
| **F** | (미시작) | 선택 | 93개 우회 주석 태깅 |
