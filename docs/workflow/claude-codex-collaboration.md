# Claude & Codex 협업 프로토콜

> **정본 위치**: `docs/workflow/claude-codex-collaboration.md`
> 이 문서는 Claude와 Codex의 역할 분담, 핸드오프 규칙, 품질 게이트를 정의한다.
> `CLAUDE.md`와 `AGENTS.md` 모두 이 문서를 규칙 정본으로 참조한다.

---

## 1. 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **설계는 Claude, 구현은 Codex** | 무엇을 만들지·왜 만드는지는 Claude가 결정하고, 어떻게 코드로 표현하는지는 Codex가 결정한다 |
| **경계를 침범하지 않는다** | Claude는 구현 본문을 작성하지 않고, Codex는 아키텍처 결정을 내리지 않는다 |
| **핸드오프는 명시적으로** | 암묵적 전달은 없다. 전달 시 필수 항목을 빠짐없이 작성한다 |
| **검증은 Codex, 검토는 Claude** | 기계가 확인할 수 있는 것(tsc, lint, test)은 Codex가, 판단이 필요한 것(아키텍처, 보안, 설계 일관성)은 Claude가 한다 |

---

## 2. 역할 경계

### Claude 단독 처리

| # | 작업 유형 | 산출물 |
|---|-----------|--------|
| C1 | 기능 요구사항 분석 및 스펙 문서 작성 | `docs/superpowers/specs/*.md` |
| C2 | 아키텍처 설계·기술 결정 문서 | `docs/architecture/*.md` 갱신 |
| C3 | 에이전트 정의 및 Task Playbook | `.claude/agents/*.md`, `docs/workflow/task-playbooks.md` — 현재 8종: `character-add`, `divination-scaffold`, `page-builder`, `skin-manager`, `theme-creator`, `quality-gate`, `i18n-manager`, `post-merge-doc-refresher` |
| C4 | DB 스키마 설계 및 마이그레이션 계획 | SQL 초안, Drizzle 스키마 구조 명세 |
| C5 | 새 서비스·페이지 뼈대 스캐폴딩 | 파일 구조, 인터페이스, 타입 정의, 빈 함수 시그니처 |
| C6 | `CLAUDE.md` / `AGENTS.md` 최신화 | 구조 트리, 아키텍처 섹션 갱신 |
| C7 | Codex 재진입 요청 처리 및 설계 재정의 | 수정된 스펙, 재설계 문서 |
| C8 | PR 머지 판단 및 품질 게이트 최종 검토 | 머지 승인 또는 재작업 지시 |

### Codex 단독 처리

| # | 작업 유형 | 산출물 |
|---|-----------|--------|
| X1 | 서비스 로직 구현 (`src/services/`) | 비즈니스 로직 본문 |
| X2 | API 라우트 구현 (`src/app/api/`) | SSE 스트리밍, Zod 검증, DB 저장 로직 |
| X3 | React 컴포넌트 구현 (`src/components/`) | 렌더링 로직, Framer Motion 애니메이션 |
| X4 | Zustand 스토어 구현 (`src/hooks/`) | 상태 전환, 액션 핸들러 |
| X5 | 단위 테스트 작성 및 실행 | `src/__tests__/**/*.test.ts` |
| X6 | 로컬 검증 4종 실행 | `type-check` → `lint` → `test:coverage` → `build` |
| X7 | 기능 변경 없는 리팩토링 | 중복 제거, 명명 정리 |
| X8 | E2E 테스트 추가 및 수정 | `e2e/*.spec.ts` |

### 협업 필요 작업 (핸드오프 필수)

| # | 작업 유형 | Claude → | Codex → | 방향 |
|---|-----------|----------|---------|------|
| A1 | 새 운세 서비스 추가 | 스펙 + 인터페이스 + 스캐폴딩 | 본문 구현 + 테스트 | C→X→C(검토) |
| A2 | i18n 키 추가 | 키 네이밍 결정 + `keys.ts` 타입 추가 | `ko/en/ja` 값 채움 + `pnpm i18n:check` | C→X |
| A3 | DB 마이그레이션 | SQL 초안 + 변경 범위 명세 | SQL 파일 생성 + Drizzle 스키마 동기화 | C→X |
| A4 | 버그 수정 (설계 결함 포함) | 원인 분석 + 수정 방향 결정 | 코드 수정 + 재현 테스트 | C→X 또는 X→C→X |
| A5 | 배포 전 품질 게이트 | 리포트 검토 + 이슈 우선순위 | `quality-gate` 에이전트 실행 | X→C |

---

## 3. 핸드오프 프로토콜

### Claude → Codex (작업 위임)

Codex에게 작업을 전달할 때 **아래 항목을 모두 포함**해야 한다.

```markdown
## Codex 작업 요청

### 작업 유형
[ ] 신규 구현  [ ] 버그 수정  [ ] 리팩토링  [ ] 테스트 추가  [ ] 기타

### 참조 파일 (읽어야 할 순서)
1. [인터페이스/타입 파일] — 구현해야 할 계약
2. [기존 패턴 파일]     — 따라야 할 패턴
3. [관련 문서]          — 규칙 확인

### 구현 범위
- 생성할 파일: [경로 목록]
- 수정할 파일: [경로 목록]
- 건드리지 말 것: [경로 목록]

### 완료 조건 (Definition of Done)
- [ ] pnpm type-check — 0 error
- [ ] pnpm lint       — 0 error
- [ ] pnpm test:coverage — branches≥92 / functions≥98 / lines≥98 / statements≥98
- [ ] [기능별 추가 조건]

### 재진입 조건 (아래 상황이면 구현 중단 후 Claude에게 반환)
- [명시적 재진입 조건]
```

### Codex → Claude (결과 보고)

작업 완료 후 **아래 항목을 모두 포함**해 보고한다.

```markdown
## 구현 완료 보고

### 완료 항목
- [파일명]: [한 줄 변경 요약]

### 검증 결과
- tsc: [0 error / N error]
- lint: [0 error / N warning]
- test:coverage: [통과 / 실패 시 테스트 이름]
- build: [성공 / 실패]

### 설계 이탈 또는 변경 사항
- [없음 / 구체적으로 기술]

### Claude 검토 요청 사항
- [없음 / 판단이 필요한 항목]

### 잔여 작업
- [없음 / 미완료 항목]
```

---

## 4. 재진입 조건 — Codex → Claude

Codex는 다음 상황에서 **구현을 중단**하고 Claude에게 되돌린다.

| 조건 | 이유 |
|------|------|
| 인터페이스·타입 변경이 필요한 경우 | 타입 계약 변경은 설계 결정 |
| 서비스 간 새 의존 관계 생성 필요 | 아키텍처 영향 범위 검토 필요 |
| 메이저 의존성 추가 필요 | 사용자 승인 + lockfile 검토 필요 |
| 구현 방향이 2가지 이상으로 갈리는 경우 | 방향 결정은 Claude 몫 |
| 커버리지 임계값을 낮춰야 통과되는 경우 | 임계값 변경은 PR 근거 명시 필수 |
| DB 스키마 변경이 필요한 경우 | 마이그레이션 계획은 Claude가 수립 |
| 보안 규칙(Rate Limit·Auth 순서)을 우회해야 하는 경우 | 보안 결정은 Claude 판단 |

---

## 5. Claude 품질 검토 체크리스트

Codex 작업 결과를 검토할 때 Claude가 확인해야 하는 항목.

### 아키텍처 정합성
- [ ] 새 파일이 레이어 경계를 지켰는가 (서비스가 `NextRequest` 직접 참조 금지)
- [ ] FallbackProvider 패턴 유지 (Grok 우선 → Claude API fallback)
- [ ] DB 접근이 `getDb()` / `getAdminDb()` 추상화를 경유하는가

### 보안
- [ ] API 보안 순서 준수: Rate Limit → Zod `safeParse` → Auth → 소유권
- [ ] 환경변수 하드코딩 없음 (`src/lib/env.ts` getter 경유)
- [ ] `.env` 파일 미포함

### 규칙 준수
- [ ] 캐릭터 등장 페이지의 5:5 레이아웃 (`md:w-1/2 + md:w-1/2`)
- [ ] UI 텍스트가 `t()` / `useT()` 경유 (하드코딩 금지)
- [ ] SSR 안전성: `Date`, `Math.random`, `window`는 effect 내부에서만
- [ ] 새 API 테스트가 `src/__tests__/api/`에 배치

### 문서 동기화
- [ ] `CLAUDE.md` 구조 트리 갱신 필요 여부 확인
- [ ] `AGENTS.md` 갱신 필요 여부 확인
- [ ] `task-playbooks.md` 갱신 필요 여부 확인

---

## 6. Codex 사전 검증 (Claude 계획 전)

Claude가 새 스펙을 작성하기 전, Codex가 현재 상태를 선행 검증한다.

```bash
# 타입 에러 없음 (스펙 판단 전 코드베이스 건강 확인)
pnpm type-check

# 마이그레이션 번호 최신 확인 (새 마이그레이션 번호 계획 시)
ls supabase/migrations/ | tail -3

# 테스트 현황 확인 (커버리지 임계값 기반 계획 수립)
pnpm test:coverage 2>&1 | tail -10
```

---

## 7. 파일 소유권

| 디렉토리 / 파일 | 주 작성자 | 수정 권한 |
|----------------|-----------|----------|
| `docs/**/*.md` | Claude | Codex: 코드 사실 반영 수정만, 구조 변경 금지 |
| `CLAUDE.md`, `AGENTS.md` | Claude | Codex: 금지 |
| `.claude/agents/*.md` | Claude | Codex: 금지 |
| `src/types/**` | Claude (정의) | Codex: 필드 추가 허용, 기존 타입 변경 시 재진입 |
| `src/services/**` | Codex | Claude: 인터페이스·시그니처만, 본문 금지 |
| `src/app/api/**` | Codex | Claude: 라우트 구조 정의만 |
| `src/components/**` | Codex | Claude: Props 인터페이스 정의만 |
| `src/hooks/**` | Codex | Claude: 스토어 인터페이스 정의만 |
| `supabase/migrations/*.sql` | Claude(초안)→Codex(파일) | 번호 충돌 방지: 작업 전 디렉토리 확인 필수 |
| `src/i18n/translations/shared/keys.ts` | Claude | Codex: 금지 |
| `src/i18n/translations/ko/**` 등 | Codex | Claude: 키 네이밍 결정 시에만 |
| `e2e/*.spec.ts` | Codex | Claude: 테스트 시나리오 기획만 |

---

## 8. 브랜치 전략

```
main
 └─ feat/[기능명]           ← Claude가 개설 + 뼈대 커밋
      └─ (Codex가 이어서 구현 커밋)
```

- Claude: `feat/*`, `fix/*`, `docs/*`, `chore/*` 브랜치 **개설** + 초기 스캐폴드 커밋
- Codex: 동일 브랜치에서 구현 커밋 이어받기. 동시 작업 시 `feat/xxx/impl` 서브브랜치 분기 후 머지
- `main` 직접 push: 양쪽 모두 금지
- `CLAUDE.md` / `AGENTS.md` 최신화 커밋: Claude가 PR 머지 후 진행

---

## 9. 동시 작업 충돌 방지

1. **작업 선언**: Codex 작업 시작 전 핸드오프 문서에 "현재 수정 중인 파일 목록" 명시
2. **타입 잠금**: `src/types/` 변경 중일 때 Claude는 해당 타입에 의존하는 새 스펙 작성 보류
3. **마이그레이션 번호 예약**: Claude 스펙에 번호가 명시되면, Codex가 파일 생성 전 디렉토리 확인 후 확정. 충돌 시 즉시 재진입
4. **i18n 드리프트 방지**: Codex가 번역 추가 후 반드시 `pnpm i18n:check` 실행 결과를 보고에 포함

---

## 10. 관련 문서

| 문서 | 내용 |
|------|------|
| [`docs/workflow/code-change-process.md`](code-change-process.md) | 7단계 코드 변경 프로세스 |
| [`docs/workflow/unit-testing.md`](unit-testing.md) | Vitest 임계값 및 테스트 정책 |
| [`docs/workflow/e2e-testing.md`](e2e-testing.md) | Playwright E2E 정책 |
| [`docs/workflow/task-playbooks.md`](task-playbooks.md) | 업무별 진입점 |
| [`docs/conventions/coding-style.md`](../conventions/coding-style.md) | 커밋 prefix, 브랜치 규칙 |
