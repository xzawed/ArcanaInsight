# 문서 감사 및 역할 정렬 설계

> **작성일**: 2026-05-10
> **브랜치**: `docs/doc-audit-cleanup-2026-05-09`
> **접근 방식**: B — 카테고리별 병렬 에이전트

---

## 1. 배경 및 목적

현재 브랜치에서 `AGENTS.md` 재작성과 `claude-codex-collaboration.md` 신규 생성이 완료되어 협업 프로토콜의 **정본**이 수립됐다. 그러나 나머지 `workflow/`, `conventions/`, `operations/` 문서들은 여전히 구 모델("Claude CLI가 기획+구현+검토 모두 수행")로 작성되어 있거나 역할 소유권이 불명확하다.

이번 작업의 목표는 세 가지다:

1. **정합성 업데이트**: 모든 문서가 Claude(설계·결정) / Codex(구현·검증) 협업 모델을 반영하도록 전면 재작성
2. **역할 분담 명시 강화**: 각 문서 상단에 담당자 메타 블록 추가, 주요 단계마다 역할 레이블 삽입
3. **중복 제거**: `CLAUDE.md` · `AGENTS.md` · `claude-codex-collaboration.md` 간 중복 내용을 참조 링크로 통일

---

## 2. 핵심 변경 원칙

| 원칙 | 내용 |
|------|------|
| **정본 단일화** | 역할 규칙은 `claude-codex-collaboration.md`가 정본. 다른 문서는 요약 후 링크 |
| **메타 블록 통일** | 모든 문서 H1 바로 아래 담당자 블록 삽입 |
| **AGENTS.md 경량화** | 기술 스택·구조·아키텍처 중복 섹션 제거 → CLAUDE.md 링크 1줄로 대체 |
| **code-change-process 재작성** | Claude 단계 / Codex 단계 / 공동 단계 3분류로 이중 흐름도 삽입 |
| **conventions 소유권 명시** | 내용 변경 없이 "결정자: Claude / 준수 의무: Codex" 블록만 추가 |

### 표준 메타 블록 형식

```markdown
> **담당**: Claude (설계·결정) | Codex (구현·검증)
> 협업 프로토콜 정본: [`docs/workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

---

## 3. 에이전트 분담

### Agent 1 — CLAUDE.md + AGENTS.md

**목표**: 두 루트 파일의 독자를 완전히 분리하고 중복 제거

**AGENTS.md 변경 사항**:
- 제거: 기술 스택 표 (→ `CLAUDE.md` 링크 1줄)
- 제거: 프로젝트 구조 트리 (→ `CLAUDE.md` 링크 1줄)
- 제거: 핵심 아키텍처 5개 항목 (→ `CLAUDE.md` 링크 1줄)
- 제거: 환경변수 섹션 (→ `docs/operations/env-variables.md` 링크)
- 제거: 캐릭터/데이터 기준 (→ `CLAUDE.md` 링크 1줄)
- 유지: Codex 세션 시작 순서, 담당 작업 경계, 금지 파일 표, 검증 명령어, 재진입 조건, 완료 보고 형식, 업무별 참조 문서 표

**CLAUDE.md 변경 사항**:
- "Claude & Codex 역할 분담" 섹션을 2줄 요약 + `claude-codex-collaboration.md` 링크로 압축
- "Claude가 Codex에게 전달 시 필수 포함" / "Codex 결과 수령 후 Claude가 검토" 상세 목록 제거 (정본 링크로 대체)
- Claude 전용 섹션 유지: 세션 시작 순서, 업무별 진입점, 필수 주의사항

**성공 기준**:
- AGENTS.md 130줄 이하 (현재 ~186줄, 유지 섹션 합산 시 ~130줄이 현실적)
- CLAUDE.md 250줄 이하 유지
- 두 파일 모두 기술 스택 중복 없음

---

### Agent 2 — workflow/ 전체

**담당 파일**: `code-change-process.md`, `task-playbooks.md`, `unit-testing.md`, `e2e-testing.md`, `ci-cd.md`, `scripts.md`

#### code-change-process.md (전면 재작성)

현재 서두: "진입점은 항상 Claude CLI에 대한 사용자의 직접 지시이며, Claude CLI가 기획/구현/검토를 모두 수행합니다" → 삭제

새 서두: Claude(설계·결정·검토)와 Codex(구현·검증·테스트)가 단계를 분담한다고 명시

7단계 역할 재분류:
- **Claude 단계**: 1단계(기획·스펙), 3단계(변경 리뷰), 7단계(CLAUDE.md 최신화)
- **Codex 단계**: 2단계(로컬 검증), 5단계(CI 결과 수정)
- **4단계**: Codex가 구현 커밋 → Claude가 PR 생성·설명 작성
- **6단계**: Claude가 머지 판단 → Railway 자동 배포 → Claude가 QA 확인

이중 흐름도 삽입:
```
사용자 → Claude (1단계: 기획·스펙·스캐폴딩·브랜치 개설)
  └─ Codex (2단계: 구현 + 로컬 검증 4종)
       └─ Claude (3단계: 아키텍처·보안·규칙 검토)
            └─ Codex (4a: 구현 커밋) → Claude (4b: PR 생성·설명 작성)
                 └─ CI 자동 검증 (5단계)
                      ├─ 실패 → Codex 수정 → Claude 재검토
                      └─ 통과 → Claude (6단계: 머지 판단) → Railway 자동 배포
                           └─ Claude (7단계: CLAUDE.md 최신화)
```

#### task-playbooks.md

각 업무 섹션 제목에 담당 레이블 추가:
- `## 새 캐릭터 추가 [Claude → Codex]` (Claude가 스펙, Codex가 데이터/이미지 배치)
- `## 새 운세 서비스 추가 [Claude → Codex]` (Claude가 인터페이스 스캐폴딩, Codex가 본문 구현)
- `## 새 페이지 추가 [Claude → Codex]`
- `## 테마·스타일 변경 [Codex]`
- `## 카드 스킨 추가·변경 [Codex]`
- 기타 섹션 동일 방식

#### unit-testing.md, e2e-testing.md

- 상단 메타 블록 추가 (담당: Codex — 작성·실행 / Claude — 시나리오 기획·임계값 결정)
- 내용 변경 없음

#### ci-cd.md, scripts.md

- 상단 메타 블록 추가
- CI 실패 시 대응 흐름에 역할 주석 추가 (Codex가 수정, Claude가 재진입 여부 판단)

---

### Agent 3 — conventions/ 전체

**담당 파일**: `coding-style.md`, `cross-platform.md`, `i18n-style.md`, `image-assets.md`, `layout-rules.md`, `zod-schemas.md`

**변경 방식**: 내용 변경 없음. 각 파일 H1 바로 아래 메타 블록만 삽입.

각 파일별 담당 블록:
```markdown
> **결정자**: Claude (규칙 정의·예외 승인)
> **준수 의무**: Codex (구현 시 반드시 준수)
> 협업 프로토콜 정본: [`docs/workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

`i18n-style.md` 추가 명시: "키 네이밍 결정은 Claude, 번역 값 작성은 Codex"

`image-assets.md` 추가 명시: "경로 규칙 정의는 Claude, 이미지 배치·생성 작업은 Codex"

---

### Agent 4 — operations/ 전체

**담당 파일**: `deployment.md`, `env-variables.md`, `known-issues.md`, `monitoring.md`, `operation-guide.md`

#### deployment.md

- 상단 메타 블록: 배포 전략 결정(Claude) / 롤백 명령 실행(Codex)
- "자동 배포 흐름" 섹션에 단계별 역할 주석 추가

#### env-variables.md

- 상단 메타 블록: 환경변수 추가·변경 결정(Claude) / 로컬 `.env` 설정 및 확인(Codex)

#### known-issues.md

- 이슈 테이블에 `담당` 컬럼 추가 (Claude = 설계 결정 필요 이슈, Codex = 구현으로 해결 가능 이슈)

#### monitoring.md

- 상단 메타 블록: 알림 해석·대응 결정(Claude) / 수정 코드 구현(Codex)

#### operation-guide.md

- 상단 메타 블록 추가
- 운영자(사용자) / Claude / Codex 3자 역할 구분 명시

---

## 4. 금지 사항 (모든 에이전트 공통)

- `docs/architecture/` 파일 수정 금지 (범위 외)
- `docs/superpowers/` 파일 수정 금지 (스펙·플랜 아카이브)
- `src/` 코드 수정 금지
- `CLAUDE.md` · `AGENTS.md` 는 Agent 1만 수정

---

## 5. 완료 조건 (DoD)

- [ ] 모든 수정 파일에 메타 블록 삽입 완료
- [ ] `AGENTS.md` 100줄 이하 (중복 섹션 제거)
- [ ] `CLAUDE.md` 250줄 이하 유지
- [ ] `code-change-process.md`에 이중 흐름도 포함
- [ ] `task-playbooks.md` 모든 업무 섹션에 역할 레이블
- [ ] `known-issues.md` 담당 컬럼 추가
- [ ] `pnpm check:doc-links` 통과 (링크 깨짐 없음)
- [ ] 변경된 파일 모두 단일 커밋으로 정리

---

## 6. 재진입 조건

아래 상황 발생 시 에이전트 작업 중단 후 Claude에게 보고:
- 문서 내용이 현재 코드와 충돌하여 사실 관계 확인 필요
- 역할 분류가 모호한 작업 유형 발견
- 기존 링크 구조 변경이 필요한 경우 (`pnpm check:doc-links` 실패 예상 시)
