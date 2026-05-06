# Railway + SonarCloud MCP 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Claude가 작업 중 이상 감지 시 Railway·SonarCloud MCP 툴을 자동 호출해 사용자 개입 없이 진단할 수 있도록 연동을 완성한다.

**Architecture:** `~/.claude/settings.json`의 `mcpServers` 블록이 이미 등록되어 있다 (railway: npx, sonarcloud: Docker). 남은 작업은 ① Railway CLI 인증 확인, ② `.gitignore` 보호, ③ CLAUDE.md 자율 진단 규칙 추가, ④ 동작 검증이다.

**Tech Stack:** Railway CLI (`@railway/cli`), Docker (`mcp/sonarqube` 이미지), Claude Code MCP 프로토콜

---

## 파일 변경 목록

| 파일 | 작업 | 내용 |
|---|---|---|
| `~/.claude/settings.json` | 이미 완료 | railway + sonarcloud mcpServers 등록됨 |
| `f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/.gitignore` | 수정 | `.mcp.json` 추가 |
| `f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/CLAUDE.md` | 수정 | MCP 자율 진단 규칙 섹션 추가 |

---

## Task 1: Railway CLI 인증 상태 확인

**Files:**
- 확인: `~/.claude/settings.json` (이미 railway MCP 등록 완료)

- [x] **Step 1: Railway CLI 설치 확인**

```bash
railway --version
```

Expected: `railway/X.X.X` 버전 출력. 없으면 다음 명령으로 설치:
```bash
npm install -g @railway/cli
```

- [x] **Step 2: Railway 로그인 상태 확인**

```bash
railway whoami
```

Expected: 로그인된 계정 이메일 출력 (`xzawed31@gmail.com`).
미로그인 시:
```bash
railway login
```
브라우저가 열리면 GitHub 계정으로 인증.

- [x] **Step 3: ArcanaInsight 프로젝트 연결 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && railway status
```

Expected: 프로젝트명·환경·서비스명 출력.
미연결 시:
```bash
railway link
```
프로젝트 목록에서 ArcanaInsight 선택.

---

## Task 2: Docker SonarCloud MCP 이미지 준비 확인

**Files:**
- 확인: `~/.claude/settings.json` (sonarcloud: `docker run mcp/sonarqube` 방식)

- [x] **Step 1: Docker 실행 확인**

```bash
docker --version
```

Expected: `Docker version X.X.X` 출력. Docker Desktop이 실행 중이어야 함.

- [x] **Step 2: SonarQube MCP 이미지 pull**

```bash
docker pull mcp/sonarqube
```

Expected: 이미지 다운로드 완료 또는 `Status: Image is up to date`.

- [x] **Step 3: 이미지 존재 확인**

```bash
docker image ls mcp/sonarqube
```

Expected:
```
REPOSITORY     TAG       IMAGE ID       CREATED       SIZE
mcp/sonarqube  latest    <id>           ...            ...
```

---

## Task 3: .gitignore에 .mcp.json 추가

**Files:**
- Modify: `f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/.gitignore`

- [x] **Step 1: .gitignore 끝에 항목 추가**

`.gitignore` 파일 마지막에 다음을 추가:

```
# MCP 설정 (토큰 포함 가능 — git 제외 필수)
.mcp.json
```

- [x] **Step 2: 변경 확인**

```bash
cd "f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight" && git diff .gitignore
```

Expected: `+.mcp.json` 라인이 diff에 포함.

- [x] **Step 3: 커밋**

```bash
git add .gitignore
git commit -m "chore: .mcp.json을 .gitignore에 추가 (MCP 토큰 실수 커밋 방지)"
```

---

## Task 4: CLAUDE.md MCP 자율 진단 규칙 추가

**Files:**
- Modify: `f:/DEVELOPMENT/SOURCE/CLAUDE/ArcanaInsight/CLAUDE.md`

- [x] **Step 1: 현재 "운영 체계" 섹션 위치 확인**

`CLAUDE.md`에서 `## 운영 체계` 섹션을 찾는다.

- [x] **Step 2: 자율 진단 규칙 추가**

`## 운영 체계` 섹션 내 기존 내용 **아래**에 다음 블록을 추가:

```markdown
**MCP 자율 진단 규칙**: 아래 트리거 발생 시 사용자 요청 없이 해당 MCP 툴을 자동 호출하여 컨텍스트를 수집한다. MCP 툴은 `~/.claude/settings.json`의 `mcpServers`에 등록된 `railway`(npx)와 `sonarcloud`(Docker) 서버를 통해 제공된다.

| 트리거 | 호출 툴 | 목적 |
|---|---|---|
| PR 생성·머지 후 CI 결과 확인 시 | `get_project_quality_gate_status` → `search_sonar_issues_in_projects` | 신규 이슈 직접 파악 |
| SonarCloud Quality Gate Fail 감지 | `search_files_by_coverage` + `get_component_measures` | 커버리지·버그·취약점 원인 수집 |
| Railway 배포 이상 의심 시 | `list-services` → `get-logs` | 런타임 에러 로그 직접 수집 |
| 로컬 검증 통과 후 push 전 | `get_project_quality_gate_status` | 직전 분석 베이스라인 확인 |
```

- [x] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md에 Railway·SonarCloud MCP 자율 진단 규칙 추가"
```

---

## Task 5: MCP 동작 검증

**전제:** Task 1~4 완료, Claude Code 세션 재시작(MCP 서버 재기동).

- [x] **Step 1: Claude Code 재시작**

현재 세션을 종료하고 새 Claude Code 세션을 시작한다.  
(MCP 서버는 세션 시작 시 기동되므로 재시작 필수)

- [x] **Step 2: Railway MCP 동작 확인**

새 세션에서 다음을 입력:
```
Railway check-railway-status 툴 호출해줘
```

Expected: `Railway CLI가 인증됨` 또는 로그인 계정 정보 반환.

- [x] **Step 3: SonarCloud MCP 동작 확인**

새 세션에서 다음을 입력:
```
ArcanaInsight SonarCloud 품질 게이트 상태 확인해줘
```

Expected: `get_project_quality_gate_status` 호출 → Quality Gate `Passed` 상태와 측정값 반환.

- [x] **Step 4: 통합 시나리오 확인**

새 세션에서 다음을 입력:
```
Railway 배포 로그 최근 20줄 보여줘
```

Expected: `list-services` → `get-logs` 순서로 호출 후 로그 출력.

- [x] **Step 5: push**

```bash
git push origin main
```

---

## Task 6: 메모리 및 참조 문서 업데이트

**Files:**
- Modify: `~/.claude/projects/f--DEVELOPMENT-SOURCE-CLAUDE-ArcanaInsight/memory/MEMORY.md`
- Create: `~/.claude/projects/f--DEVELOPMENT-SOURCE-CLAUDE-ArcanaInsight/memory/project_mcp_integration.md`

- [x] **Step 1: MCP 연동 메모리 파일 생성**

`project_mcp_integration.md` 내용:

```markdown
---
name: Railway·SonarCloud MCP 연동
description: Claude 자율 진단용 MCP 서버 2종 — railway(npx), sonarcloud(Docker). 사용자 레벨 ~/.claude/settings.json에 등록.
type: project
---
~/.claude/settings.json의 mcpServers에 railway(@railway/mcp-server, npx)와 sonarcloud(mcp/sonarqube, Docker) 등록 완료 (2026-04-26).

**Why:** Claude가 PR·배포 이상 감지 시 사용자 개입 없이 직접 로그·품질 분석 결과를 수집하기 위함.

**How to apply:** 작업 중 SonarCloud Quality Gate Fail, Railway 배포 오류, CI 실패 감지 시 해당 MCP 툴을 자동 호출. CLAUDE.md '운영 체계' 섹션의 MCP 자율 진단 규칙 참조.

SonarCloud org 키: xzawed / Railway: CLI 인증 기반(토큰 불필요)
```

- [x] **Step 2: MEMORY.md 인덱스 추가**

`MEMORY.md`에 다음 라인 추가 (완료 — `~/.claude/projects/.../memory/MEMORY.md` 참조):

- [x] **Step 3: 커밋 (CLAUDE.md와 함께 처리됐다면 생략)**

```bash
git add CLAUDE.md .gitignore
git commit -m "chore: MCP 연동 완료 — .gitignore + CLAUDE.md 자율 진단 규칙"
git push origin main
```
