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
| rate-limit Redis 미설정 | `src/lib/rate-limit.ts` | `UPSTASH_REDIS_REST_URL` 미설정 시 in-memory fallback 동작 | Railway에서 Upstash 연결 설정 시 분산 처리 활성화 |
| SupabaseAdapter 통합 테스트 부재 | `src/lib/db/supabase-adapter.ts` | mock 체인이 자기충족적, 실제 Supabase 응답 미검증 | 통합 테스트 환경 구축 후 처리 |
| **Google Fonts CDN 로컬 빌드 실패** | `src/app/layout.tsx` | Windows 개발환경에서 `next/font/google` 빌드 시 fonts.gstatic.com 접속 불가 → `pnpm build` 항상 실패 | 로컬 폰트(self-hosted) 전환 또는 Next.js `localFont` 사용. 현재 임시 조치: pre-push 빌드 실패 경고만 출력, CI 빌드로 최종 검증 |

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

## SonarCloud Quality Gate 수정 이력

| PR | 번호 | 상태 | 내용 |
|----|------|------|------|
| **Q1** | PR #148 | ✅ merged | E2E cross-platform.spec.ts testPaths miko/default.jpg → nukki/*.png (PR-K 누락 수정) |
| **Q3** | PR #149 | ✅ merged | Reliability Bug 2개(접근성), Security Hotspot 2개(ReDoS regex·Math.random) 해소 → Quality Gate Passed |
