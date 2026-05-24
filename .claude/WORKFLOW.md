# ArcanaInsight 업무 프로세스 가이드

> Claude가 작업 유형을 자동 판단하고 올바른 순서로 진행하기 위한 결정 트리.
> 루트 `CLAUDE.md` → 이 파일 순서로 읽는다.

---

## 1. 작업 유형 결정 트리

```
사용자 요청 수신
│
├─ "버그", "오류", "안 된다", "깨진다", "실패"
│   └─ → [버그 수정 워크플로우](#2-버그-수정)
│
├─ "추가", "만들어", "새 기능", "구현", "페이지", "API"
│   └─ → [신규 기능 워크플로우](#3-신규-기능)
│
├─ "문서", "정리", "업데이트", "최신화"
│   └─ → [문서 작업 워크플로우](#4-문서-작업)
│
├─ "리팩토링", "개선", "최적화", "정리"
│   └─ → [리팩토링 워크플로우](#5-리팩토링)
│
├─ "배포", "운영", "장애", "롤백"
│   └─ → [운영 워크플로우](#6-운영-장애)
│
└─ 그 외 / 불명확
    └─ → 사용자에게 유형 확인 후 해당 워크플로우 적용
```

---

## 2. 버그 수정

```
1. 재현 조건 파악
   - 어떤 화면/API에서 발생하는가?
   - 항상 발생하는가, 조건부인가?

2. 원인 추적
   - 관련 컴포넌트/서비스/API 라우트 코드 읽기
   - 테스트 파일이 있으면 기존 케이스 확인

3. 수정 범위 결정
   - 단일 파일 수정: 바로 Edit
   - 여러 파일 연관: 수정 계획 먼저 요약, 사용자 확인 후 진행

4. 검증
   pnpm type-check
   pnpm lint
   pnpm test:coverage

5. PR 생성
   브랜치명: fix/<설명>
   커밋 prefix: fix(scope):
```

### ArcanaInsight 버그 진단 체크포인트

| 영역 | 확인 사항 |
|------|---------|
| 카드/스킨 표시 | `useCardStyleStore`, `useSkinStore` 상태 흐름 확인. `activeSection` 상호 배타성 체크 |
| AI 리딩 오류 | `FallbackProvider` → Grok/Claude 분기. CircuitBreaker 상태 확인 |
| SSE 스트리밍 | `SSE_HEADERS`, `fetchSSEStream()`, `AbortController` 패턴. 타임아웃 240s |
| i18n 텍스트 | `ai_locale` 쿠키 → `x-locale` 헤더 → `getRequestLocale()` 흐름 |
| API 400/500 | Rate Limit → Zod `safeParse` → Auth → 소유권 검증 순서 |
| E2E 실패 | `playwright.config.ts` `locale:"ko"` 설정. hidden 요소 셀렉터 오탐 확인 |
| UI 컴포넌트 변경 후 E2E 실패 | **수정 전** `grep -r "[변경된 셀렉터 패턴]" e2e/` 로 영향 파일 전수 파악 → 일괄 수정. `e2e/helpers/service-navigation.ts` 공통 helper 활용 |
| DB 오류 | `DB_PROVIDER` 환경변수 확인. `getAdminDb()` vs `getDb()` 구분 |

---

## 3. 신규 기능

```
1. 브레인스토밍 (중간 규모 이상)
   - superpowers:brainstorming 스킬 호출
   - 설계 확정 전 구현 시작 금지

2. 관련 플레이북 확인
   docs/workflow/task-playbooks.md

3. 스캐폴딩
   - 새 페이지: page-builder 에이전트
   - 새 캐릭터: character-add 에이전트
   - 새 DivinationService: divination-scaffold 에이전트
   - 새 카드 스킨: skin-manager 에이전트

4. 구현 (Codex 위임 가능)
   Claude = 설계·뼈대·PR 검토
   Codex = 코드 구현·단위 테스트·검증 4종

5. 검증
   pnpm type-check && pnpm lint && pnpm build
   pnpm test:coverage
   pnpm check:doc-links

6. PR 생성
   브랜치명: feat/<설명>
   커밋 prefix: feat(scope):
```

### 신규 기능 도메인 체크포인트

| 도메인 | 필수 확인 |
|--------|---------|
| 카드·스킨 | `CardStyleId` 4종 사용. `getCardStyleImageUrl()`로 URL 조회. `CardFace`/`CardBack` 사용 |
| 캐릭터 | 12명 목록 확인. 이미지 경로 `nukki-enhanced/[mood].png`. 새 캐릭터는 character-add 에이전트 |
| AI·스트리밍 | `FallbackProvider` 사용. SSE 패턴 준수. max_tokens 정책 (`computeReadingMaxTokens`) |
| i18n | UI 텍스트는 `t()`/`useT()`로 노출. 번역 키 3개 언어(ko/en/ja) 동시 추가 |
| API 라우트 | Rate Limit → Zod → Auth → 소유권 검증 순서 필수. 테스트는 `src/__tests__/api/`에 |
| 레이아웃 | 캐릭터 등장 페이지 5:5 규칙. `100dvh` 사용. safe-area 적용 |
| SonarCloud | 신규 TS 파일 → `sonar-project.properties` exclusions 동기화 |

---

## 4. 문서 작업

```
1. 정본 확인
   - 코드를 정본으로 삼고 문서를 맞춘다
   - 문서가 맞고 코드가 틀리면 → 코드 수정 PR 분리

2. 정합성 검사
   pnpm check:doc-links
   pnpm check:env-docs

3. 수정 원칙
   - 중복 내용은 한 곳을 정본으로, 나머지는 링크로 대체
   - CLAUDE.md는 200행 이내 유지 (현재 안전 최솟값 234행)
   - 변경 후 보고 형식: "문서 변경: [파일명] - 변경 이유: [이유] - 변경 내용: [1줄 요약]"

4. PR 생성
   브랜치명: docs/<설명>
   커밋 prefix: docs(scope):
```

---

## 5. 리팩토링

```
1. 범위 명확화
   - 어떤 문제를 해결하는 리팩토링인가?
   - 동작 변경 없이 구조만 개선하는가?

2. 테스트 선행
   - 리팩토링 전 기존 테스트 통과 확인
   pnpm test:coverage

3. 점진적 변경
   - 한 번에 넓은 범위 수정 금지
   - 파일 단위로 변경 후 테스트 재확인

4. PR 생성
   브랜치명: refactor/<설명>
   커밋 prefix: refactor(scope):
```

---

## 6. 운영·장애

```
1. 현황 파악
   docs/operations/operation-guide.md
   docs/operations/monitoring.md

2. AI 장애 시
   - FallbackProvider가 자동 전환 처리
   - CircuitBreaker 쿨다운 확인: AI_FALLBACK_COOLDOWN_MS, AI_AUTH_COOLDOWN_MS

3. DB 장애 시
   - Railway 대시보드 → DB_PROVIDER 환경변수 확인
   - Supabase ↔ PostgreSQL 전환: DB_PROVIDER=supabase|postgres (재배포 불필요)

4. 롤백
   Railway 대시보드 → Deployments → 이전 배포 → "Redeploy"

5. QA Issue 발생 시
   - qa-recheck.yml이 main push 감지 시 자동 재실행
   - 실패 유지 시 → E2E 로그 확인 후 수동 수정
```

---

## 7. 공통 완료 체크리스트

모든 작업 유형에 공통 적용:

```bash
pnpm type-check        # TypeScript 오류 없음
pnpm lint              # ESLint 통과
pnpm test:coverage     # 임계값: branches 92 / functions·lines·statements 98
pnpm check:doc-links   # 문서 링크 유효
pnpm check:env-docs    # env.ts ↔ env-variables.md 정합성
pnpm i18n:check        # 번역 키 drift 없음
```

추가 확인:
- [ ] 관련 문서를 코드와 함께 업데이트했는가?
- [ ] 새 TS 파일을 추가했다면 `sonar-project.properties` exclusions 동기화했는가?
- [ ] UI 텍스트 변경 시 E2E 셀렉터(`hasText`/`getByText`)도 같이 수정했는가?
- [ ] UI 컴포넌트 DOM 구조 변경 시 `grep -r "[변경 패턴]" e2e/` 로 영향 파일 사전 파악했는가? (`e2e/helpers/service-navigation.ts` 우선 수정)
- [ ] feature 브랜치 → PR → 머지 순서를 지켰는가? (main 직접 커밋 금지)
- [ ] **상수(max_tokens 등) 변경 시 해당 상수를 기댓값으로 쓰는 테스트도 동시에 수정했는가?** (`grep -r "toBe([변경 전 값]" src/__tests__/` 로 확인)

## 8. 포스트 머지 워크플로우

PR 머지 완료 후 반드시 수행:

```
1. main 브랜치 최신화
   git checkout main && git pull origin main

2. 포스트 머지 문서 동기화 (post-merge-doc-refresher 에이전트)
   → "포스트 머지 문서 정리해줘" 명령으로 에이전트 호출
   → 4개 영역(CLAUDE.md, 아키텍처, 워크플로우/컨벤션, Anthropic 기준) 병렬 검증
   → 변경된 문서 커밋

3. 테스트 수 변동 시 문서 동기화
   pnpm sync:test-count

4. Railway 배포 상태 확인
   Railway 대시보드에서 배포 성공 여부 확인
```

> 포스트 머지 훅(PostToolUse)이 안내 메시지를 자동 출력한다.

---

## 9. 에이전트 활용 가이드

| 에이전트 | 사용 시점 |
|---------|---------|
| `character-add` | 새 캐릭터 추가 (backup-v2/ 백업 포함) |
| `skin-manager` | 카드 스킨 추가·이미지 생성 (backup-v2/ 백업 포함) |
| `divination-scaffold` | 새 운세 서비스 추가 (sonar exclusions 동기화 포함) |
| `page-builder` | 새 페이지 생성 |
| `quality-gate` | 전체 코드 품질 검증 (sonar 동기화 포함) |
| `i18n-manager` | 번역 키 추가·수정·검증 (3개 언어 동시 처리) |
| `post-merge-doc-refresher` | 머지 후 전체 문서 Anthropic 기준 동기화 |
| `Explore` | 코드베이스 심층 탐색 (읽기 전용) |
| `codex:codex-rescue` | Claude가 막힐 때 Codex에 구현 위임 |

---

## 참고 문서

- 플레이북: [`docs/workflow/task-playbooks.md`](../docs/workflow/task-playbooks.md)
- Claude·Codex 협업: [`docs/workflow/claude-codex-collaboration.md`](../docs/workflow/claude-codex-collaboration.md)
- 컨벤션: [`docs/conventions/coding-style.md`](../docs/conventions/coding-style.md)
- 운영 가이드: [`docs/operations/operation-guide.md`](../docs/operations/operation-guide.md)
