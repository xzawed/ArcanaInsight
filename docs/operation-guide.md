# ArcanaInsight 운영 가이드

운영자가 알아야 할 전체 흐름을 쉽게 정리한 문서입니다.

---

## 1. 서비스 전체 구조

사용자가 타로/사주 상담을 받기까지의 흐름입니다.

```mermaid
flowchart LR
    사용자 -->|접속| 웹사이트["ArcanaInsight<br/>웹사이트"]
    웹사이트 -->|카드 선택/정보 입력| 서버["Next.js 서버<br/>(Railway)"]
    서버 -->|리딩 요청| AI{{"AI 엔진<br/>(FallbackProvider)"}}
    AI -->|1순위| Grok["Grok API<br/>(SuperGrok)"]
    AI -.->|장애 시 자동| Claude["Claude API<br/>(Anthropic)"]
    서버 -->|데이터 저장| DB["Supabase<br/>(데이터베이스)"]
    서버 -->|결과 전달| 웹사이트
    웹사이트 -->|화면 표시| 사용자

    style Grok fill:#e94560,color:#fff
    style Claude fill:#7c3aed,color:#fff
    style DB fill:#059669,color:#fff
```

**한 줄 요약**: 사용자 → 웹사이트 → 서버 → AI(Grok 또는 Claude) → 결과 표시

---

## 2. AI 엔진 — Grok + Claude 자동 전환

AI 리딩은 **Grok이 기본**이고, 문제가 생기면 **Claude가 자동으로 대체**합니다.

```mermaid
flowchart TD
    요청["리딩 요청 도착"]
    요청 --> 체크{"Grok 사용 가능?"}

    체크 -->|사용 가능| Grok["Grok API 호출"]
    Grok -->|성공| 결과["결과 반환 ✅"]

    Grok -->|429 한도 초과| 전환1["Claude로 전환<br/>⏱️ 30초 후 Grok 재시도"]
    Grok -->|500 서버 에러| 전환2["Claude로 전환<br/>⏱️ 5분 후 Grok 재시도"]
    Grok -->|401 인증 실패| 전환3["Claude로 전환<br/>⏱️ 30분 후 Grok 재시도"]

    체크 -->|대기 중| Claude["Claude API 호출"]
    전환1 & 전환2 & 전환3 --> Claude
    Claude -->|성공| 결과
    Claude -->|실패| 에러["에러 메시지 표시<br/>'잠시 후 다시 시도해주세요'"]

    style Grok fill:#e94560,color:#fff
    style Claude fill:#7c3aed,color:#fff
    style 결과 fill:#16a34a,color:#fff
    style 에러 fill:#dc2626,color:#fff
```

**핵심 포인트**:
- 평소에는 Grok만 사용됩니다
- Grok에 문제가 생기면 **사용자가 모르는 사이에** Claude로 자동 전환됩니다
- 일정 시간 후 자동으로 Grok을 다시 시도합니다

---

## 3. 새 기능 개발 흐름 — SuperGrok → Claude CLI

새 기능을 기획하고 구현하는 전체 과정입니다.

```mermaid
flowchart TD
    기획["① SuperGrok에서 기획<br/>기능 논의 + 설계"]
    기획 --> Issue["② GitHub Issue 생성<br/>(spec 템플릿 사용)"]
    Issue --> 감지["③ n8n이 자동 감지<br/>in-progress 라벨 + 코멘트"]
    감지 --> 구현["④ Claude CLI에서 구현<br/>'Issue #XX 내용대로 구현해줘'"]
    구현 --> 검증["⑤ 로컬 검증<br/>타입체크 + 린트 + 빌드"]
    검증 -->|실패| 구현
    검증 -->|통과| PR["⑥ PR 생성 + CI 검증"]
    PR -->|실패| 구현
    PR -->|통과| 배포["⑦ 머지 → Railway 자동 배포"]
    배포 --> 완료["⑧ 완료 ✅"]

    style 기획 fill:#e94560,color:#fff
    style 감지 fill:#d97706,color:#fff
    style 구현 fill:#7c3aed,color:#fff
    style 배포 fill:#16a34a,color:#fff
```

**당신이 하는 일**:
1. SuperGrok에서 기능 기획/설계 논의
2. GitHub에서 Issue 생성 (spec 템플릿 선택)
3. Claude CLI에 "Issue #XX 내용대로 구현해줘"라고 전달
4. 결과 확인

**자동으로 되는 일**:
- n8n이 spec Issue를 감지하여 알림
- CI가 코드 품질 자동 검증
- Railway가 자동 배포

---

## 4. 버그 수정 흐름

버그를 발견했을 때의 처리 과정입니다.

```mermaid
flowchart TD
    발견{"버그 발견"}
    발견 -->|직접 발견| 보고["Claude CLI에 직접 전달<br/>'이런 문제가 있어. 수정해줘'"]
    발견 -->|주간 QA 자동 감지| QA_Issue["GitHub Issue 자동 생성<br/>🚨 주간 QA 실패"]

    보고 & QA_Issue --> 수정["Claude CLI가 수정"]
    수정 --> 검증["로컬 검증 + PR + CI"]
    검증 -->|실패| 수정
    검증 -->|통과| 배포["머지 → 배포"]
    배포 --> 재검증{"QA Issue<br/>열려있음?"}
    재검증 -->|Yes| 재실행["주간 QA 자동 재실행"]
    재실행 -->|통과| 닫기["Issue 자동 닫기 ✅"]
    재실행 -->|실패| 수정
    재검증 -->|No| 완료["완료 ✅"]

    style QA_Issue fill:#dc2626,color:#fff
    style 닫기 fill:#16a34a,color:#fff
    style 완료 fill:#16a34a,color:#fff
```

**핵심 포인트**:
- 버그를 발견하면 Claude CLI에 바로 말하면 됩니다
- 주간 QA가 자동으로 버그를 찾아서 Issue를 생성합니다
- 수정 후 QA가 자동 재실행되어 확인합니다

---

## 5. 자동화 시스템 — 무엇이 자동으로 돌아가는가

```mermaid
flowchart LR
    subgraph 자동["🤖 자동으로 돌아가는 것"]
        QA["주간 QA<br/>토요일 09:00<br/>(GitHub Actions)"]
        재검증["QA 자동 재검증<br/>수정 후 자동 실행"]
        Spec["Spec 감지<br/>Issue 생성 즉시<br/>(n8n Cloud)"]
        품질["리딩 품질 평가<br/>매일 09:00<br/>(n8n Cloud)"]
        리포트["주간 운영 리포트<br/>금요일 18:00<br/>(n8n Cloud)"]
        배포["Railway 배포<br/>main 머지 시"]
    end

    subgraph 수동["👤 내가 하는 것"]
        기획["SuperGrok에서 기획"]
        Issue["GitHub Issue 생성"]
        지시["Claude CLI에 지시"]
        확인["결과 확인"]
    end

    기획 --> Issue --> Spec
    지시 --> 배포
    QA -.-> 재검증

    style 자동 fill:#1a1a2e,stroke:#16a34a,color:#fff
    style 수동 fill:#1a1a2e,stroke:#2563eb,color:#fff
```

### 자동 실행 일정

| 시간 | 무엇이 실행되는가 | 어디서 |
|------|-----------------|-------|
| **매일 09:00** | 리딩 품질 자동 평가 → 낮으면 Issue 생성 | n8n Cloud |
| **금요일 18:00** | 주간 운영 리포트 → Issue 생성 | n8n Cloud |
| **토요일 09:00** | 전체 QA 테스트 (3개 디바이스) → 실패 시 Issue | GitHub Actions |
| **PR 생성 시** | 코드 품질 검증 (린트 + 빌드 + E2E) | GitHub Actions |
| **main 머지 시** | Railway 자동 배포 + QA Issue 재검증 | Railway + GitHub |
| **spec Issue 생성 시** | n8n이 즉시 감지 → 구현 안내 코멘트 | n8n Cloud |

---

## 6. 환경별 역할 분담

```mermaid
flowchart TB
    subgraph SuperGrok["SuperGrok (xAI)"]
        direction TB
        G1["🎯 기능 기획/설계"]
        G2["🖼️ 이미지 생성<br/>(캐릭터, 카드 스킨)"]
        G3["📊 운영 데이터 분석"]
        G4["🔮 프로덕션 AI<br/>(타로/사주 리딩)"]
    end

    subgraph ClaudeCLI["Claude CLI (Anthropic)"]
        direction TB
        C1["💻 코드 구현/수정"]
        C2["🧪 품질 검증 (E2E)"]
        C3["📄 문서 관리"]
        C4["🚀 CI/CD + 배포"]
        C5["🛡️ AI Fallback<br/>(Grok 장애 시 대체)"]
    end

    subgraph n8n["n8n Cloud"]
        direction TB
        N1["📋 Spec Issue 감지"]
        N2["📊 리딩 품질 모니터링"]
        N3["📈 주간 운영 리포트"]
    end

    연결점["CLAUDE.md<br/>(모든 정보가 모이는 곳)"]

    SuperGrok --> 연결점
    ClaudeCLI --> 연결점
    n8n --> 연결점

    style SuperGrok fill:#1a1a2e,stroke:#e94560,color:#fff
    style ClaudeCLI fill:#1a1a2e,stroke:#7c3aed,color:#fff
    style n8n fill:#1a1a2e,stroke:#d97706,color:#fff
    style 연결점 fill:#d97706,color:#fff
```

---

## 7. 문제가 생겼을 때 — 빠른 참조

| 상황 | 해결 방법 |
|------|---------|
| **서비스가 안 될 때** | Grok API 장애 → Claude가 자동 대체 중. 방치하면 자동 복구 |
| **리딩 품질이 낮을 때** | n8n이 매일 자동 감지 → Issue 생성 → Claude CLI에 수정 지시 |
| **새 기능이 필요할 때** | SuperGrok에서 기획 → GitHub Issue(spec) → Claude CLI에 구현 지시 |
| **버그를 발견했을 때** | Claude CLI에 직접 전달: "이런 문제가 있어. 수정해줘" |
| **주간 QA 실패 알림** | GitHub Issue 확인 → Claude CLI에 수정 지시 → 자동 재검증 |
| **GitHub Actions 멈춤** | 무료 시간 소진 → 다음 달 자동 복구. 그동안 로컬 검증으로 대체 |

---

## 8. 핵심 URL 모음

| 서비스 | URL |
|--------|-----|
| **운영 사이트** | https://arcanainsight-production.up.railway.app |
| **GitHub 저장소** | https://github.com/xzawed/ArcanaInsight |
| **n8n Cloud** | https://xzawed.app.n8n.cloud |
| **Supabase** | Supabase 대시보드 (프로젝트 설정) |
| **Railway** | Railway 대시보드 (배포 관리) |
