# 모니터링 및 자동화

> **담당**: Claude (알림 해석·대응 우선순위 결정) | Codex (수정 코드 구현·PR 생성)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)

주간 QA 루프와 n8n 자동화 파이프라인 설명입니다.

---

## 주간 QA 자동 루프

### 흐름

```
매주 토요일 09:00 KST (weekly-qa.yml)
  └─ E2E 3개 디바이스: Desktop Chrome + Mobile Android + Mobile iOS
       ├─ 전체 통과: 정상 종료
       └─ 일부 실패: GitHub Issue 자동 생성 (title: "🚨 주간 QA 실패 — {date}", labels: bug, qa)
            └─ main push 감지 시 (qa-recheck.yml 자동 트리거)
                 └─ E2E 재실행 (동일 3개 디바이스)
                      ├─ 전체 통과: Issue 자동 닫기 + 코멘트
                      └─ 일부 실패: Issue 유지 (수동 조치 필요)
```

### QA 실패 시 대응 절차

1. [Claude] 자동 생성된 GitHub Issue 확인 및 우선순위 판단
2. [Claude] 실패한 spec 파일 + 디바이스 조합 파악
3. [Codex] 로컬에서 재현: `pnpm test:e2e --grep "실패한 테스트명"`
4. [Codex] 수정 후 `fix/*` 브랜치에서 PR 생성
5. [Claude] PR 검토 후 머지 → `qa-recheck.yml` 자동 재실행 → Issue 자동 닫기

### Artifact 보존

- PR CI: E2E 실패 시 스크린샷·비디오 7일 보존 (unit-coverage artifact도 7일)
- 주간 QA: 전체 결과 30일 보존

---

## n8n 자동화 파이프라인

### 현황

n8n Cloud 운영 중: `https://xzawed.app.n8n.cloud`

| 워크플로우 | 파일 | 방식 | 상태 |
|-----------|------|------|------|
| Spec Tracker | `n8n/workflow-spec-tracker.json` | GitHub Webhook (실시간) | ✅ 운영 중 |
| Quality Monitor | `n8n/workflow-quality-monitor.json` | Cron 매일 09:00 | ✅ 운영 중 |
| Weekly Report | `n8n/workflow-weekly-report.json` | Cron 금요일 18:00 | ✅ 운영 중 |

### Spec Tracker

- GitHub Webhook: `https://xzawed.app.n8n.cloud/webhook/arcana-spec`
- `spec` 라벨이 붙은 Issue = SuperGrok에서 확정된 기능 스펙
- Issue 생성/수정 시 Slack/알림으로 통지

### Quality Monitor

- Supabase 직접 조회 (Grok 미사용) — 리딩 통계 모니터링
- 이상 패턴 감지 시 알림 발송
- AI 응답 품질 지표 수집

### Weekly Report

- 주간 리딩 통계 집계 및 리포트 생성
- 금요일 18:00 KST 자동 발송

### n8n 워크플로우 상세

→ `n8n/README.md`

---

## CI/CD 파이프라인 모니터링

→ [`../workflow/ci-cd.md`](../workflow/ci-cd.md)

---

## SonarCloud 코드 품질 분석

PR 및 main push 시 자동 실행 (`sonar.yml`):
- 정적 코드 분석 (버그, 취약점, 코드 스멜)
- 커버리지 추적 (lcov 포맷, `sonar.javascript.lcov.reportPaths`)
- **테스트 리포트 주의**: `sonar.testExecutionReportPaths`는 SonarCloud 전용 `<testExecutions version="1">` XML 형식만 허용 — Vitest/Playwright의 JUnit `<testsuites>` 포맷과 비호환

## Codecov 커버리지 추적

- PR마다 커버리지 변화 코멘트 자동 게시
- `unit` flag로 단위 테스트 커버리지만 추적
- 임계값: branches 90% / functions 97% / lines·statements 98%

---

## MCP 자율 진단

Claude가 작업 중 이상 감지 시 사용자 개입 없이 직접 진단 데이터를 수집한다. `~/.claude/settings.json`의 `mcpServers`에 railway(npx)·sonarcloud(Docker) 등록.

### SonarCloud (REST API 기본)

MCP 툴이 세션에 로드되지 않는 경우가 있으므로 REST API를 기본으로 사용한다.

| 트리거 | 호출 |
|---|---|
| PR 머지·CI 결과 확인 | `qualitygates/project_status` + `issues/search?severities=BLOCKER,CRITICAL` |
| Quality Gate Fail 감지 | `measures/component` + `issues/search` |
| push 전 베이스라인 확인 | `qualitygates/project_status` |

- org: `xzawed` / 프로젝트 키: `xzawed_ArcanaInsight`

### Railway (CLI 링크 후 조회)

MCP 툴 사용 전 세션마다 `railway link` 선행 필요:

```bash
railway link --project 24bdc6b7-db99-4487-896e-d4bd68dbb6b3 --environment production --service ArcanaInsight
railway deployment list --json   # MCP 미동작 시 대체
```

| 트리거 | 호출 |
|---|---|
| 배포 이상 의심 | `railway deployment list --json` → `mcp__railway__get-logs` |
