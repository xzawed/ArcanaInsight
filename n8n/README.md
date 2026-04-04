# n8n 자동화 워크플로우

ArcanaInsight 운영 자동화를 위한 n8n 워크플로우 모음.

## 사전 준비

### 1. n8n 설치

```bash
# 방법 A: npx (가장 빠름)
npx n8n

# 방법 B: Docker
docker run -it --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n

# 방법 C: n8n Cloud (https://n8n.io)
```

브라우저에서 `http://localhost:5678` 접속.

### 2. 필요한 Credential 설정

n8n 대시보드 → Settings → Credentials에서 아래 항목 추가:

| Credential | 타입 | 값 |
|-----------|------|-----|
| **GitHub PAT** | Header Auth | GitHub Settings → Developer settings → Personal Access Token (repo 권한) |
| **Supabase** | Postgres | Supabase 대시보드 → Settings → Database → Connection string |
| **Grok API** | Header Auth | `Authorization: Bearer {GROK_API_KEY}` |

### 3. 워크플로우 Import

n8n 대시보드 → Workflows → Import from File → 아래 JSON 파일 선택:

- `workflow-spec-tracker.json` — 스펙 Issue 추적 + 구현 트리거
- `workflow-quality-monitor.json` — 일일 리딩 품질 모니터링
- `workflow-weekly-report.json` — 주간 운영 리포트

## 워크플로우 설명

### 1. Spec Tracker (`workflow-spec-tracker.json`)
- **트리거**: 5분마다 폴링 (localhost 환경 대응, Webhook/ngrok 불필요)
- **동작**: `spec` 라벨 + `open` 상태 Issue 조회 → 미처리 Issue에 `in-progress` 라벨 추가 + 구현 안내 코멘트
- **용도**: SuperGrok에서 확정한 스펙 → Claude CLI 구현 알림
- **중복 방지**: `in-progress` 라벨이 이미 붙은 Issue는 건너뜀

### 2. Quality Monitor (`workflow-quality-monitor.json`)
- **트리거**: 매일 오전 9시 (KST)
- **동작**: Supabase에서 최근 24시간 리딩 조회 → Grok API로 품질 평가 → 낮은 품질 시 GitHub Issue 자동 생성
- **용도**: 리딩 품질 자동 모니터링

### 3. Weekly Report (`workflow-weekly-report.json`)
- **트리거**: 매주 금요일 오후 6시 (KST)
- **동작**: Supabase에서 주간 통계 집계 → Grok API로 인사이트 생성 → GitHub Issue로 리포트
- **용도**: 주간 운영 현황 자동 리포트
