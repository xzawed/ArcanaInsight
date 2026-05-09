# ArcanaInsight — Codex 전용 지침

일본 애니메이션 스타일 캐릭터와 대화하며 타로, 사주, 신점 리딩을 받는 운세 종합 콘텐츠 플랫폼.

> **Codex의 역할**: 실제 코드 구현, 코드 검증, 테스트 수행
> Claude와의 협업 전체 규칙은 [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md) 참조.

---

## Codex 세션 시작 순서

1. `git status --short`로 현재 변경 사항 확인
2. 브랜치가 `main`이면 작업 브랜치로 전환 (`git checkout feat/[기능명]`)
3. 전달받은 핸드오프 문서에서 **구현 범위**, **참조 파일**, **완료 조건** 확인
4. 참조 파일을 순서대로 읽은 후 구현 시작
5. 완료 후 검증 4종 실행 → 결과 보고

---

## Codex 담당 작업 (명확한 경계)

### 구현해야 하는 것

- `src/services/` — 서비스 로직 본문
- `src/app/api/` — API 라우트 구현 (SSE, Zod 검증, DB 저장)
- `src/components/` — React 컴포넌트 렌더링 로직
- `src/hooks/` — Zustand 스토어 상태·액션 핸들러
- `src/__tests__/api/` — API 단위 테스트
- `e2e/*.spec.ts` — E2E 테스트 추가·수정
- 기능 변경 없는 리팩토링 (중복 제거, 명명 정리)

### 절대 수정하지 않는 것

| 파일/경로 | 이유 |
|-----------|------|
| `CLAUDE.md`, `AGENTS.md` | Claude가 관리 — Codex 직접 수정 금지 |
| `.claude/agents/*.md` | Claude가 관리하는 에이전트 정의 |
| `src/types/**` (기존 타입 변경) | 타입 계약 변경은 재진입 조건 |
| `src/i18n/translations/shared/keys.ts` | Claude가 키 네이밍 결정 |
| `docs/` 구조 변경 | 사실 반영 수정만 허용, 구조 변경은 Claude |
| `supabase/migrations/` 번호 | 작업 전 디렉토리 확인 후 Claude 확인 |

---

## 기술 스택 · 프로젝트 구조 · 핵심 아키텍처

> 기술 스택, 구조 트리, 아키텍처 패턴 전체는 `CLAUDE.md`를 참조한다.
> 구현 시 준수해야 할 아키텍처 규칙은 [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md)가 상세 정본이다.

---

## 검증 명령어 (완료 전 전부 실행)

```bash
pnpm type-check       # TypeScript 0 error 필수
pnpm lint             # ESLint 0 error 필수
pnpm test:coverage    # branches≥92 / functions/lines/statements≥98
pnpm build            # 프로덕션 빌드 성공 필수
```

**테스트 커버리지 임계값을 낮출 수 없는 경우 → Claude 재진입**

---

## 환경변수

> 전체 목록 및 설정 절차: [`docs/operations/env-variables.md`](docs/operations/env-variables.md)

---

## 캐릭터/데이터 기준

> 캐릭터 목록, 표정 타입, 이미지 경로 규칙: `CLAUDE.md` 및 [`docs/architecture/data-model.md`](docs/architecture/data-model.md) 참조.

---

## 구현 시 필수 주의사항

- **레이아웃**: 캐릭터 등장 페이지는 5:5 규칙 (`md:w-1/2`). [`docs/conventions/layout-rules.md`](docs/conventions/layout-rules.md) 참조
- **크로스 플랫폼**: `100vh` 대신 `100dvh`, safe-area 준수. [`docs/conventions/cross-platform.md`](docs/conventions/cross-platform.md) 참조
- **SSR/Hydration**: `Date`, `Math.random`, `window`는 클라이언트 effect 내부에서만
- **Zod**: 타입 단언보다 `safeParse` 사용
- **테스트 파일 위치**: API 라우트 테스트는 `src/__tests__/api/`에 배치
- **패키지 추가**: `pnpm-lock.yaml` 변동과 peer dependency 변화 확인 후 보고
- **이미지 작업**: 생성·교체·수정 전 `backup-v2/` 백업 먼저

---

## Claude에게 재진입해야 하는 상황

```
아래 중 하나라도 해당되면 구현 중단 → Claude에게 보고

1. src/types/ 기존 타입 변경 필요
2. 서비스 간 새 의존 관계 생성 필요
3. 메이저 의존성 추가 필요 (pnpm add)
4. 구현 방향이 2가지 이상으로 갈릴 때
5. 커버리지 임계값 하향 없이 통과 불가
6. DB 스키마 변경 필요
7. API 보안 순서 우회 필요
8. 스펙이 불명확하여 진행 불가
```

---

## 완료 보고 형식

```markdown
## 구현 완료 보고

### 완료 항목
- [파일명]: [한 줄 변경 요약]

### 검증 결과
- tsc: 0 error
- lint: 0 error
- test:coverage: 통과 (branches X% / lines X%)
- build: 성공

### 설계 이탈 또는 변경 사항
- [없음 / 구체적으로]

### Claude 검토 요청
- [없음 / 판단 필요 항목]
```

---

## 업무별 참조 문서

| 업무 | 먼저 볼 문서 |
|---|---|
| 협업 전체 규칙 | [`docs/workflow/claude-codex-collaboration.md`](docs/workflow/claude-codex-collaboration.md) |
| 시스템 구조 | [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md) |
| AI/프롬프트 | [`docs/architecture/ai-infrastructure.md`](docs/architecture/ai-infrastructure.md) |
| DB/Auth | [`docs/architecture/db-abstraction.md`](docs/architecture/db-abstraction.md) |
| 새 기능/페이지/API | [`docs/workflow/task-playbooks.md`](docs/workflow/task-playbooks.md) |
| 단위 테스트 정책 | [`docs/workflow/unit-testing.md`](docs/workflow/unit-testing.md) |
| E2E 테스트 정책 | [`docs/workflow/e2e-testing.md`](docs/workflow/e2e-testing.md) |
| 코드 변경 프로세스 | [`docs/workflow/code-change-process.md`](docs/workflow/code-change-process.md) |
