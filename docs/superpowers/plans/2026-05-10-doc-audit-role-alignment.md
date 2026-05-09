# 문서 감사 및 역할 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 workflow/conventions/operations 문서를 Claude(설계·결정) / Codex(구현·검증) 협업 모델에 맞게 전면 재작성하고, CLAUDE.md·AGENTS.md 간 중복을 제거한다.

**Architecture:** 4개 독립 태스크(CLAUDE.md+AGENTS.md / workflow / conventions / operations)를 병렬 실행 가능하도록 설계. 각 태스크는 서로 다른 파일을 수정하므로 충돌 없음. 최종 단계에서 `pnpm check:doc-links`로 링크 정합성 검증.

**Tech Stack:** Markdown 파일 직접 수정. `pnpm check:doc-links` 검증 명령 사용.

---

## 공통 메타 블록 (모든 태스크에서 사용)

문서 H1 바로 아래에 삽입할 표준 블록:

```markdown
> **담당**: Claude (설계·결정) | Codex (구현·검증)
> 협업 프로토콜 정본: [`docs/workflow/claude-codex-collaboration.md`](경로는-파일-위치에-맞게-조정)
```

각 파일에서 `claude-codex-collaboration.md`의 상대 경로:
- `workflow/` 파일: `claude-codex-collaboration.md`
- `conventions/` 파일: `../workflow/claude-codex-collaboration.md`
- `operations/` 파일: `../workflow/claude-codex-collaboration.md`

---

## Task 1: CLAUDE.md — 역할 분담 섹션 압축

**Files:**
- Modify: `CLAUDE.md:122-138`

현재 "Claude & Codex 역할 분담" 섹션(122~138줄)에서 두 서브섹션을 제거하고 링크로 대체한다.

- [ ] **Step 1: CLAUDE.md 역할 분담 섹션 수정**

`CLAUDE.md`에서 아래 블록을 찾아 교체한다.

제거 대상 (old):
```markdown
## Claude & Codex 역할 분담

**Claude 담당**: 기획·설계·아키텍처·문서·뼈대 스캐폴딩·PR 검토·머지 판단
**Codex 담당**: 코드 구현·단위 테스트·E2E 수정·로컬 검증 4종 실행

전체 협업 프로토콜(핸드오프 형식·재진입 조건·파일 소유권)은 [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md)가 정본이다.

### Claude가 Codex에게 전달 시 필수 포함
- 참조 파일 목록 (읽을 순서)
- 구현 범위 (생성·수정·금지 파일 구분)
- 완료 조건 (DoD 체크리스트)
- 재진입 조건 (명시적으로)

### Codex 결과 수령 후 Claude가 검토
- 아키텍처 정합성 (레이어 경계, FallbackProvider, DB 추상화)
- 보안 순서 (Rate Limit → Zod → Auth → 소유권)
- 문서 동기화 필요 여부 (`CLAUDE.md`, task-playbooks)
```

교체 내용 (new):
```markdown
## Claude & Codex 역할 분담

**Claude 담당**: 기획·설계·아키텍처·문서·뼈대 스캐폴딩·PR 검토·머지 판단
**Codex 담당**: 코드 구현·단위 테스트·E2E 수정·로컬 검증 4종 실행

핸드오프 형식·재진입 조건·파일 소유권·품질 게이트 전체는 [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md)가 정본이다.
```

- [ ] **Step 2: 줄 수 확인**

수정 후 `CLAUDE.md`의 총 줄 수가 250 이하인지 확인한다.

```bash
(Get-Content CLAUDE.md).Count
```

예상: 140줄 내외 (기존 149줄에서 11줄 감소)

- [ ] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 역할 분담 섹션 — 상세 목록 제거, 협업 정본 링크로 압축"
```

---

## Task 2: AGENTS.md — 중복 섹션 제거 및 경량화

**Files:**
- Modify: `AGENTS.md`

기술 스택·프로젝트 구조·핵심 아키텍처·환경변수·캐릭터/데이터 섹션(총 ~53줄)을 참조 링크로 교체한다.

- [ ] **Step 1: 기술 스택·구조·아키텍처 섹션 교체**

`AGENTS.md`에서 아래 세 섹션을 찾아 통합 1줄로 교체한다.

제거 대상 — `## 기술 스택` 전체 (기술 스택 표):
```markdown
## 기술 스택

| 영역 | 현재 기준 |
|---|---|
| 언어/프레임워크 | TypeScript strict, Next.js 16.2.3 App Router, React 19.2.4 |
| 스타일/애니메이션 | Tailwind CSS v4, Framer Motion v12.38 |
| AI | Grok API 우선, Claude API 자동 fallback |
| 인증/DB | Supabase Auth + Supabase PostgreSQL 기본, `DB_PROVIDER=postgres` 전환 시 NextAuth.js v5 + Drizzle |
| 상태/패키지 | Zustand v5, pnpm 10.33.0 |
| i18n | 자체 translations 모듈, ko/en/ja, `ai_locale` 쿠키 |
| 테스트 | Vitest, Playwright |
| 배포 | GitHub Actions, Railway |
```

제거 대상 — `## 프로젝트 구조` 전체 (구조 트리 + 코드 블록):
```markdown
## 프로젝트 구조

```text
src/
├── app/             # App Router 페이지와 API
├── components/      # card, character, chat, common, effects, home, layout, saju, shinjeom, skin, tarot
├── data/            # cards, characters, home, saju, shinjeom, skins, spreads, topics
├── hooks/           # Zustand store와 UI/streaming hooks
├── i18n/            # locale 감지, Provider, useT, translations
├── lib/             # env, auth, db, storage, validation, request/rate-limit 유틸
├── services/        # core AI provider/fallback + tarot/saju/shinjeom 서비스
├── test-helpers/    # Vitest 공통 mock/setup
└── types/           # 공유 타입 (변경 시 Claude 재진입)

docs/                # architecture, conventions, workflow, operations
e2e/                 # Playwright specs
scripts/             # 유틸리티 스크립트
supabase/migrations/ # Supabase SQL migrations
```
```

제거 대상 — `## 핵심 아키텍처 (구현 시 준수)` 전체:
```markdown
## 핵심 아키텍처 (구현 시 준수)

- **AI 신뢰성**: `FallbackProvider`가 Grok 우선 → Claude API fallback. `src/services/core/` 참조
- **DB 추상화**: 항상 `getDb()` / `getAdminDb()`를 경유. 직접 Supabase client 사용 금지
- **API 보안 순서**: Rate Limit → Zod `safeParse` → Auth → 소유권 검증. 순서 변경 금지
- **SSE 스트리밍**: `SSE_HEADERS`, `fetchSSEStream()`, `AbortController` 패턴 준수
- **i18n**: UI 텍스트는 `t()` / `useT()` 경유. 하드코딩 금지
```

세 섹션 자리에 아래 단일 섹션으로 교체:
```markdown
## 기술 스택 · 프로젝트 구조 · 핵심 아키텍처

> 기술 스택, 구조 트리, 아키텍처 패턴 전체는 `CLAUDE.md`를 참조한다.
> 구현 시 준수해야 할 아키텍처 규칙은 [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md)가 상세 정본이다.
```

- [ ] **Step 2: 환경변수 섹션 교체**

제거 대상:
```markdown
## 환경변수

전체 목록: [`docs/operations/env-variables.md`](docs/operations/env-variables.md)

- Supabase 기본: `GROK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- PostgreSQL 모드 추가: `DB_PROVIDER=postgres`, `POSTGRES_URL`, `NEXTAUTH_SECRET`
```

교체 내용:
```markdown
## 환경변수

> 전체 목록 및 설정 절차: [`docs/operations/env-variables.md`](docs/operations/env-variables.md)
```

- [ ] **Step 3: 캐릭터/데이터 기준 섹션 교체**

제거 대상:
```markdown
## 캐릭터/데이터 기준

- 캐릭터 12명: `arcana`, `miko`, `seonhwa`, `hoshi`, `luna`, `rei`, `cairn`, `zero`, `haru`, `ren`, `lix`, `ethan`
- 표정 6종: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- 이미지 경로: `public/images/characters/[id]/nukki/[mood].png`
```

교체 내용:
```markdown
## 캐릭터/데이터 기준

> 캐릭터 목록, 표정 타입, 이미지 경로 규칙: `CLAUDE.md` 및 [`docs/architecture/data-model.md`](docs/architecture/data-model.md) 참조.
```

- [ ] **Step 4: AGENTS.md 상단에 Codex 메타 블록 추가**

파일 최상단 H1 바로 아래(role 요약 앞)에 삽입:

현재 구조:
```markdown
# ArcanaInsight — Codex 전용 지침

일본 애니메이션 스타일 캐릭터와 대화하며 타로, 사주, 신점 리딩을 받는 운세 종합 콘텐츠 플랫폼.

> **Codex의 역할**: 실제 코드 구현, 코드 검증, 테스트 수행
> Claude와의 협업 전체 규칙은 [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md) 참조.
```

변경 없음 — 이미 Codex 역할 명시가 되어 있으므로 유지.

- [ ] **Step 5: 줄 수 확인**

```bash
(Get-Content AGENTS.md).Count
```

예상: 130줄 내외 (기존 186줄에서 ~53줄 감소 + 교체 6줄 추가)

- [ ] **Step 6: 커밋**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md 중복 섹션 제거 — 기술 스택·구조·아키텍처·환경변수·캐릭터 → 참조 링크로 경량화"
```

---

## Task 3: code-change-process.md — 전면 재작성

**Files:**
- Modify: `docs/workflow/code-change-process.md`

현재 "Claude CLI가 기획+구현+검토 모두 수행" 서두를 제거하고 Claude+Codex 이중 흐름으로 재작성한다.

- [ ] **Step 1: 파일 상단 메타 블록 + 서두 교체**

현재 서두:
```markdown
# 코드 변경 프로세스

모든 코드 변경에 적용되는 7단계 프로세스입니다. 진입점은 항상 **Claude CLI에 대한 사용자의 직접 지시**이며, Claude CLI가 기획/구현/검토를 모두 수행합니다.
```

교체 내용:
```markdown
# 코드 변경 프로세스

> **담당**: Claude (기획·설계·검토·머지 판단) | Codex (구현·로컬 검증·테스트)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)

모든 코드 변경에 적용되는 7단계 프로세스입니다. Claude가 설계·검토를 담당하고, Codex가 구현·검증을 담당합니다.
```

- [ ] **Step 2: 7단계에 역할 레이블 추가**

각 단계 제목을 아래와 같이 수정한다:

```markdown
### 1단계: 기획·스펙·스캐폴딩 `[Claude]`
- 사용자가 Claude에게 직접 지시 → Claude가 스펙 작성·설계·뼈대 스캐폴딩 수행
- `fix/*`, `feat/*`, `docs/*`, `chore/*` 기능 브랜치 개설 (main 직접 push 금지)

### 2단계: 구현 + 로컬 검증 `[Codex]`
- Codex가 Claude 스캐폴딩을 이어받아 본문 구현
- 완료 후 검증 4종 전부 실행:
```

```markdown
### 3단계: 아키텍처·보안·규칙 검토 `[Claude]`
- Claude가 Codex 결과물 검토: 스펙 준수, 레이어 경계, 보안 순서 점검
```

```markdown
### 4단계: 구현 커밋 + PR 생성 `[Codex → Claude]`
- Codex가 구현 커밋 생성
- Claude가 PR 설명 작성 및 생성

아래 prefix 규칙에 맞는 커밋 메시지 작성 후 PR 생성.
```

```markdown
### 5단계: CI 자동 검증 `[자동화 → Codex 수정]`
- GitHub Actions 자동 실행: `lint → build → e2e` (Chromium)
- CI 실패 → Codex가 수정 → Claude가 재검토 후 2단계부터 반복
- CI 통과 → 6단계로 진행
```

```markdown
### 6단계: 머지 판단 + 자동 배포 `[Claude → Railway]`
- Claude가 PR 최종 검토 후 머지 판단
- PR 머지 → main push → Railway 자동 배포
- QA 실패 Issue가 열려있으면 자동 재검증 트리거 (`qa-recheck.yml`)
```

```markdown
### 7단계: CLAUDE.md 최신화 `[Claude]` (필수, 예외 없음)
```

- [ ] **Step 3: 전체 흐름도 교체**

기존 흐름도 블록을 새 이중 흐름도로 교체:

```markdown
## 전체 흐름도

```
사용자
  └─ Claude [1단계]: 기획·스펙·브랜치 개설·스캐폴딩
       └─ Codex [2단계]: 본문 구현 + 로컬 검증 4종
            └─ Claude [3단계]: 아키텍처·보안·규칙 검토
                 ├─ 문제 발견 → Codex 2단계 재진입
                 └─ 통과 → Codex [4a]: 구현 커밋
                      └─ Claude [4b]: PR 생성·설명 작성
                           └─ CI 자동 검증 [5단계]
                                ├─ 실패 → Codex 수정 → Claude 재검토
                                └─ 통과 → Claude [6단계]: 머지 판단
                                     └─ Railway 자동 배포
                                          └─ Claude [7단계]: CLAUDE.md 최신화
```
```

- [ ] **Step 4: 커밋**

```bash
git add docs/workflow/code-change-process.md
git commit -m "docs: code-change-process — Claude+Codex 이중 흐름 모델로 전면 재작성"
```

---

## Task 4: task-playbooks.md — 역할 레이블 추가

**Files:**
- Modify: `docs/workflow/task-playbooks.md`

- [ ] **Step 1: 파일 상단 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (스펙·스캐폴딩 결정) | Codex (파일 생성·구현·테스트)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)
```

- [ ] **Step 2: 각 업무 섹션 제목에 역할 레이블 추가**

```markdown
## 새 캐릭터 추가 `[Claude → Codex]`
```
(Claude가 스펙·이미지 디렉토리 구조 결정, Codex가 데이터 파일 및 이미지 배치)

```markdown
## 새 운세 서비스(DivinationService) 추가 `[Claude → Codex]`
```
(Claude가 인터페이스·타입·스캐폴딩, Codex가 서비스 본문·API 라우트·테스트 구현)

```markdown
## 새 페이지 추가 `[Claude → Codex]`
```
(Claude가 라우트 구조·Props 인터페이스 정의, Codex가 컴포넌트 구현)

```markdown
## 테마·스타일 변경 `[Codex]`
```
(Claude 검토는 필요하지만 구현 전담은 Codex)

```markdown
## 카드 스킨 추가·변경 `[Codex]`
```

나머지 섹션도 동일 패턴으로 확인 후 레이블 추가. 섹션이 없으면 `[Claude]`, `[Codex]`, `[Claude → Codex]` 중 적합한 것 선택.

- [ ] **Step 3: 커밋**

```bash
git add docs/workflow/task-playbooks.md
git commit -m "docs: task-playbooks — 업무별 Claude/Codex 역할 레이블 추가"
```

---

## Task 5: workflow/ 나머지 4개 파일 — 메타 블록 추가

**Files:**
- Modify: `docs/workflow/unit-testing.md`
- Modify: `docs/workflow/e2e-testing.md`
- Modify: `docs/workflow/ci-cd.md`
- Modify: `docs/workflow/scripts.md`

- [ ] **Step 1: unit-testing.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Codex (테스트 작성·실행·커버리지 유지) | Claude (임계값 결정·패턴 정의)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)
```

- [ ] **Step 2: e2e-testing.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Codex (spec 작성·수정·실행) | Claude (테스트 시나리오 기획·셀렉터 전략 결정)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)
```

- [ ] **Step 3: ci-cd.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (CI 실패 원인 분석·머지 판단) | Codex (실패 수정·재검증 실행)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)
```

- [ ] **Step 4: scripts.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (`pnpm check:doc-links`, `pnpm check:env-docs` 결과 해석·대응 결정) | Codex (`pnpm type-check`, `pnpm lint`, `pnpm test:coverage`, `pnpm build` 실행)
> 협업 프로토콜 정본: [`claude-codex-collaboration.md`](claude-codex-collaboration.md)
```

- [ ] **Step 5: 커밋**

```bash
git add docs/workflow/unit-testing.md docs/workflow/e2e-testing.md docs/workflow/ci-cd.md docs/workflow/scripts.md
git commit -m "docs: workflow/ 나머지 4개 파일 — 담당자 메타 블록 추가"
```

---

## Task 6: conventions/ 6개 파일 — 메타 블록 추가

**Files:**
- Modify: `docs/conventions/coding-style.md`
- Modify: `docs/conventions/cross-platform.md`
- Modify: `docs/conventions/i18n-style.md`
- Modify: `docs/conventions/image-assets.md`
- Modify: `docs/conventions/layout-rules.md`
- Modify: `docs/conventions/zod-schemas.md`

내용 변경 없음. 각 파일 H1 바로 아래에 메타 블록만 삽입.

- [ ] **Step 1: coding-style.md**

```markdown
> **결정자**: Claude (규칙 정의·예외 승인) | **준수 의무**: Codex (모든 구현 코드)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 2: cross-platform.md**

```markdown
> **결정자**: Claude (규칙 정의·예외 승인) | **준수 의무**: Codex (컴포넌트·스타일 구현 시)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 3: i18n-style.md**

```markdown
> **결정자**: Claude (키 네이밍·구조 결정) | **준수 의무**: Codex (번역 값 작성·`useT()` 사용)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 4: image-assets.md**

```markdown
> **결정자**: Claude (경로 규칙·포맷 기준 정의) | **준수 의무**: Codex (이미지 배치·생성·교체 작업)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 5: layout-rules.md**

```markdown
> **결정자**: Claude (5:5 비율·모바일 배치 기준 정의) | **준수 의무**: Codex (캐릭터 등장 페이지 구현 시)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 6: zod-schemas.md**

```markdown
> **결정자**: Claude (스키마 구조·null/undefined 규칙 결정) | **준수 의무**: Codex (API 라우트 구현 시)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 7: 커밋**

```bash
git add docs/conventions/
git commit -m "docs: conventions/ 6개 파일 — 결정자/준수 의무 메타 블록 추가"
```

---

## Task 7: operations/ 5개 파일 — 역할 블록 + known-issues 컬럼

**Files:**
- Modify: `docs/operations/deployment.md`
- Modify: `docs/operations/env-variables.md`
- Modify: `docs/operations/known-issues.md`
- Modify: `docs/operations/monitoring.md`
- Modify: `docs/operations/operation-guide.md`

- [ ] **Step 1: deployment.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (배포 전략·머지 판단·롤백 결정) | Codex (롤백 명령 실행·핫픽스 브랜치 구현)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 2: env-variables.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (신규 환경변수 추가·변경 결정, `src/lib/env.ts` getter 설계) | Codex (로컬 `.env` 설정·확인, getter 함수 사용)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 3: known-issues.md 메타 블록 + 담당 컬럼 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (이슈 발굴·해결 방향 결정·파기 확정) | Codex (구현으로 해결 가능한 이슈 처리)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

기술 부채 테이블에 `담당` 컬럼 추가:

기존:
```markdown
| 항목 | 파일 | 현황 | 해결 조건 |
|------|------|------|----------|
```

교체:
```markdown
| 항목 | 파일 | 현황 | 해결 조건 | 담당 |
|------|------|------|----------|------|
```

기존 행들에도 담당 컬럼 추가:
- `커버리지 측정 범위 협소` → `Claude` (임계값 정책 결정)
- `postgres-adapter.ts Drizzle as any 잔존 5건` → `파기 확정` (재작업 불필요)

파기 확정 테이블에도 동일하게 담당 컬럼 추가:
```markdown
| 항목 | 파기 근거 | 담당 |
|------|----------|------|
```
각 항목 → `파기 확정 (Claude 결정)`

- [ ] **Step 4: monitoring.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (알림 해석·대응 우선순위 결정) | Codex (수정 코드 구현·PR 생성)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

QA 실패 대응 절차 섹션에 역할 주석 추가:
```markdown
### QA 실패 시 대응 절차

1. [Claude] 자동 생성된 GitHub Issue 확인 및 우선순위 판단
2. [Claude] 실패한 spec 파일 + 디바이스 조합 파악
3. [Codex] 로컬에서 재현: `pnpm test:e2e --grep "실패한 테스트명"`
4. [Codex] 수정 후 `fix/*` 브랜치에서 PR 생성
5. [Claude] PR 검토 후 머지 → `qa-recheck.yml` 자동 재실행 → Issue 자동 닫기
```

- [ ] **Step 5: operation-guide.md 메타 블록 추가**

H1 바로 아래에 삽입:
```markdown
> **담당**: Claude (서비스 구조 이해·장애 판단·환경변수 변경 결정) | Codex (핫픽스 구현·설정 변경 실행)
> 협업 프로토콜 정본: [`../workflow/claude-codex-collaboration.md`](../workflow/claude-codex-collaboration.md)
```

- [ ] **Step 6: 커밋**

```bash
git add docs/operations/
git commit -m "docs: operations/ 5개 파일 — 역할 메타 블록 추가, known-issues 담당 컬럼 추가"
```

---

## Task 8: 최종 검증 및 PR 생성

**Files:**
- Read-only verification

- [ ] **Step 1: 문서 링크 검증**

```bash
pnpm check:doc-links
```

예상: 0 broken links. 실패 시 해당 파일로 이동해 링크 수정 후 재실행.

- [ ] **Step 2: 변경 파일 목록 확인**

```bash
git diff main...HEAD --stat
```

예상 파일 목록:
- `CLAUDE.md`
- `AGENTS.md`
- `docs/workflow/code-change-process.md`
- `docs/workflow/task-playbooks.md`
- `docs/workflow/unit-testing.md`
- `docs/workflow/e2e-testing.md`
- `docs/workflow/ci-cd.md`
- `docs/workflow/scripts.md`
- `docs/conventions/coding-style.md`
- `docs/conventions/cross-platform.md`
- `docs/conventions/i18n-style.md`
- `docs/conventions/image-assets.md`
- `docs/conventions/layout-rules.md`
- `docs/conventions/zod-schemas.md`
- `docs/operations/deployment.md`
- `docs/operations/env-variables.md`
- `docs/operations/known-issues.md`
- `docs/operations/monitoring.md`
- `docs/operations/operation-guide.md`
- `docs/superpowers/specs/2026-05-10-doc-audit-role-alignment-design.md` (이미 커밋됨)
- `docs/superpowers/plans/2026-05-10-doc-audit-role-alignment.md` (이 파일)

- [ ] **Step 3: PR 생성**

```bash
git push origin docs/doc-audit-cleanup-2026-05-09
gh pr create --title "docs: 전체 문서 감사 — Claude·Codex 역할 정렬 및 중복 제거" --body "$(cat <<'EOF'
## Summary

- **CLAUDE.md**: 역할 분담 섹션 압축 — 상세 목록 제거, 협업 정본 링크로 통일
- **AGENTS.md**: 중복 섹션 5개 제거 (~53줄 절감) — 기술 스택·구조·아키텍처·환경변수·캐릭터 → 참조 링크
- **workflow/ 6개 파일**: code-change-process 전면 재작성(이중 흐름도), task-playbooks 역할 레이블, 나머지 4개 메타 블록
- **conventions/ 6개 파일**: 결정자(Claude) / 준수 의무(Codex) 메타 블록 추가 (내용 변경 없음)
- **operations/ 5개 파일**: 역할 메타 블록 추가, known-issues 담당 컬럼 추가, monitoring QA 절차 역할 주석

## Test plan

- [ ] `pnpm check:doc-links` 통과 확인
- [ ] AGENTS.md 130줄 이하 확인
- [ ] CLAUDE.md 250줄 이하 확인
- [ ] code-change-process.md에 이중 흐름도 포함 확인
- [ ] known-issues.md 담당 컬럼 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 병렬 실행 가능 태스크

Task 1~4는 서로 다른 파일을 수정하므로 동시 실행 가능:

```
동시 실행 가능:
  ├── Task 1 (CLAUDE.md)
  ├── Task 2 (AGENTS.md)
  ├── Task 3 (code-change-process.md)
  ├── Task 4 (task-playbooks.md)
  ├── Task 5 (workflow/ 나머지 4개)
  ├── Task 6 (conventions/ 6개)
  └── Task 7 (operations/ 5개)

순차 실행 필요:
  └── Task 8 (검증 + PR) ← 1~7 완료 후
```
