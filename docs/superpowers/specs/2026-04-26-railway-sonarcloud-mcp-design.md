# Railway + SonarCloud MCP 연동 설계

> 작성일: 2026-04-26  
> 상태: 승인됨  
> 목적: Claude가 작업 중 이상 감지 시 사용자 개입 없이 Railway·SonarCloud MCP 툴로 직접 컨텍스트를 수집하고 진단한다.

---

## 1. 목적

Claude가 PR 생성·머지, 로컬 검증, Railway 배포 과정에서 이상을 감지할 때 사용자가 로그나 분석 결과를 복붙해 줄 필요 없이 MCP 툴을 통해 직접 데이터를 수집한다. 사용자 요청이 아닌 **Claude의 자율 진단 수단**으로 활용한다.

---

## 2. 범위

| 항목 | 포함 여부 |
|---|---|
| `~/.claude/settings.json` mcpServers 등록 | ✅ |
| `.gitignore`에 `.mcp.json` 추가 (실수 방지) | ✅ |
| `CLAUDE.md` 자율 진단 행동 규칙 추가 | ✅ |
| n8n 자동 트리거 연동 | ❌ 별도 스펙 |
| GitHub Actions webhook → Claude 알림 | ❌ 별도 스펙 |

---

## 3. 사전 조건 (사용자가 직접 수행)

### 3-1. Railway CLI 설치 및 로그인

```bash
npm install -g @railway/cli
railway login          # 브라우저 인증 완료 필요
railway status         # 인증 확인
```

> Railway MCP 서버는 API 토큰 대신 Railway CLI의 로그인 상태를 그대로 사용한다.

### 3-2. SonarCloud API 토큰 발급

1. [SonarCloud](https://sonarcloud.io) 로그인
2. My Account → Security → **Generate Token**
3. 토큰 이름: `claude-mcp` (권장)
4. 토큰 값 복사 (재표시 불가)

### 3-3. SonarCloud 조직 키 확인

1. SonarCloud → 해당 Organization 선택
2. Administration → **Organization Key** 값 복사
3. ArcanaInsight 기준: `xzawed` (또는 실제 org key 확인)

---

## 4. 변경 명세

### 4-1. `~/.claude/settings.json` — mcpServers 블록 추가

기존 `permissions` 블록과 **병렬로** `mcpServers` 블록을 추가한다.

```json
{
  "permissions": { ... },
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    },
    "sonarcloud": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_TOKEN": "<3-2에서 발급한 토큰>",
        "SONARQUBE_ORG": "<3-3에서 확인한 조직 키>"
      }
    }
  }
}
```

> `env` 값은 `~/.claude/settings.json`에만 존재하며 Git에 올라가지 않는다.

### 4-2. `.gitignore` — `.mcp.json` 추가

프로젝트 루트에 `.mcp.json`이 실수로 생성·커밋되는 상황을 방지한다.

```
# MCP 설정 (토큰 포함 가능 — git 제외 필수)
.mcp.json
```

### 4-3. `CLAUDE.md` — MCP 자율 진단 규칙 추가

"운영 체계" 섹션 아래에 다음 내용을 추가한다:

---

**MCP 자율 진단 규칙**: 아래 트리거 발생 시 사용자 요청 없이 해당 MCP 툴을 자동 호출하여 컨텍스트를 수집한다.

| 트리거 | 호출 툴 | 목적 |
|---|---|---|
| PR 생성·머지 후 CI 결과 확인 시 | `get_project_quality_gate_status` → `search_sonar_issues_in_projects` | 신규 이슈 직접 파악 |
| SonarCloud Quality Gate Fail 감지 | `search_files_by_coverage` + `get_component_measures` | 커버리지·버그·취약점 원인 수집 |
| Railway 배포 이상 의심 시 | `list-services` → `get-logs` | 런타임 에러 로그 직접 수집 |
| 로컬 검증 통과 후 push 전 | `get_project_quality_gate_status` | 직전 분석 베이스라인 확인 (SonarCloud는 기분석 결과 기준) |

---

## 5. MCP 서버 제공 툴 (주요 목록)

### Railway (`@railway/mcp-server`) — 13개 툴

| 툴 | 용도 |
|---|---|
| `check-railway-status` | CLI 인증 상태 확인 |
| `list-projects` | 프로젝트 목록 |
| `list-services` | 서비스 목록 |
| `get-logs` | 서비스 런타임 로그 |
| `list-variables` | 환경변수 목록 (값 마스킹) |
| `deploy` | 재배포 트리거 |

### SonarCloud (`sonarqube-mcp-server`) — 50+ 툴

| 툴 | 용도 |
|---|---|
| `get_project_quality_gate_status` | Quality Gate Passed/Failed |
| `search_sonar_issues_in_projects` | 버그·취약점·코드스멜 조회 |
| `search_files_by_coverage` | 커버리지 낮은 파일 탐지 |
| `get_component_measures` | statements/branches/functions 수치 |
| `list_pull_requests` | PR별 분석 상태 |
| `search_security_hotspots` | 보안 핫스팟 조회 |

---

## 6. 동작 시나리오

### 시나리오 A — SonarCloud Quality Gate Fail 시

```
1. Claude가 push 또는 PR 후 CI 결과를 확인
2. Quality Gate Fail 감지
3. → get_project_quality_gate_status 호출 (Fail 조건 확인)
4. → search_sonar_issues_in_projects 호출 (신규 이슈 목록 수집)
5. → 해당 파일 Read 후 수정 코드 제안
6. → 수정 → 재검증 → 재push
```

### 시나리오 B — Railway 배포 이상 시

```
1. push 후 Railway 배포 완료 대기
2. 서비스 이상 의심 (타임아웃, 에러 응답 등)
3. → list-services 호출 (서비스 상태 확인)
4. → get-logs 호출 (런타임 에러 로그 수집)
5. → 로그 분석 후 원인 파악 및 수정 제안
```

---

## 7. 검증 방법

설정 완료 후 Claude 세션에서 아래 명령으로 동작 확인:

```
railway: check-railway-status 툴 호출 → "Railway CLI 인증됨" 응답 확인
sonarcloud: get_project_quality_gate_status 호출 → ArcanaInsight 게이트 상태 반환 확인
```

---

## 8. 보안 고려사항

- `SONARQUBE_TOKEN`은 `~/.claude/settings.json`에만 존재 (Git 미포함)
- `.mcp.json`은 `.gitignore`로 차단
- Railway는 CLI 인증 기반이므로 토큰 파일 없음
- `list-variables`는 Railway 환경변수 **값을 마스킹**하여 반환하므로 시크릿 노출 위험 없음
