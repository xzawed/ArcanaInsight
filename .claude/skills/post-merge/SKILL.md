---
name: post-merge
description: PR 머지 완료 후 수행해야 할 포스트 머지 체크리스트를 안내한다. "머지 완료", "포스트 머지", "머지 후 할 일", "배포 확인" 등의 요청에 사용한다.
when_to_use: gh pr merge 완료 직후, main 브랜치 업데이트 후, 배포 파이프라인 확인이 필요할 때
disable-model-invocation: false
allowed-tools: Bash(git checkout *) Bash(git pull *) Bash(git log *) Bash(gh run *) Bash(pnpm sync:test-count)
---

# 포스트 머지 체크리스트

## 현재 main 브랜치 상태

```!
git log --oneline origin/main -5 2>/dev/null || git log --oneline -5
```

## Step 1 — main 브랜치 최신화

```bash
git checkout main && git pull origin main
```

## Step 2 — CI 상태 확인

```bash
gh run list --branch main --limit 3
```

모든 워크플로우(deploy, sonar, docs-sync)가 ✅ 통과했는지 확인한다.  
실패 시 → 로그 확인 후 `fix/` 브랜치로 수정 PR 생성.

## Step 3 — 포스트 머지 문서 동기화

```
"포스트 머지 문서 정리해줘"
```

`post-merge-doc-refresher` 에이전트가 4개 영역을 병렬 검증한다:
- CLAUDE.md + `.claude/` 파일들
- `docs/architecture/`
- `docs/conventions/` + `docs/workflow/`
- `docs/operations/` + rules + CI/CD

## Step 4 — 테스트 수 변동 시 동기화

테스트 파일을 추가/삭제했거나 테스트 수가 변동됐다면:

```bash
pnpm sync:test-count
```

변경이 있으면 별도 `docs/` 커밋으로 반영.

## Step 5 — Railway 배포 확인

Railway 대시보드에서 배포 성공 여부 확인:
- 빌드 성공 여부
- 헬스체크 통과 여부
- 환경변수 변경이 있었다면 재배포 필요 여부

## Step 6 — QA Issue 확인

`qa-recheck.yml`이 main push를 감지하여 자동 재실행된다.  
실패한 QA Issue가 있다면:

```bash
gh issue list --label "qa-failure"
```

미해결 이슈가 있으면 E2E 로그를 확인 후 `fix/` 브랜치로 수정.

## Step 7 — 다음 작업 브랜치 준비

```bash
git checkout -b feat/<다음-작업-설명>
```

---

> **자동 안내**: `gh pr merge` 실행 후 PostToolUse 훅이 이 체크리스트 실행을 자동 안내합니다.
