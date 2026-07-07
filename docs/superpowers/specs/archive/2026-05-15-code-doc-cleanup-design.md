# 전체 코드·문서 정리 설계 (2026-05-15)

## 개요

코드(262파일, ~31K 라인)와 문서(docs/ 24개 파일) 전반에 걸친 drift 제거, CLAUDE.md Anthropic 가이드라인 준수 검토, 코딩 컨벤션 일관성 확보, 컴포넌트·훅 심층 리팩토링을 수행한다.

---

## 목표

1. **CLAUDE.md + docs/ 정합성**: Anthropic 권장 기준(간결성·링크 우선·중복 금지)을 충족하고, 현행 코드와 문서의 내용 불일치를 모두 해소한다.
2. **Dead code + 코딩 컨벤션**: 미사용 import·변수·컴포넌트 제거, 타입 단언 최소화, Zod 경계 강화.
3. **심층 리팩토링**: 훅 패턴 이탈, props drilling 과도, 300줄 초과 컴포넌트, 서비스 간 중복 UI 블록을 해소한다.

---

## PR 구조

| PR | 브랜치 | 영역 | 담당 |
|----|--------|------|------|
| #A | `chore/docs-cleanup-2026-05-15` | CLAUDE.md + docs/ | Claude (Agent 1) |
| #B | `chore/code-cleanup-2026-05-15` | Dead code + 컨벤션 | Claude + Codex |
| #C | `refactor/component-deep-2026-05-15` | 컴포넌트·훅 리팩토링 | Codex 주도 |

**머지 순서**: PR #A → PR #B → PR #C (선형 의존)

---

## 에이전트 구성

3개 에이전트를 병렬로 실행해 각 영역을 독립 분석한 뒤 결과를 통합한다.

### Agent 1 — CLAUDE.md + 문서 정리

**CLAUDE.md Anthropic 가이드라인 체크리스트:**
- [ ] 파일 길이: 빠른 진입점 역할에 맞게 간결한가 (내용 과다 시 docs/로 위임)
- [ ] 중복: docs/와 내용이 겹치는 섹션은 링크로 대체되어 있는가
- [ ] 기술 스택 버전: Next.js, React, Tailwind, Framer Motion, Zustand 등 실제 package.json과 일치하는가
- [ ] 프로젝트 구조 트리: 최근 추가된 파일/컴포넌트/훅 모두 반영되어 있는가
- [ ] 명령어: 존재하지 않는 pnpm 스크립트가 명시되어 있지 않은가

**docs/ 코드 대조 체크리스트:**
- [ ] `architecture/system-overview.md` — 4단계 흐름, 컴포넌트 목록 최신 여부
- [ ] `architecture/data-model.md` — 캐릭터 12명, 카드스타일 4종, 스킨 정의 일치
- [ ] `architecture/ai-infrastructure.md` — SSE 패턴, FallbackProvider 코드 일치
- [ ] `architecture/auth-abstraction.md` — DB_PROVIDER 분기 로직 코드 일치
- [ ] `architecture/db-abstraction.md` — Drizzle 스키마, 어댑터 코드 일치
- [ ] `architecture/i18n.md` — middleware locale 로직, 번역 키 구조 일치
- [ ] `conventions/coding-style.md` — 실제 코드 패턴과 괴리 여부
- [ ] `conventions/layout-rules.md` — 5:5 규칙, 모바일 배치 현행 반영 여부
- [ ] `conventions/i18n-style.md` — useT/t() 사용 패턴 일치
- [ ] `conventions/zod-schemas.md` — API 라우트 실제 Zod 사용 패턴 일치
- [ ] `workflow/claude-codex-collaboration.md` — 역할 분담 현행 반영 여부
- [ ] `operations/known-issues.md` — 해소된 이슈 잔존 여부, 새 이슈 미등재 여부
- [ ] `operations/env-variables.md` — `pnpm check:env-docs` 결과와 일치하는가

---

### Agent 2 — Dead code + 코딩 컨벤션

**Dead code 체크리스트:**
- [ ] 미사용 import (선언 후 미참조)
- [ ] 미사용 변수·함수 (`export` 없이 어디서도 호출 안 되는 것)
- [ ] 주석 처리된 코드 블록 (TODO 없이 장기 방치된 것)
- [ ] `console.log` 개발용 잔존 (프로덕션 코드 내)

**코딩 컨벤션 체크리스트:**
- [ ] `as any` / `as unknown as X` 타입 단언 잔존 (파기 확정 `postgres-adapter.ts` 5건 제외)
- [ ] `!` non-null assertion 남용 (null 체크 가능한 곳)
- [ ] `// eslint-disable` 주석 남용
- [ ] Zod `safeParse` 미적용 API 경계 (타입 단언으로 대체된 곳)
- [ ] 상수/타입을 인라인 하드코딩한 곳 (`src/types/`나 `src/data/`에 이미 정의된 것)
- [ ] `src/types/` 미활용 — 공유 타입이 파일 내부에 중복 선언된 곳

---

### Agent 3 — 컴포넌트·훅 심층 리팩토링

**훅 패턴 체크리스트:**
- [ ] `use` prefix 일관성 (pure hook / Zustand store 명명 구분)
- [ ] store vs. pure hook 혼용 — Zustand store가 아닌데 store처럼 쓰이는 훅
- [ ] `useEffect` 의존성 배열 누락·과잉 (`exhaustive-deps` 경고 대상)

**컴포넌트 구조 체크리스트:**
- [ ] 300줄 초과 컴포넌트 — 분리 후보 탐지 및 분리
- [ ] props drilling 3단계 이상 — Context 또는 store 위임 후보
- [ ] 타로·사주·신점 페이지 간 중복 UI 블록 — 공통 컴포넌트 추출 후보

**UX 일관성 체크리스트:**
- [ ] 3개 서비스 결과 공유 버튼 패턴 일치 여부
- [ ] `UserInfoForm` 사용 패턴 3개 서비스 간 일관성
- [ ] `PageSpinner` / 로딩 상태 처리 일관성

---

## 성공 기준 (모든 PR 공통)

```bash
pnpm type-check        # 0건
pnpm lint              # 0건
pnpm test:coverage     # 전체 통과, statements 95%+
pnpm build             # 성공
pnpm check:doc-links   # 0건
pnpm check:env-docs    # 정합
pnpm i18n:check        # 0 drift
```

---

## Codex 핸드오프 기준

| 작업 | 담당 |
|------|------|
| 문서 수정 | Claude 단독 |
| 미사용 import 제거, 간단한 타입 수정 | Claude 직접 |
| Zod 적용 (로직 변경 포함) | Codex 위임 |
| 컴포넌트 분리·훅 재설계 | Codex 주도, Claude 스펙 제공 |

---

## 파기 확정 항목 (건드리지 않음)

- `src/lib/db/postgres-adapter.ts` `as any` 5건 — 3-에이전트 심층 검토 후 파기 확정 (2026-04-26)
- rate-limit Redis 전환 — 파기 확정
- SupabaseAdapter 통합 테스트 — 파기 확정
