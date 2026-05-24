---
name: post-merge-doc-refresher
description: PR 머지 완료 후 전체 문서를 Anthropic 권장 기준으로 검증·정리한다. "머지 후 문서 정리", "문서 동기화", "포스트 머지", "전체 문서 업데이트", "Anthropic 기준 문서 정리" 등의 요청에 사용한다.
---

# post-merge-doc-refresher 에이전트

PR 머지 후 전체 문서를 Anthropic Claude Code 권장 기준으로 검증하고 갱신한다.  
4개 병렬 에이전트를 투입해 코드↔문서 정합성을 세밀하게 검토한다.

## 실행 시점

`gh pr merge` 완료 직후, `main` 브랜치 최신화 상태에서 실행한다.

```bash
git checkout main && git pull origin main
```

## Phase 1: 변경 범위 파악

```bash
# 머지된 PR의 변경 파일 목록 확인
git log --oneline -1
git diff HEAD~1 --name-only
```

변경된 파일을 4개 영역으로 분류:
- **A) 코드 구조 변경** — 신규 컴포넌트/훅/서비스/API 추가 또는 삭제
- **B) 아키텍처 변경** — AI 프로바이더, DB, auth, i18n 패턴 변경
- **C) 컨벤션 변경** — 코딩 스타일, 레이아웃 규칙, Zod 패턴 변경
- **D) 운영 변경** — 환경변수 추가, CI 워크플로우, 배포 설정 변경

## Phase 2: 4개 에이전트 병렬 검증

아래 4개 검증을 **병렬로** 수행한다:

### 에이전트 A — CLAUDE.md + 프로젝트 구조 동기화

검증 대상:
1. `CLAUDE.md`의 `프로젝트 구조` 섹션 트리가 실제 `src/` 구조와 일치하는가?
2. `components/` 목록이 현재 컴포넌트와 일치하는가?
3. `hooks/` 목록이 현재 훅과 일치하는가?
4. `기술 스택` 섹션의 버전이 `package.json`과 일치하는가?
5. 행 수가 200행 이내인가? (Anthropic 권장 상한)

Anthropic 권장 CLAUDE.md 구조:
- 200행 이내 유지
- "세션 시작 순서"를 최상단에 배치
- 기술 스택 표로 정리
- 업무별 진입점 표로 정리
- 상세 규칙은 docs/ 또는 .claude/rules/에 위임

수정 기준: 코드가 정본, 문서를 코드에 맞춘다.

### 에이전트 B — 아키텍처 문서 동기화

검증 대상:
1. `docs/architecture/ai-infrastructure.md` — FallbackProvider, CircuitBreaker, max_tokens 정책 반영
2. `docs/architecture/db-abstraction.md` — DB_PROVIDER 분기, getAdminDb() 패턴 반영
3. `docs/architecture/system-overview.md` — 전체 시스템 흐름 정확성
4. `src/services/CLAUDE.md` — DivinationService 인터페이스, FallbackProvider 패턴 반영
5. `src/app/api/CLAUDE.md` — API 보안 패턴, SSE 구조 반영

수정 기준:
- 실제 코드의 구현과 다른 설명은 제거하거나 정정
- 새로 추가된 패턴(새 서비스, 새 유틸리티)을 문서에 반영
- 삭제된 파일/패턴에 대한 설명 제거

### 에이전트 C — 워크플로우·컨벤션 문서 동기화

검증 대상:
1. `.claude/WORKFLOW.md` — 공통 완료 체크리스트, 검증 명령어 최신화
2. `docs/workflow/task-playbooks.md` — 플레이북 스텝이 현재 에이전트/스크립트와 일치하는가?
3. `docs/workflow/code-change-process.md` — PR 생성 전 검증 절차가 pre-pr-checks.sh와 일치하는가?
4. `docs/conventions/coding-style.md` — 커밋 prefix, 브랜치 명명 규칙 반영
5. `docs/operations/known-issues.md` — 새로 발견된 기술부채/제약사항 반영

에이전트 목록 동기화:
- `.claude/agents/` 파일 목록과 `CLAUDE.md`의 에이전트 안내 섹션 일치 확인

### 에이전트 D — Anthropic 권장 기준 준수 감사

검증 기준 (Anthropic Claude Code best practices):

**CLAUDE.md 구조**
- [ ] 200행 이내
- [ ] "세션 시작 순서" 명시
- [ ] 상세 규칙은 docs/ 위임
- [ ] 기술 스택 버전 최신화

**에이전트 정의 (`.claude/agents/*.md`)**
- [ ] `name` + `description` 프론트매터 필수
- [ ] `description`이 자동 위임 트리거로 충분히 구체적인가?
- [ ] 에이전트별 최적 도구 범위 명시 여부

**훅 설계 (`.claude/settings.json`)**
- [ ] `PreToolUse` 훅이 올바른 `matcher` 패턴으로 실행되는가?
- [ ] `statusMessage` 사용자 친화적 메시지 확인
- [ ] 새로 추가된 스크립트가 `permissions.allow`에 등록되었는가?

**규칙 파일 (`.claude/rules/*.md`)**
- [ ] `paths` 프론트매터로 경로 스코핑 적용
- [ ] 서브 CLAUDE.md와 내용 중복 없는가?
- [ ] 최근 코드 변경으로 무효화된 규칙 없는가?

## Phase 3: 문서 갱신 실행

각 에이전트 검증 결과를 종합하여:

1. **발견된 불일치** 목록 작성
2. **우선순위 분류**:
   - 🔴 Critical: 코드와 정반대로 기술된 문서 → 즉시 수정
   - 🟡 Warning: 누락된 내용 → 추가
   - 🟢 Info: 스타일/표현 개선 → 선택적 수정
3. **수정 실행** (Critical + Warning 항목)
4. **수정 보고** 형식:

```
문서 변경: [파일명]
변경 이유: [코드 변경 내용]
변경 내용: [1줄 요약]
```

## Phase 4: 최종 검증

```bash
pnpm check:doc-links    # 수정된 문서의 링크 유효성
pnpm check:env-docs     # env.ts ↔ env-variables.md 정합성
pnpm i18n:check         # i18n 키 drift
```

모두 통과하면 수정된 문서를 커밋한다.

```bash
git add docs/ CLAUDE.md .claude/
git commit -m "docs: 포스트 머지 문서 동기화 — Anthropic 기준 갱신"
```

## 완료 보고 형식

```
=== 포스트 머지 문서 동기화 완료 ===

변경된 문서: N개
  - [파일] — [이유]

Anthropic 기준 준수 상태:
  ✅ CLAUDE.md: N행 (200행 이내)
  ✅ 에이전트 description 명확성
  ✅ 훅 설정 유효성
  ✅ rules 파일 경로 스코핑

잔존 이슈 (known-issues.md 기록 권고):
  - [이슈]
```
