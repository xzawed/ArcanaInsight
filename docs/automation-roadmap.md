# 🤖 GitHub Issue → Claude CLI 자동 구현 파이프라인 로드맵

> **목표**: GitHub Issue 등록 감지 → 자체 서버의 Claude CLI가 코드 수정·테스트·커밋·PR 생성까지 자동 수행
>
> **전략**: Path B — 완전 자체호스팅 (Anthropic API 비용 최소화, Max 플랜 Claude CLI 활용)
>
> **최종 검토일**: 2026-04-18

---

## 📋 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [구성 요소 스택](#2-구성-요소-스택)
3. [Phase별 로드맵](#3-phase별-로드맵)
4. [사용자 수행 작업 상세](#4-사용자-수행-작업-상세)
5. [Claude가 구현할 자산](#5-claude가-구현할-자산)
6. [리스크 & 완화 방안](#6-리스크--완화-방안)
7. [예상 비용](#7-예상-비용)
8. [의사결정 체크리스트](#8-의사결정-체크리스트)

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Repo                          │
│  Issue 생성 (spec 라벨)                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ Webhook POST (HMAC 서명 검증)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          자체 n8n 서버 (Oracle Cloud / Docker Compose)       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  n8n 컨테이너 (오케스트레이션)                         │   │
│  │  • 라벨 필터 (spec + automation-ready)               │   │
│  │  • 중복 실행 방지                                     │   │
│  │  • Slack 시작 알림                                    │   │
│  │  • Execute Command → run-claude.sh 호출              │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ docker exec runner                │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  runner 컨테이너                                      │   │
│  │  • Node 20 + pnpm 10.33 + git + gh CLI              │   │
│  │  • Claude CLI (Max 플랜 OAuth, 영속 볼륨)            │   │
│  │  • Playwright (Linux 브라우저)                       │   │
│  │                                                     │   │
│  │  실행 흐름:                                          │   │
│  │  1. git checkout -b feat/issue-{N}                  │   │
│  │  2. claude -p "..." --allowedTools "..."            │   │
│  │  3. pnpm type-check && lint && build                │   │
│  │  4. git push + gh pr create                         │   │
│  │  5. 결과 JSON 반환                                   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  n8n 완료 처리                                        │   │
│  │  • Issue에 PR 링크 코멘트 + in-review 라벨           │   │
│  │  • Slack 완료 알림                                    │   │
│  │  • 실패 시 automation-failed 라벨                    │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ PR 생성
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repo (PR 생성됨)                                     │
│  └─▶ deploy.yml (PR CI) 자동 실행 → lint + build + E2E     │
│       └─▶ 사람이 최종 리뷰 후 수동 머지 (자동 머지 금지)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 구성 요소 스택

| 구성 요소 | 선택 | 역할 | 비용 |
|----------|------|------|------|
| **호스팅** | Oracle Cloud Free Tier (ARM Ampere 4vCPU/24GB) | 서버 인프라 | $0 |
| **OS** | Ubuntu 22.04 LTS | Docker 공식 지원 | — |
| **컨테이너** | Docker + Docker Compose v2 | 서비스 격리 | $0 |
| **오케스트레이션** | n8n (self-hosted) | 웹훅 수신·워크플로우 | $0 |
| **공개 접근** | Cloudflare Tunnel | HTTPS 웹훅 URL, 포트 개방 불필요 | $0 |
| **Claude 실행** | Claude CLI (Max 플랜 OAuth) | 코드 구현 자동화 | 기존 구독 |
| **GitHub 연동** | Fine-grained PAT + gh CLI | 브랜치·PR 생성 | $0 |
| **알림** | Slack Incoming Webhook | 시작·완료·실패 알림 | $0 |
| **가용성 모니터링** | Uptime Kuma | 서버 다운 감지 | $0 |

---

## 3. Phase별 로드맵

### 📊 전체 일정

```
Phase 0  ████░░░░░░░░░░░░░░░░  선결 확인 (사용자, 30분)
Phase 1  ░░░░████████░░░░░░░░  서버 인프라 (사용자, 1~2시간)
Phase 2  ░░░░░░░░████████░░░░  자산 구현 (Claude, 1세션)
Phase 3  ░░░░░░░░░░░░████████  배포·인증 (사용자, 1시간)
Phase 4  ░░░░░░░░░░░░░░░░████  E2E 검증 (공동, 1~2시간)
Phase 5  ░░░░░░░░░░░░░░░░░░░░  이관·최적화 (점진적)
```

---

### Phase 0 — 선결 확인 ⚡ 가장 먼저
> **담당**: 사용자 | **소요**: 30분 | **선행 조건**: 없음

| # | 작업 | 방법 | 상태 |
|---|------|------|------|
| 0-1 | **Anthropic Max 플랜 약관 확인** (unattended 사용 가능 여부) | [Usage Policy](https://www.anthropic.com/legal/usage-policy) 직접 확인. 불명확 시 support@anthropic.com 문의 | ⬜ |
| 0-2 | Oracle Cloud Free Tier 가입 | [cloud.oracle.com](https://cloud.oracle.com) — 신용카드 인증 필요, 과금 없음 | ⬜ |
| 0-3 | Cloudflare 계정 생성 | [cloudflare.com](https://cloudflare.com) — 무료 플랜 | ⬜ |
| 0-4 | 도메인 확보 | 기존 보유 시 스킵. 없으면 Namecheap/Cloudflare 등에서 구매 ($10~15/년) | ⬜ |
| 0-5 | 의사결정 확정 | §8 체크리스트 검토 후 Claude에게 결과 공유 | ⬜ |

> ⛔ **Phase 0-1이 실패하면 전체 방향 재검토 필요.** 약관 위반 시 계정 정지 위험.

---

### Phase 1 — 서버 인프라 구축
> **담당**: 사용자 주도 (Claude가 명령어 지원) | **소요**: 1~2시간

#### 1-1. Oracle VM 프로비저닝

1. Oracle Cloud 콘솔 → Compute → Instances → Create Instance
2. 설정값:
   - **Shape**: `VM.Standard.A1.Flex` (ARM Ampere)
   - **CPU**: 2~4개, **RAM**: 12~24GB (Free Tier 한도)
   - **OS**: Ubuntu 22.04 LTS
3. SSH 키 생성 및 등록
4. **고정 공인 IP** 할당 (Reserved IP)
5. **VCN Security List**: SSH(22)만 허용 — 웹훅은 Cloudflare Tunnel 경유

```bash
# 접속 확인
ssh -i ~/.ssh/oracle_key ubuntu@<공인IP>
```

#### 1-2. 서버 기본 환경 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Docker Compose v2 확인
docker compose version   # v2.x 이상 확인

# 작업 디렉토리 생성
mkdir -p ~/arcana-automation && cd ~/arcana-automation

# Cloudflare Tunnel 클라이언트 설치 (ARM64)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb
cloudflared --version    # 확인
```

#### 1-3. Cloudflare Tunnel 연결

1. Cloudflare Zero Trust 대시보드 → Networks → Tunnels → Create a tunnel
2. 이름: `arcana-n8n` → 커넥터 유형: `cloudflared`
3. 제공되는 설치 명령 실행:
   ```bash
   cloudflared service install <YOUR_TOKEN>
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```
4. Public Hostname 추가:
   - **Subdomain**: `n8n` | **Domain**: `<yourdomain>.com`
   - **Service**: `HTTP` → `localhost:5678`

```bash
# 터널 상태 확인
sudo systemctl status cloudflared
curl -I https://n8n.<yourdomain>.com   # 외부에서 접근 테스트
```

**✅ Phase 1 체크포인트**: `https://n8n.<yourdomain>.com`에 외부 접속 가능

---

### Phase 2 — 자동화 자산 구현
> **담당**: Claude 주도 | **소요**: 1세션 (3~5시간) | **선행 조건**: Phase 0 완료 + 의사결정 확정

Claude가 구현할 파일 목록 (§5 참조):

```
automation/
├── docker-compose.yml          # n8n + runner + uptime-kuma 스택
├── docker/
│   └── runner/
│       └── Dockerfile          # Node20 + pnpm + Claude CLI + gh + Playwright
├── scripts/
│   ├── run-claude.sh           # Issue → 구현 → PR 메인 스크립트
│   └── healthcheck.sh          # Claude CLI 인증 상태 확인
├── n8n/
│   └── workflow-issue-automation.json   # 신규 워크플로우
└── README.md                   # 운영 가이드

.claude/agents/
└── spec-implementer.md         # 신규 에이전트

.github/ISSUE_TEMPLATE/
└── spec.yml                    # automation-ready 체크박스 추가
```

**결과물**: PR 생성 → 사용자 리뷰 → 머지

---

### Phase 3 — 서버 배포 & 인증
> **담당**: 사용자 주도 | **소요**: 1시간 | **선행 조건**: Phase 2 PR 머지

#### 3-1. GitHub Fine-grained PAT 발급

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. 설정:

| 항목 | 값 |
|------|-----|
| Token name | `arcana-automation-bot` |
| Expiration | 90일 |
| Repository access | `xzawed31/ArcanaInsight` 단독 |
| Contents | **Read and write** |
| Issues | **Read and write** |
| Pull requests | **Read and write** |

3. 생성된 토큰 복사 → `.env` 파일에 저장

#### 3-2. 서버 .env 파일 작성

`~/arcana-automation/.env`:

```bash
# GitHub
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)   # 생성 후 복사
GITHUB_REPO=xzawed31/ArcanaInsight

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<강력한_비밀번호>
N8N_ENCRYPTION_KEY=$(openssl rand -hex 24)       # 생성 후 복사
N8N_HOST=n8n.<yourdomain>.com

# 빌드용 환경변수 (기존 값 재사용)
GROK_API_KEY=<기존 키>
NEXT_PUBLIC_SUPABASE_URL=<기존>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<기존>
SUPABASE_SERVICE_ROLE_KEY=<기존>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Slack 알림 (선택)
SLACK_WEBHOOK_URL=<Slack Incoming Webhook URL>
```

```bash
chmod 600 ~/arcana-automation/.env   # 반드시 권한 제한
```

#### 3-3. 코드 배포 & 컨테이너 실행

```bash
# Phase 2에서 머지된 코드 클론
cd ~/arcana-automation
git clone https://github.com/xzawed31/ArcanaInsight repo
cd repo/automation

# 컨테이너 빌드 & 실행
docker compose --env-file ../../.env up -d --build

# 로그 확인
docker compose logs -f
```

#### 3-4. Claude CLI Max 플랜 인증 ⚡ 핵심 단계

```bash
# runner 컨테이너 진입
docker compose exec runner bash

# CLI 로그인 (브라우저 OAuth 플로우)
claude login
# → URL이 출력됨
# → 로컬 PC 브라우저에서 URL 열기
# → Max 플랜 계정으로 승인
# → "Logged in as <email>" 확인

# 동작 확인
claude -p "hello, respond in Korean" --output-format text

exit
```

```bash
# 볼륨에 토큰 저장 확인
docker volume inspect arcana-automation_claude-auth
```

> ⚠️ **OAuth 토큰은 주기적으로 만료됩니다.** 만료 시 위 과정을 반복하면 됩니다. n8n 워크플로우가 만료를 감지하면 Slack 알림을 보냅니다.

#### 3-5. GitHub Webhook 등록

1. Repo → Settings → Webhooks → Add webhook
2. 설정:

| 항목 | 값 |
|------|-----|
| Payload URL | `https://n8n.<yourdomain>.com/webhook/arcana-spec` |
| Content type | `application/json` |
| Secret | `.env`의 `GITHUB_WEBHOOK_SECRET` 값 |
| Events | **Issues** + **Issue comments** 만 체크 |

3. "Add webhook" → Recent Deliveries에서 ping ✅ 확인

#### 3-6. n8n 워크플로우 활성화

1. `https://n8n.<yourdomain>.com` 접속 → 로그인
2. Workflows → Import → `automation/n8n/workflow-issue-automation.json` 업로드
3. Credentials 등록:
   - **GitHub Header Auth**: `Authorization: token <GITHUB_PAT>`
   - **Slack Webhook** (사용 시)
4. 워크플로우 **Activate** 토글 ON

**✅ Phase 3 체크포인트**: n8n 워크플로우 Active 상태, runner 컨테이너 실행 중, Claude CLI 인증 완료

---

### Phase 4 — End-to-End 검증
> **담당**: 사용자 + Claude 공동 | **소요**: 1~2시간 | **선행 조건**: Phase 3 완료

#### 4-1. 정상 경로 검증

아래 Issue를 GitHub에 직접 생성하여 테스트:

```markdown
제목: [spec] 테스트 자동화 — README 사소한 수정
라벨: spec, automation-ready

본문:
README.md 파일에서 "운영 URL" 앞에 이모지 🌐를 추가해주세요.
변경 전: **운영 URL**
변경 후: 🌐 **운영 URL**
```

**기대 결과** (5~10분 이내):
- [ ] Slack: "🤖 자동화 시작" 알림 수신
- [ ] GitHub Issue: `in-progress` 라벨 추가
- [ ] runner 컨테이너: Claude CLI 실행 로그 확인
- [ ] GitHub: `feat/issue-{N}` 브랜치 생성
- [ ] GitHub: PR 자동 생성 (`Fixes #{N}` 포함)
- [ ] GitHub Issue: `in-review` 라벨 + PR 링크 코멘트
- [ ] Slack: "✅ PR 생성 완료" 알림 수신
- [ ] deploy.yml (PR CI): 자동 실행 시작

#### 4-2. 실패 경로 검증

빌드 에러가 발생하는 Issue를 생성하여 실패 처리 동작 확인:
- `automation-failed` 라벨 부착 확인
- PR 미생성 확인
- Slack 실패 알림 수신 확인
- 자동 재트리거 **차단** 확인

#### 4-3. 반복성 검증

서로 다른 3개 Issue를 연속 처리하여 충돌·중복 없음 확인

**✅ Phase 4 체크포인트**: 3개 연속 Issue 정상 처리 → 운영 전환 승인

---

### Phase 5 — 이관 & 최적화 (점진적)
> **담당**: 공동 | **선행 조건**: Phase 4 안정화 (1~2주 운영 후)

| # | 작업 | 우선순위 |
|---|------|---------|
| 5-1 | n8n Cloud의 기존 3개 워크플로우 자체 서버로 이관 | 높음 |
| 5-2 | n8n Cloud 구독 해지 (비용 절감) | 높음 |
| 5-3 | Uptime Kuma + Healthchecks.io 이중 모니터링 설정 | 중간 |
| 5-4 | GitHub PAT 90일 만료 알림 cron 설정 | 중간 |
| 5-5 | E2E 테스트 러너 포함 여부 재검토 | 낮음 |
| 5-6 | runner 컨테이너 Docker 이미지 버전 고정 + watchtower 설정 | 낮음 |

---

## 4. 사용자 수행 작업 상세

> Claude가 대신 할 수 없는 작업만 정리합니다.

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 0 | Anthropic 약관 확인 / 계정 가입 | 30분 |
| 1 | Oracle VM 프로비저닝 | 30분 |
| 1 | Docker + cloudflared 설치 | 30분 |
| 1 | Cloudflare Tunnel 설정 | 30분 |
| 3 | GitHub PAT 발급 | 10분 |
| 3 | `.env` 파일 작성 | 10분 |
| 3 | `docker compose up` 실행 | 10분 |
| 3 | **Claude CLI Max 플랜 인증** (브라우저 OAuth) | 10분 |
| 3 | GitHub Webhook 등록 | 10분 |
| 3 | n8n 워크플로우 import + 활성화 | 10분 |
| 4 | 테스트 Issue 생성 + 결과 확인 | 30분 |
| **합계** | | **≈ 3~4시간** |

---

## 5. Claude가 구현할 자산

> Phase 2에서 Claude가 생성하고 PR로 제출하는 파일 목록

| 파일 | 유형 | 설명 |
|------|------|------|
| `automation/docker-compose.yml` | 신규 | n8n + runner + uptime-kuma 스택 |
| `automation/docker/runner/Dockerfile` | 신규 | Node20 + pnpm + Claude CLI + gh + Playwright |
| `automation/scripts/run-claude.sh` | 신규 | Issue → 구현 → PR 메인 실행 스크립트 |
| `automation/scripts/healthcheck.sh` | 신규 | Claude CLI 인증 상태 주기 점검 |
| `automation/n8n/workflow-issue-automation.json` | 신규 | n8n 자동화 워크플로우 |
| `automation/README.md` | 신규 | 운영 가이드 (재시작·토큰 갱신·복구) |
| `.claude/agents/spec-implementer.md` | 신규 | Issue 구현 전용 에이전트 |
| `.github/ISSUE_TEMPLATE/spec.yml` | 수정 | `automation-ready` 체크박스 추가 |
| `CLAUDE.md` | 수정 | 자동화 섹션 신설, n8n 섹션 업데이트 |

**기존 재사용 자산**:
- `n8n/workflow-spec-tracker.json` — 웹훅·필터·GitHub API 패턴
- `.claude/agents/quality-gate.md` — spec-implementer 에이전트 템플릿
- `scripts/pre-push-checks.sh` — runner의 push 전 검증
- `.github/workflows/deploy.yml` — PR 생성 후 CI (변경 없음)

---

## 6. 리스크 & 완화 방안

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| ⛔ **Max 플랜 unattended 사용 약관 위반** | 치명 | Phase 0에서 약관 확인 필수. 위반 시 Path A로 전환 |
| 🔴 Max 플랜 사용량 한도 초과 | 높음 | 일일 처리 Issue 수 제한 (최대 10개), 한도 도달 시 다음 날 재시도 |
| 🔴 Claude OAuth 토큰 만료 | 높음 | 주간 헬스체크 cron + 만료 시 Slack 즉시 알림 + 자동화 일시 중지 |
| 🟡 악의적 Issue (프롬프트 인젝션) | 중간 | `--allowedTools` 화이트리스트, `rm -rf`·`--force`·`--no-verify` deny, **자동 머지 절대 금지** |
| 🟡 서버 다운 | 중간 | Uptime Kuma 감시 + 수동 처리 폴백 |
| 🟡 무한 루프 (실패 → 재트리거) | 중간 | 같은 Issue 재실행 최대 2회, `automation-failed` 라벨로 추가 트리거 차단 |
| 🟢 Cloudflare Tunnel 끊김 | 낮음 | systemd 자동 재시작, GitHub Webhook 자동 재시도 |
| 🟢 GitHub PAT 유출 | 낮음 | 90일 만료 + fine-grained (리포 1개), `.env` chmod 600 |
| 🟢 E2E 러너 내 실패 | 낮음 | E2E는 PR CI(deploy.yml)에 위임, 러너는 포함하지 않음 |

---

## 7. 예상 비용

| 항목 | 월 비용 | 비고 |
|------|---------|------|
| Oracle Cloud Free Tier | **$0** | 영구 무료 |
| Cloudflare Tunnel | **$0** | 무료 플랜 |
| 도메인 | **~$1** | 연 $10~15 분할 |
| Claude Max 플랜 | **기존 구독** | 추가 비용 없음 |
| GitHub Actions (PR CI만) | **$0** | 월 2,000분 한도 내 |
| n8n self-hosted | **$0** | 라이선스 비용 없음 |
| **합계** | **≈ $0~1/월** | |

> **비교**: Path A (GitHub Actions + Anthropic API) 사용 시 월 $3~8 예상 → 연간 $36~96 절감

---

## 8. 의사결정 체크리스트

Phase 0 시작 전 아래 항목을 확정하고 Claude에게 공유해주세요.

### 필수 확정 사항

- [ ] **Anthropic Max 플랜 약관 확인 완료** (가장 중요)
- [ ] Oracle Cloud Free Tier 가입 가능 확인 (신용카드 준비)
- [ ] 도메인 보유 여부 확인

### 선택 확정 사항

- [ ] **알림 채널**: Slack / Discord / 이메일 중 선택
- [ ] **자동화 트리거 라벨**: `spec` 단독 vs `spec + automation-ready` 이중 (이중 권장)
- [ ] **봇 전용 GitHub 계정** 신설 여부 (보안상 권장, 기존 계정 PAT 사용도 가능)
- [ ] **E2E 테스트** 러너 포함 여부 (PR CI 위임 권장)
- [ ] n8n Cloud 기존 워크플로우 이관 시점 (Phase 4 검증 후 권장)

---

## 📌 다음 단계

```
현재 위치: 로드맵 작성 완료

다음 액션 (사용자):
  1. §8 의사결정 체크리스트 검토
  2. Phase 0 시작 (Anthropic 약관 확인 → 계정 준비)
  3. Phase 0 완료 후 Claude에게 결과 공유

다음 액션 (Claude):
  Phase 0·1 완료 확인 후 → Phase 2 자동화 자산 구현 시작
```

---

*최종 수정: 2026-04-18 | 작성: Claude Sonnet 4.6*
