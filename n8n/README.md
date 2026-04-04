# n8n Cloud 자동화 워크플로우

ArcanaInsight 운영 자동화를 위한 n8n Cloud 워크플로우.
대시보드: https://xzawed.app.n8n.cloud

---

## 현재 운영 상태

| 워크플로우 | 파일 | 방식 | Credential | 상태 |
|-----------|------|------|-----------|------|
| **Spec Tracker** | `workflow-spec-tracker.json` | GitHub Webhook (실시간) | GitHub PAT | **운영 중** ✅ |
| **Quality Monitor** | `workflow-quality-monitor.json` | Cron (매일 09:00) | GitHub PAT + Supabase + Grok API | **운영 중** ✅ |
| **Weekly Report** | `workflow-weekly-report.json` | Cron (금요일 18:00) | GitHub PAT + Supabase + Grok API | **운영 중** ✅ |

---

## Credential 설정

n8n Cloud → Credentials → Add Credential:

| Credential Name | 타입 | Name | Value | 상태 |
|----------------|------|------|-------|------|
| **GitHub PAT** | Header Auth | `Authorization` | `token ghp_xxxx` | 등록 완료 ✅ |
| **Supabase DB** | Postgres | Host/DB/User/Password, SSL ON | | 등록 완료 ✅ |
| **Grok API** | Header Auth | `Authorization` | `Bearer {GROK_API_KEY}` | 등록 완료 ✅ |

> GitHub PAT: `token ` 접두사 필수 (Bearer 아님)
> Supabase: SSL ON + Reject Unauthorized OFF

---

## 워크플로우 상세

### 1. Spec Tracker — `workflow-spec-tracker.json` ✅ 운영 중

SuperGrok 기획 → GitHub Issue(spec 라벨) → n8n 실시간 감지 → 구현 알림.

```
GitHub Issue 생성 (spec 라벨)
  └→ GitHub Webhook → n8n Cloud 실시간 수신
       └→ spec 라벨 확인
            ├→ in-progress 라벨 자동 추가 (중복 방지)
            └→ Issue에 코멘트: "Claude CLI에서 구현 시작해주세요"
```

- Webhook URL: `https://xzawed.app.n8n.cloud/webhook/arcana-spec`
- GitHub Webhook: Issues 이벤트 등록 완료

### 2. Quality Monitor — `workflow-quality-monitor.json`

```
매일 09:00 KST
  └→ Supabase: 최근 24시간 리딩 10건 샘플링
       ├→ 리딩 없음 → 종료
       └→ Grok API: 1~10점 품질 평가 → GitHub Issue 리포트
```

### 3. Weekly Report — `workflow-weekly-report.json`

```
매주 금요일 18:00 KST
  └→ Supabase: 주간 세션/리딩 통계
       └→ Grok API: 운영 인사이트 → GitHub Issue 리포트
```

---

## 앞으로 해야 할 작업

- [x] n8n Cloud 가입
- [x] GitHub PAT 등록
- [x] Supabase DB 등록
- [x] Spec Tracker 워크플로우 Import + Publish + GitHub Webhook 등록
- [x] 실시간 연동 테스트 통과 (Issue #44, #45)
- [x] Grok API Credential 등록
- [x] Quality Monitor Import + Publish
- [x] Weekly Report Import + Publish
- [x] **전체 파이프라인 운영 완료**

---

## Import 및 Publish 방법

1. 워크플로우 JSON 파일을 텍스트 에디터로 열기 → 전체 복사 (`Ctrl+A`, `Ctrl+C`)
2. n8n Cloud에서 새 워크플로우 생성 → 캔버스에 `Ctrl+V` 붙여넣기
3. 각 HTTP Request 노드 클릭 → Credential 연결
4. **Save** → **Publish** (Publish 해야 Production URL이 작동)
