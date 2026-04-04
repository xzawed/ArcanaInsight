# n8n 자동화 워크플로우

ArcanaInsight 운영 자동화를 위한 n8n 워크플로우 모음.

---

## 현재 구현 상태

| 워크플로우 | 파일 | Credential | 상태 |
|-----------|------|-----------|------|
| Spec Tracker (Polling) | `workflow-spec-tracker.json` | GitHub PAT | **운영 중** |
| Quality Monitor | `workflow-quality-monitor.json` | GitHub PAT + Supabase + Grok API | Grok API 등록 후 사용 |
| Weekly Report | `workflow-weekly-report.json` | GitHub PAT + Supabase + Grok API | Grok API 등록 후 사용 |
| Spec Tracker (Cloud) | `workflow-spec-tracker-cloud.json` | GitHub PAT | n8n Cloud 이전 후 사용 |

---

## 로컬 환경 설정 (현재)

### 1. n8n 실행

```bash
# Windows (CMD/PowerShell에서)
npx n8n

# 또는 Docker
docker run -it --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

브라우저에서 `http://localhost:5678` 접속.

### 2. Credential 등록

Credentials → Add Credential:

| Credential Name | 타입 | Name 필드 | Value 필드 |
|----------------|------|----------|-----------|
| **GitHub PAT** | Header Auth | `Authorization` | `token ghp_xxxx` |
| **Supabase DB** | Postgres | Host/DB/User/Password 각각 입력, SSL ON | |
| **Grok API** | Header Auth | `Authorization` | `Bearer {GROK_API_KEY}` |

> GitHub PAT: `token ` 접두사 필수 (Bearer 아님)
> Supabase: SSL 필수, `Reject Unauthorized` OFF 필요할 수 있음

### 3. 워크플로우 Import

캔버스에서 `Ctrl+V`로 JSON 내용을 붙여넣기하거나, 메뉴에서 Import 기능 사용.
Import 후 각 HTTP Request 노드의 Credential을 연결 → Save → Active ON.

---

## 워크플로우 상세

### 1. Spec Tracker — `workflow-spec-tracker.json`

SuperGrok에서 확정된 기능 스펙을 자동 감지하여 Claude CLI 구현을 알림.

```
5분마다 폴링
  └→ GitHub API: spec 라벨 + open Issue 조회
       ├→ Issue 없음 → 종료
       └→ 미처리 Issue 발견 (in-progress 라벨 없음)
            ├→ in-progress 라벨 자동 추가 (중복 방지)
            └→ Issue에 코멘트: "Claude CLI에서 구현 시작해주세요"
```

- **필요 Credential**: GitHub PAT
- **중복 방지**: `in-progress` 라벨이 붙은 Issue는 건너뜀
- **Polling 사용 이유**: localhost에서 GitHub Webhook을 수신할 수 없어서 우회. n8n Cloud 이전 시 Webhook 방식으로 교체하면 실시간 감지 가능

### 2. Quality Monitor — `workflow-quality-monitor.json`

리딩 결과 품질을 자동 평가하여 낮은 품질 발견 시 Issue 생성.

```
매일 09:00 KST
  └→ Supabase: 최근 24시간 리딩 10건 샘플링
       ├→ 리딩 없음 → 종료
       └→ Grok API: 1~10점 품질 평가
            └→ GitHub Issue로 리포트 생성
```

- **필요 Credential**: GitHub PAT + Supabase DB + Grok API

### 3. Weekly Report — `workflow-weekly-report.json`

주간 운영 데이터를 분석하여 인사이트 리포트 자동 생성.

```
매주 금요일 18:00 KST
  └→ Supabase: 주간 세션/리딩 통계 병렬 조회
       └→ Grok API: 운영 인사이트 생성
            └→ GitHub Issue로 리포트 생성
```

- **필요 Credential**: GitHub PAT + Supabase DB + Grok API

### 4. Spec Tracker Cloud — `workflow-spec-tracker-cloud.json`

Polling 버전과 동일한 기능이지만 **GitHub Webhook으로 실시간 감지**. n8n Cloud 이전 후 사용.

---

## 앞으로 해야 할 작업

### 즉시 가능

- [x] GitHub PAT 등록
- [x] Supabase DB 등록
- [x] Spec Tracker (Polling) 워크플로우 Import + 활성화
- [ ] Grok API Credential 등록 (Header Auth, Name: `Authorization`, Value: `Bearer {GROK_API_KEY}`)
- [ ] Quality Monitor 워크플로우 Import + 활성화
- [ ] Weekly Report 워크플로우 Import + 활성화

### n8n Cloud 이전 시

- [ ] https://app.n8n.cloud 가입 (Starter €20/월 추천)
- [ ] Credential 3개 재등록 (자동 이전 불가)
- [ ] 워크플로우 3개 Import
- [ ] Spec Tracker를 Cloud Webhook 버전으로 교체
- [ ] GitHub Webhook 등록 (Cloud URL)
- [ ] Polling 워크플로우 비활성화 + localhost n8n 종료

---

## n8n Cloud 마이그레이션 가이드

### 왜 Cloud로 이전하는가?

| 항목 | localhost (현재) | n8n Cloud |
|------|----------------|-----------|
| Spec 감지 속도 | 최대 5분 대기 (Polling) | **실시간** (Webhook) |
| GitHub API 소모 | 시간당 ~12회 | **0회** |
| n8n 실행 횟수/월 | ~8,640회 (5분×24h×30일) | **Issue 생성 시에만** |
| 서버 관리 | 직접 실행/유지 필요 | **자동 관리** |
| 외부 접근 | 불가 (localhost) | **공개 URL 제공** |

### 플랜 안내

| 플랜 | 가격 | 워크플로우 | 실행 횟수/월 | 적합도 |
|------|------|----------|-----------|--------|
| **Starter** | €20/월 | 5개 | 2,500회 | **ArcanaInsight에 충분** |
| Pro | €50/월 | 무제한 | 10,000회 | 서비스 확장 시 |

### 이전 절차

#### 1. Credential 재등록

| Credential | 값 (localhost와 동일) |
|-----------|---------------------|
| GitHub PAT | Header Auth → `Authorization` / `token ghp_xxx` |
| Supabase DB | Postgres → Host/DB/User/Password, SSL ON |
| Grok API | Header Auth → `Authorization` / `Bearer xai-xxx` |

#### 2. 워크플로우 이전

- Quality Monitor, Weekly Report → **JSON 그대로 Import** (변경 없음)
- Spec Tracker → **Cloud 전용 버전으로 교체** (`workflow-spec-tracker-cloud.json`)

#### 3. GitHub Webhook 등록

1. n8n Cloud에서 Spec Tracker (Webhook) → Webhook 노드 → **Production URL** 복사
2. GitHub → Settings → Webhooks → Add webhook
   - Payload URL: 복사한 Cloud URL
   - Content type: `application/json`
   - Events: **Issues** 선택

#### 4. 정리

- Polling 워크플로우 비활성화
- localhost n8n 종료
