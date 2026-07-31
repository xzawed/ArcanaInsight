# CI/CD 파이프라인

GitHub Actions → Railway 자동 배포 파이프라인 설명입니다.

---

## CI 워크플로우 5개

### 1. `deploy.yml` — PR CI (lint → build → E2E)

**트리거**: PR → main

```
jobs:
  static  — Lint & Type Check  (pnpm lint && pnpm type-check)
  unit    — Unit Tests          (pnpm test:coverage — Vitest, artifact 7일 보존) ← static과 병렬
  build   — Production Build    (pnpm build, needs: static)
              └─ .next/cache GHA 캐시 재사용 → warm build 30-70% 단축
              └─ artifact에 .next/cache/** 제외 (E2E 전송 비용 감소)
  e2e     — E2E matrix          (Desktop Chrome + Mobile Android, needs: build만)
              └─ unit 완료 대기 없이 build 완료 즉시 시작
```

`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 환경변수가 모든 워크플로우에 전역 적용되어 있습니다.

- 4개 job(static, unit, build, e2e matrix) — e2e는 `strategy.matrix`로 Desktop/Android 병렬 실행
- branch protection 필수 체크: `Lint & Type Check`, `Production Build`, `E2E — Desktop Chrome`, `E2E — Mobile Android`
- E2E 실패 → 스크린샷·비디오 artifact **7일** 보존
- **GitHub Free 플랜**: 월 2,000분 한도, 예상 사용 ~100분

### 2. `weekly-qa.yml` — 주간 QA

**트리거**: 매주 토요일 09:00 KST (Cron)

```
jobs:
  quality-check — Lint & Type Check & Build
                    └─ .next/cache GHA 캐시 재사용
  e2e (matrix)  — Desktop Chrome + Mobile Android + Mobile iOS (WebKit)
                    └─ matrix.browser로 chromium/webkit 분기 처리
- artifact 30일 보존
- 실패 시 GitHub Issue 자동 생성 (`bug`, `qa` 라벨)
```

### 3. `qa-recheck.yml` — QA 자동 재검증

**트리거**: main push 시 열린 QA Issue 감지

```
흐름:
  main push → QA Issue 열려있는지 확인
    → 있으면: E2E 3개 디바이스 재실행
      → 통과: Issue 자동 닫기
      → 실패: Issue 유지 (수동 조치 필요)
```

### 4. `docs-sync.yml` — 문서 정합성

**트리거**: PR마다 실행

```
pnpm exec tsx scripts/check-env-docs.ts        # env-variables.md 정합성
pnpm exec tsx scripts/check-doc-links.ts       # docs 상대 링크 검증
pnpm exec tsx scripts/check-translation-keys.ts  # i18n 번역 키 drift 검출
```

> **sync-test-count**: 테스트 실행이 너무 느려 PR CI에서 제외. 로컬 수동 실행만: `pnpm exec tsx scripts/sync-test-count.ts --check`

### 5. `sonar.yml` — SonarCloud 코드 품질 분석

**트리거**: PR → main 및 main push (`.md`·`docs/`·`n8n/` 변경 제외)

```
pnpm test:coverage   # Vitest + lcov 커버리지 생성
→ SonarCloud Scan    # 코드 품질·커버리지 분석 및 PR 코멘트
→ Codecov 업로드     # coverage/lcov.info (unit flag)
```

- `sonar-coverage-report` artifact 14일 보존 (lcov.info, coverage-summary.json, junit.xml)

---

## Railway 자동 배포

**트리거**: main 브랜치 push → Railway 자동 빌드+배포

```
설정 파일: railway.toml (dockerfile 빌더 — Next.js standalone 멀티스테이지, startCommand=node server.js, healthcheckPath=/api/health)
GitHub Secrets 필요:
  RAILWAY_TOKEN       Railway API 토큰
  RAILWAY_SERVICE_ID  Railway 서비스 ID
```

### 롤백 방법

Railway 대시보드 → Deployments → 이전 배포 클릭 → "Redeploy"

또는 DB_PROVIDER 전환 롤백 (재배포 불필요):
```
Railway 환경변수: DB_PROVIDER=supabase (즉시 적용)
```

---

## Branch Protection (GitHub Settings 수동 설정)

`main` 브랜치에 branch protection rule 적용:

| 설정 | 값 |
|------|-----|
| Required status checks | `Lint & Type Check`, `Production Build`, `E2E — Desktop Chrome`, `E2E — Mobile Android` |
| Require branches to be up to date | ✓ |
| Restrict pushes | main에 직접 push 금지 (PR만 허용) |

→ CI 실패 시 main 머지 자체가 차단되어 Railway 배포도 자동으로 방어됨

### Dependabot PR의 시크릿 제한 ⚠️

Dependabot이 만든 PR의 워크플로는 **저장소 Secrets에 접근하지 못한다**(GitHub 보안 정책). 따라서 Grok/Supabase 키가 플레이스홀더(`pl***ey`)로 주입되어 AI·DB 호출이 실패하고, 이로 인해 `E2E — Mobile Android` 같은 레이아웃·스크롤 타이밍 민감 테스트가 **실제 코드 문제 없이도 실패**할 수 있다(Desktop Chrome은 통과). 이때는 시크릿이 포함된 로컬 Docker E2E([`e2e-testing.md`](../tests/e2e-testing.md))로 해당 테스트 통과를 확인한 뒤 수동 머지한다. (2026-06-02 vitest 4 업그레이드 PR #423 사례)

---

## E2E 상세 실행 가이드

E2E 실행 방법, Docker 스크립트, 디바이스 프로필:
→ [`e2e-testing.md`](../tests/e2e-testing.md)

---

## QA 자동 루프 흐름도

```
토요일 09:00 KST
  └─ weekly-qa.yml 실행 (3개 디바이스)
       ├─ 통과: 정상 종료
       └─ 실패: GitHub Issue 자동 생성 (`bug`, `qa` 라벨)
            └─ main push 감지 시 (qa-recheck.yml)
                 └─ E2E 재실행
                      ├─ 통과: Issue 자동 닫기
                      └─ 실패: Issue 유지 → 수동 조치
```

---

## n8n 자동화 (Phase 3)

워크플로우 JSON 파일 및 상세 가이드: `n8n/README.md`

→ 모니터링·알림 자동화 상세: [`../operations/monitoring.md`](../operations/monitoring.md)

## SonarCloud ↔ Vitest 정합 검증

`sonar-project.properties` 변경 시 `vitest.config.ts` `coverage.include`와 정합 확인 필수:
- vitest include 항목이 sonar exclusions에 들어가면 SonarCloud 분모에서 빠져 측정 불일치 발생 (PR-A 정합성 핫픽스 사례)
- 측정 안 할 파일은 vitest exclude + sonar exclusions 양쪽 모두 명시
- 측정할 파일은 vitest include + sonar exclusions에서 제외

상세: [`../conventions/i18n-style.md`](../conventions/i18n-style.md) §SonarCloud
