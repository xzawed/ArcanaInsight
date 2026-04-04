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

### 4. [Cloud 전용] Spec Tracker Webhook (`workflow-spec-tracker-cloud.json`)
- **트리거**: GitHub Webhook (Issue labeled 이벤트)
- **동작**: Polling 버전과 동일하지만 실시간 감지 (5분 대기 없음)
- **용도**: n8n Cloud 이전 후 사용

---

## n8n Cloud 마이그레이션 가이드

현재 localhost Polling 방식에서 n8n Cloud로 이전할 때 참고.

### 1. n8n Cloud 가입

1. https://app.n8n.cloud 접속 → 가입
2. 플랜 선택:
   - **Starter** (€20/월) — 워크플로우 5개, 실행 2,500회/월 → ArcanaInsight에 충분
   - **Pro** (€50/월) — 워크플로우 무제한, 실행 10,000회/월

### 2. Credential 이전 체크리스트

localhost에서 등록한 Credential을 Cloud에 새로 등록해야 합니다 (자동 이전 불가):

| Credential | 이전 방법 |
|-----------|---------|
| **GitHub PAT** | Header Auth → Name: `Authorization`, Value: `token ghp_xxx` (동일) |
| **Supabase DB** | Postgres → Host/DB/User/Password 동일, SSL ON |
| **Grok API** | Header Auth → Name: `Authorization`, Value: `Bearer xai-xxx` (동일) |

### 3. 워크플로우 이전

1. localhost n8n에서 각 워크플로우 → `...` → **Export** → JSON 다운로드
2. n8n Cloud에서 **Import** → JSON 업로드
3. 각 노드의 Credential을 Cloud에서 새로 등록한 것으로 재연결
4. **Spec Tracker만** Cloud 전용 Webhook 버전으로 교체:
   - `workflow-spec-tracker.json` (Polling) → `workflow-spec-tracker-cloud.json` (Webhook) 사용

### 4. GitHub Webhook 등록 (Cloud 전환 후)

Spec Tracker를 Webhook 방식으로 전환하면 실시간 감지가 가능합니다:

1. n8n Cloud에서 Spec Tracker (Webhook 버전) 활성화
2. Webhook 노드의 **Production URL** 복사 (형태: `https://xxx.app.n8n.cloud/webhook/arcana-spec`)
3. GitHub → Repository → **Settings** → **Webhooks** → **Add webhook**
   - Payload URL: 복사한 Cloud Webhook URL
   - Content type: `application/json`
   - Events: **Let me select individual events** → **Issues** 체크
   - Add webhook

### 5. Polling → Webhook 전환 시 변경점

| 항목 | Polling (현재) | Webhook (Cloud) |
|------|-------------|----------------|
| 감지 속도 | 최대 5분 지연 | 실시간 (수 초) |
| API 호출 | 5분마다 GitHub API 호출 | Issue 이벤트 시에만 |
| GitHub Rate Limit | 소모 (시간당 ~12회) | 소모 없음 |
| 외부 URL 필요 | 불필요 | 필요 (Cloud 제공) |
| 추가 설정 | 없음 | GitHub Webhook 등록 |

### 6. 이전 후 정리

- localhost n8n 종료
- Quality Monitor, Weekly Report는 JSON 그대로 Import (변경 없음)
- Spec Tracker만 Cloud 전용 버전으로 교체
- GitHub Webhook 등록 후 Polling 워크플로우 비활성화
