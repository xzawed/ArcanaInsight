# 전체 코드·문서 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드↔문서 drift 제거, CLAUDE.md Anthropic 가이드라인 준수, dead code 정리, 대형 컴포넌트 분리를 3개 순차 PR로 완료한다.

**Architecture:** Agent 1(문서 감사) → PR #A 머지 → Agent 2(코드 품질) → PR #B 머지 → Codex(심층 리팩토링) → PR #C 머지. 각 PR은 독립적으로 빌드·테스트가 통과해야 머지한다.

**Tech Stack:** TypeScript strict, Next.js 16.2.6 App Router, React 19.2.4, Tailwind CSS v4, Framer Motion v12.38, Zustand v5, Zod v4, Vitest v2, Playwright

**Spec:** `docs/superpowers/specs/2026-05-15-code-doc-cleanup-design.md`

---

## 파일 변경 지도

### PR #A — 문서 정리 (docs/ 전용)
| 파일 | 작업 |
|------|------|
| `CLAUDE.md` | 구조 트리·버전·명령어 최신화, 중복 섹션 → 링크 위임 |
| `docs/architecture/system-overview.md` | 컴포넌트 목록, 4단계 흐름 최신화 |
| `docs/architecture/data-model.md` | 캐릭터 12명·카드스타일 4종 대조 |
| `docs/architecture/ai-infrastructure.md` | SSE 패턴·FallbackProvider 코드 대조 |
| `docs/architecture/auth-abstraction.md` | DB_PROVIDER 분기 로직 대조 |
| `docs/architecture/db-abstraction.md` | Drizzle 스키마 대조 |
| `docs/architecture/i18n.md` | middleware locale 로직 대조 |
| `docs/conventions/coding-style.md` | 실제 코드 패턴 반영 |
| `docs/conventions/layout-rules.md` | 현행 레이아웃 반영 |
| `docs/workflow/claude-codex-collaboration.md` | 역할 분담 최신화 |
| `docs/operations/known-issues.md` | 해소 이슈 제거, 신규 이슈 등재 |

### PR #B — Dead code + 코딩 컨벤션 (src/ 일부)
| 파일 | 작업 |
|------|------|
| `src/app/saju/result/[id]/page.tsx` | `as unknown as` 타입 단언 1건 제거 |
| `src/app/tarot/session/page.tsx` | `eslint-disable exhaustive-deps` 3건 검토·수정 |
| `src/app/saju/session/page.tsx` | `eslint-disable exhaustive-deps` 1건 검토·수정 |
| `src/components/effects/ParticleOverlay.tsx` | `eslint-disable` 1건 검토·수정 |
| `src/hooks/usePreselectCharacter.ts` | `eslint-disable` 2건 검토·수정 |
| 미사용 import 있는 파일들 | ESLint 실행 후 자동 탐지·제거 |
| `console.log` 2건 있는 파일들 | 제거 |

### PR #C — 심층 리팩토링 (Codex 주도)
| 파일 | 작업 |
|------|------|
| `src/app/tarot/session/page.tsx` (853줄) | 서브컴포넌트 분리 |
| `src/components/effects/MysticBackground.tsx` (581줄) | 유틸 함수 분리 |
| `src/app/shinjeom/session/page.tsx` (456줄) | 서브컴포넌트 분리 |
| `src/app/saju/session/page.tsx` (383줄) | 서브컴포넌트 분리 |
| `src/app/settings/page.tsx` (350줄) | 섹션 컴포넌트 분리 |
| `src/app/mypage/page.tsx` (334줄) | 섹션 컴포넌트 분리 |
| `src/app/tarot/page.tsx` (332줄) | 검토 후 분리 여부 결정 |
| `src/app/saju/page.tsx` (330줄) | 검토 후 분리 여부 결정 |

---

## Phase 0: 기준선 수립

### Task 0: 현재 품질 게이트 상태 확인

**Files:** 없음 (읽기 전용)

- [ ] **Step 1: 전체 품질 게이트 실행**

```bash
pnpm type-check 2>&1 | tail -5
pnpm lint 2>&1 | tail -10
pnpm test:coverage 2>&1 | tail -10
pnpm build 2>&1 | tail -5
pnpm check:doc-links 2>&1 | tail -5
pnpm check:env-docs 2>&1 | tail -5
pnpm i18n:check 2>&1 | tail -5
```

Expected: 모든 명령이 오류 없이 완료. 결과를 메모해 둔다.

- [ ] **Step 2: 현재 코드 이슈 규모 파악**

```bash
# type assertion (postgres-adapter 제외)
grep -rn "as any\|as unknown as" src --include="*.ts" --include="*.tsx" \
  | grep -v "postgres-adapter\|__tests__\|\.test\." | wc -l

# eslint-disable (프로덕션 코드)
grep -rn "eslint-disable" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__\|\.test\." | wc -l

# console.log (프로덕션 코드)
grep -rn "console\.log" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__\|test-helpers\|\.test\." 

# 300줄 초과 파일
find src -name "*.tsx" -o -name "*.ts" \
  | grep -v "__tests__\|\.test\." \
  | xargs wc -l 2>/dev/null | sort -rn | head -15
```

Expected 출력 (현재 파악된 수치):
- as any/unknown: 1건 (production), 나머지는 테스트 파일
- eslint-disable: 약 20건 (프로덕션)
- console.log: 2건
- 300줄+: tarot/session(853), MysticBackground(581), shinjeom/session(456), saju/session(383) 등

---

## Phase A: CLAUDE.md + 문서 정리 → PR #A

### Task A-1: 브랜치 생성

**Files:** 없음

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b chore/docs-cleanup-2026-05-15
```

Expected: Switched to a new branch 'chore/docs-cleanup-2026-05-15'

---

### Task A-2: CLAUDE.md Anthropic 가이드라인 감사

**Files:** `CLAUDE.md` (읽기)

Anthropic 권장 CLAUDE.md 기준:
1. **간결성**: 빠른 진입점 역할. 섹션이 너무 길면 docs/로 위임하고 링크만 남긴다.
2. **중복 금지**: docs/ 파일과 내용이 겹치면 "자세한 내용은 [링크]를 참고하세요" 한 줄로 대체.
3. **정확성**: 버전·명령어·파일 경로가 실제와 일치해야 한다.
4. **빠른 진입**: 섹션 순서가 가장 자주 쓰는 정보 우선이어야 한다.

- [ ] **Step 1: CLAUDE.md 현재 상태 확인**

```bash
wc -l CLAUDE.md
cat CLAUDE.md | head -20
```

Expected: 현재 줄 수 확인. 빠른 진입점으로 적절한 길이인지 판단.

- [ ] **Step 2: 기술 스택 버전 대조**

```bash
# package.json 실제 버전 확인
python -c "
import json
d = json.load(open('package.json'))
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
keys = ['next','react','tailwindcss','framer-motion','zustand','zod','vitest','typescript','@playwright/test']
for k in keys:
    if k in deps: print(f'{k}: {deps[k]}')
"
```

Expected: CLAUDE.md의 기술 스택 표와 실제 버전 비교. 불일치 항목 메모.

- [ ] **Step 3: 프로젝트 구조 트리 대조**

```bash
# 현재 실제 파일 구조 확인
find src/hooks -name "*.ts" | sort
find src/components -maxdepth 2 -type d | sort
find src/data -maxdepth 1 -name "*.ts" | sort
```

Expected: CLAUDE.md의 hooks 목록과 비교. `useUserInfoForm`, `useResetScrollOnStep` 등 최근 추가 훅이 반영되어 있는지 확인.

- [ ] **Step 4: pnpm 스크립트 존재 여부 확인**

```bash
python -c "
import json
d = json.load(open('package.json'))
scripts = d.get('scripts', {})
for k in scripts: print(k)
" | sort
```

Expected: CLAUDE.md에 명시된 모든 `pnpm` 명령이 scripts에 존재하는지 대조.

---

### Task A-3: CLAUDE.md 수정

**Files:** `CLAUDE.md` (수정)

- [ ] **Step 1: 기술 스택 버전 수정**

`CLAUDE.md`의 기술 스택 표에서 Task A-2에서 발견한 버전 불일치를 수정한다.

```markdown
# 수정 패턴 (불일치 발견 시)
| 언어/프레임워크 | TypeScript strict, Next.js 16.2.6 App Router, React 19.2.4 |
| 스타일/애니메이션 | Tailwind CSS v4, Framer Motion v12.38 |
| 상태/패키지 | Zustand v5, pnpm 10.33.0 |
```

- [ ] **Step 2: 프로젝트 구조 훅 목록 보완**

`CLAUDE.md`의 `hooks/` 섹션에 누락된 훅을 추가한다.

```markdown
# 추가 패턴 (누락 발견 시)
│   ├── useUserInfoForm.ts     # UserInfoForm 상태·핸들러 추출 훅 (mode: tarot|saju|shinjeom)
│   ├── useResetScrollOnStep.ts   # step 변경 시 스크롤 최상단 초기화 (3페이지 공통)
```

- [ ] **Step 3: 과도하게 긴 섹션 → docs/ 링크로 위임**

200줄 초과 시 중복 내용을 docs/ 링크로 대체한다. 예:

```markdown
# 제거 대상 패턴 (docs/에 이미 있는 내용)
## 핵심 아키텍처
- AI 신뢰성: [docs/architecture/ai-infrastructure.md](docs/architecture/ai-infrastructure.md) 참고.
# (상세 설명 제거 → 링크만 유지)
```

- [ ] **Step 4: 변경 내용 확인**

```bash
git diff CLAUDE.md
```

---

### Task A-4: 병렬 에이전트로 docs/architecture/* 감사

이 태스크는 **3개 병렬 Explore 에이전트**로 실행한다 (`superpowers:dispatching-parallel-agents` 참고).

**에이전트 A**: `docs/architecture/system-overview.md`, `docs/architecture/data-model.md`
**에이전트 B**: `docs/architecture/ai-infrastructure.md`, `docs/architecture/auth-abstraction.md`, `docs/architecture/db-abstraction.md`
**에이전트 C**: `docs/architecture/i18n.md`, `docs/conventions/coding-style.md`, `docs/conventions/layout-rules.md`

각 에이전트는 다음을 수행한다:

**Files:** 해당 docs 파일들 (읽기) + 관련 src/ 파일들 (읽기)

- [ ] **Step 1: 에이전트 A — system-overview + data-model 대조**

대조 기준:
```bash
# 실제 캐릭터 수
grep -c "id:" src/data/characters/index.ts

# 실제 카드스타일
grep "CardStyleId" src/data/cardStyles.ts | head -10

# 컴포넌트 폴더 목록
ls src/components/
```

Expected: 문서의 캐릭터 수(12명), 카드스타일 ID(dark-fantasy·art-nouveau·anime-mystical·modern-digital), 컴포넌트 폴더 목록이 실제와 일치하는지 확인. 불일치 항목 메모.

- [ ] **Step 2: 에이전트 B — AI/Auth/DB 아키텍처 대조**

```bash
# FallbackProvider 실제 위치
ls src/services/core/

# DB_PROVIDER 분기 실제 코드
grep -n "DB_PROVIDER\|db-provider" src/lib/db/index.ts | head -10

# Auth 공급자 목록
ls src/lib/auth/
```

Expected: 문서의 FallbackProvider 설명, DB_PROVIDER 분기 로직, Auth 추상화 구조가 실제 코드와 일치하는지 확인.

- [ ] **Step 3: 에이전트 C — i18n + 코딩 스타일 대조**

```bash
# i18n locale 감지 실제 코드
grep -n "ai_locale\|x-locale" src/middleware.ts | head -10

# translations 구조
ls src/i18n/translations/

# 실제 사용 중인 useT 패턴
grep -rn "useT()\|const t = " src/app --include="*.tsx" | head -5
```

Expected: 문서의 locale 감지 방식, useT 사용 패턴이 실제와 일치하는지 확인.

---

### Task A-5: docs/architecture/* 수정

**Files:** 에이전트 보고서 기반으로 불일치 항목 수정

- [ ] **Step 1: system-overview.md 수정**

Task A-4에서 발견한 항목만 수정한다. 예시 패턴:

```markdown
# 수정 전 (잘못된 컴포넌트 목록)
├─ card/         — CardFace, CardBack

# 수정 후 (최신화)
├─ card/         — CardFace, CardBack, CardItem, CardStyleSelector
```

- [ ] **Step 2: data-model.md 수정**

불일치 발견 시 캐릭터·카드스타일·스킨 항목 업데이트.

- [ ] **Step 3: ai-infrastructure.md / auth-abstraction.md / db-abstraction.md 수정**

코드와 설명이 다른 항목만 수정. 과도한 재작성 금지.

- [ ] **Step 4: i18n.md / coding-style.md / layout-rules.md 수정**

실제 코드 패턴과 괴리된 항목만 수정.

---

### Task A-6: docs/workflow + docs/operations 감사·수정

**Files:** `docs/workflow/claude-codex-collaboration.md`, `docs/operations/known-issues.md`, `docs/operations/env-variables.md`

- [ ] **Step 1: env-variables.md 정합성 확인**

```bash
pnpm check:env-docs
```

Expected: "All environment variables are documented" 메시지. 오류 있으면 해당 항목 추가.

- [ ] **Step 2: known-issues.md 검토**

```bash
# 파기 확정 항목이 코드에서 실제로 변경되었는지 확인
grep -n "as any" src/lib/db/postgres-adapter.ts | wc -l
```

Expected: 5건 잔존 확인 (파기 확정 항목). 이미 해소된 이슈가 known-issues에 남아 있으면 제거.

- [ ] **Step 3: claude-codex-collaboration.md 역할 분담 최신화**

최근 변경된 역할(useUserInfoForm 분해, 신점 결과 공유 등)이 반영되어 있는지 확인 후 수정.

---

### Task A-7: 검증 + 커밋 + PR #A 생성

**Files:** 없음 (검증만)

- [ ] **Step 1: 문서 링크 검증**

```bash
pnpm check:doc-links
```

Expected: "All 49 links are valid" 또는 오류 0건.

- [ ] **Step 2: env 정합성 검증**

```bash
pnpm check:env-docs
```

Expected: 오류 0건.

- [ ] **Step 3: 빌드 확인 (문서만 변경이지만 안전 확인)**

```bash
pnpm type-check && pnpm lint && pnpm build 2>&1 | tail -5
```

Expected: 오류 0건, 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add CLAUDE.md docs/
git commit -m "$(cat <<'EOF'
docs: CLAUDE.md + 전체 문서 코드 대조 정리 (2026-05-15)

- CLAUDE.md: 버전, 구조 트리, 훅 목록 최신화
- architecture/: 컴포넌트·아키텍처 drift 해소
- conventions/: 실제 코드 패턴과 불일치 수정
- operations/: 해소된 이슈 제거, env 정합성 확인

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: PR #A 생성**

```bash
git push origin chore/docs-cleanup-2026-05-15
gh pr create \
  --title "docs: CLAUDE.md + 전체 문서 코드 대조 정리 (2026-05-15)" \
  --body "$(cat <<'EOF'
## Summary
- CLAUDE.md Anthropic 가이드라인 준수 검토 및 최신화
- docs/architecture/* ↔ 실제 코드 drift 해소
- docs/conventions/*, docs/operations/* 최신화

## Test plan
- [ ] `pnpm check:doc-links` 0건
- [ ] `pnpm check:env-docs` 정합
- [ ] `pnpm build` 성공

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: PR #A 머지 확인**

CI 통과 후 머지. 머지 완료 후 다음 Phase로 진행.

```bash
gh pr view --web
```

---

## Phase B: Dead code + 코딩 컨벤션 → PR #B

### Task B-1: 브랜치 생성

- [ ] **Step 1: main 최신화 + 브랜치 생성**

```bash
git checkout main && git pull origin main
git checkout -b chore/code-cleanup-2026-05-15
```

Expected: main이 PR #A 머지 결과를 포함해야 한다.

---

### Task B-2: 미사용 import / 변수 탐지 및 제거

**Files:** ESLint 결과 기반으로 대상 파일 결정

- [ ] **Step 1: ESLint no-unused-vars 실행**

```bash
pnpm lint --rule "no-unused-vars: error" 2>&1 | grep "no-unused" | head -30
```

Expected: 미사용 변수/import 목록 출력. 없으면 이 태스크 완료.

- [ ] **Step 2: ESLint auto-fix 실행**

```bash
pnpm lint --fix 2>&1 | tail -10
```

Expected: auto-fix 가능한 항목 자동 수정.

- [ ] **Step 3: 남은 수동 수정**

auto-fix 후 남은 경고를 개별 파일에서 수동 수정.

```bash
# 수동 수정 필요 항목 재확인
pnpm lint 2>&1 | grep "warning\|error" | head -20
```

- [ ] **Step 4: 검증**

```bash
pnpm type-check && pnpm lint
```

Expected: 오류 0건.

---

### Task B-3: console.log 제거

**Files:** console.log 잔존 파일 (2건)

- [ ] **Step 1: 위치 확인**

```bash
grep -rn "console\.log" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__\|test-helpers\|\.test\."
```

Expected: 파일명:줄번호 2건 출력.

- [ ] **Step 2: 각 파일에서 console.log 제거**

해당 줄을 삭제한다. 디버그 목적이라면 제거. 에러 로깅 목적이라면 `console.error`로 교체.

- [ ] **Step 3: 검증**

```bash
grep -rn "console\.log" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__\|test-helpers\|\.test\."
```

Expected: 0건.

---

### Task B-4: 프로덕션 타입 단언 제거

**Files:** `src/app/saju/result/[id]/page.tsx`

- [ ] **Step 1: 대상 확인**

```bash
grep -n "as unknown as" src/app/saju/result/\[id\]/page.tsx
```

Expected:
```
53:    dayMasterElement: reading.day_master_element as unknown as SajuResult["dayMasterElement"],
```

- [ ] **Step 2: 실제 타입 확인**

```bash
# SajuResult 타입 확인
grep -n "dayMasterElement\|SajuResult" src/types/ -r | head -10

# reading.day_master_element DB 타입 확인
grep -n "day_master_element" src/lib/db/ -r | head -10
```

- [ ] **Step 3: 타입 단언 제거**

Zod 스키마나 명시적 타입 좁히기로 교체한다.

```typescript
// 수정 전
dayMasterElement: reading.day_master_element as unknown as SajuResult["dayMasterElement"],

// 수정 후 패턴 A: Zod enum 검증
import { sajuResultSchema } from "@/lib/validation/saju";
const parsed = sajuResultSchema.parse(reading);
// parsed.dayMasterElement 사용

// 수정 후 패턴 B: 타입 가드 (단순한 경우)
function isDayMasterElement(v: unknown): v is SajuResult["dayMasterElement"] {
  return typeof v === "string" && ["wood","fire","earth","metal","water"].includes(v);
}
dayMasterElement: isDayMasterElement(reading.day_master_element)
  ? reading.day_master_element
  : "wood",
```

실제 코드를 읽어 맥락에 맞는 패턴 선택.

- [ ] **Step 4: 검증**

```bash
pnpm type-check && pnpm test:coverage 2>&1 | tail -5
```

Expected: 오류 0건, 테스트 통과.

---

### Task B-4b: Zod safeParse 미적용 API 경계 탐지·수정

**Files:** `src/app/api/**/*.ts`

- [ ] **Step 1: API 라우트에서 Zod 미사용 위치 탐지**

```bash
# Zod safeParse 사용 현황
grep -rln "safeParse\|z\.parse\|zodParse" src/app/api --include="*.ts"

# Zod를 전혀 import하지 않는 API 라우트
for f in $(find src/app/api -name "route.ts"); do
  grep -q "zod\|safeParse" "$f" || echo "NO ZOD: $f"
done
```

Expected: Zod를 사용하지 않는 라우트 목록. 없으면 이 태스크 완료.

- [ ] **Step 2: 타입 단언으로 대체된 경계 탐지**

```bash
grep -rn "as unknown as\|as any\|req\.body as\|params as" \
  src/app/api --include="*.ts"
```

Expected: 타입 단언이 있는 라우트는 Zod 검증 교체 대상.

- [ ] **Step 3: Zod 미적용 라우트에 safeParse 추가**

기존 `docs/conventions/zod-schemas.md` 패턴 준수:

```typescript
// 수정 전 (타입 단언)
const { id, data } = (await req.json()) as { id: string; data: unknown };

// 수정 후 (Zod safeParse)
import { z } from "zod";
const bodySchema = z.object({ id: z.string(), data: z.unknown() });
const result = bodySchema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
const { id, data } = result.data;
```

- [ ] **Step 4: 검증**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage 2>&1 | tail -5
```

Expected: 오류 0건.

---

### Task B-5: eslint-disable 주석 검토·수정

**Files:** eslint-disable 주석이 있는 프로덕션 파일들

- [ ] **Step 1: 대상 목록 확인**

```bash
grep -rn "eslint-disable" src --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__\|\.test\."
```

Expected (현재 파악된 항목):
```
src/app/saju/session/page.tsx:124    exhaustive-deps
src/app/shinjeom/page.tsx:170        exhaustive-deps
src/app/shinjeom/session/page.tsx:110 set-state-in-effect
src/app/tarot/session/page.tsx:258,330,356  exhaustive-deps (3건)
src/components/effects/ParticleOverlay.tsx:128  exhaustive-deps
src/components/effects/ServiceBackground.tsx:113  set-state-in-effect
src/components/home/DailyFortune.tsx:125,127,147  set-state-in-effect (3건)
src/components/saju/DaeunTimeline.tsx:32  set-state-in-effect
src/components/tarot/ShuffleCeremony.tsx:276  exhaustive-deps
src/hooks/usePreselectCharacter.ts:45,54  exhaustive-deps (2건)
src/lib/db/index.ts:6,10,18,23  no-require-imports (4건)
```

- [ ] **Step 2: `no-require-imports` (src/lib/db/index.ts) — 유지**

Dynamic `require`는 Next.js DB 공급자 런타임 분기를 위한 의도적 패턴. 주석 유지, 이유 설명 주석 추가.

```typescript
// Dynamic import required: DB provider is selected at runtime via DB_PROVIDER env
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SupabaseAdapter } = require("./supabase-adapter");
```

- [ ] **Step 3: `set-state-in-effect` 주석들 — 각 파일 검토**

각 파일을 열어 실제 패턴 확인:

```bash
# 패턴 확인: useState setter를 useEffect 안에서 호출
grep -A 10 "set-state-in-effect" src/components/effects/ServiceBackground.tsx
grep -A 10 "set-state-in-effect" src/components/home/DailyFortune.tsx
grep -A 10 "set-state-in-effect" src/components/saju/DaeunTimeline.tsx
grep -A 10 "set-state-in-effect" src/app/shinjeom/session/page.tsx
```

**수정 가능한 경우**: `setState`를 직접 호출하는 패턴이면 `useLayoutEffect` 또는 이벤트 핸들러로 이동해 suppress 불필요하게 만든다.
**유지해야 하는 경우**: 애니메이션/Framer Motion 타이밍 이슈 등 실제 이유가 있는 경우 suppress 유지 (이유 주석 보강).

- [ ] **Step 4: `exhaustive-deps` 주석들 — 의존성 배열 수정 가능 여부 확인**

```bash
grep -B 2 -A 15 "exhaustive-deps" src/app/tarot/session/page.tsx
grep -B 2 -A 10 "exhaustive-deps" src/hooks/usePreselectCharacter.ts
```

**수정 가능한 경우**: `useCallback`/`useMemo`로 감싸거나 의존성을 추가해 suppress 제거.
**유지해야 하는 경우**: 무한 루프 방지 등 의도적 생략 → suppress 유지 + 이유 주석 보강.

- [ ] **Step 5: 검증**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage 2>&1 | tail -5
```

Expected: 오류 0건.

---

### Task B-6: 검증 + 커밋 + PR #B 생성

- [ ] **Step 1: 전체 품질 게이트**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage && pnpm build 2>&1 | tail -10
pnpm check:doc-links && pnpm i18n:check
```

Expected: 모두 통과.

- [ ] **Step 2: 커밋**

```bash
git add -p  # 변경 파일 선택적 스테이징
git commit -m "$(cat <<'EOF'
chore: dead code 제거 + 코딩 컨벤션 정리

- 미사용 import/변수 제거 (ESLint auto-fix)
- console.log 2건 제거
- saju/result 타입 단언 Zod 검증으로 교체
- eslint-disable 주석 최소화 (이유 없는 suppression 해소)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: PR #B 생성**

```bash
git push origin chore/code-cleanup-2026-05-15
gh pr create \
  --title "chore: dead code 제거 + 코딩 컨벤션 정리" \
  --body "$(cat <<'EOF'
## Summary
- 미사용 import/변수 제거
- console.log 프로덕션 잔존 2건 제거
- `saju/result` 페이지 타입 단언 제거 (Zod 검증 교체)
- `eslint-disable` 주석 최소화 (의도적 suppress에 이유 주석 추가)

## Test plan
- [ ] `pnpm type-check` 0건
- [ ] `pnpm lint` 0건
- [ ] `pnpm test:coverage` 전체 통과
- [ ] `pnpm build` 성공

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: PR #B 머지 확인**

CI 통과 후 머지.

---

## Phase C: 심층 리팩토링 → PR #C (Codex 주도)

### Task C-1: 브랜치 생성 + 대상 파일 상세 분석

- [ ] **Step 1: main 최신화 + 브랜치 생성**

```bash
git checkout main && git pull origin main
git checkout -b refactor/component-deep-2026-05-15
```

- [ ] **Step 2: 대상 파일 내부 구조 분석**

```bash
# 각 대형 파일의 함수/컴포넌트 목록 추출
grep -n "^function\|^const.*=.*=>\|^export\|^  const.*= use\|^  function" \
  src/app/tarot/session/page.tsx | head -30

grep -n "^function\|^const.*=.*=>\|^export" \
  src/components/effects/MysticBackground.tsx | head -20

grep -n "^function\|^const.*=.*=>\|^export\|^  const.*= use" \
  src/app/shinjeom/session/page.tsx | head -20

grep -n "^function\|^const.*=.*=>\|^export\|^  const.*= use" \
  src/app/saju/session/page.tsx | head -20
```

Expected: 각 파일에서 추출 가능한 서브컴포넌트/함수 목록 파악.

---

### Task C-2: tarot/session/page.tsx 분리 (Codex 핸드오프)

**Files:**
- Modify: `src/app/tarot/session/page.tsx` (853줄 → 300줄 이하 목표)
- Create: `src/components/tarot/TarotResultPanel.tsx` (결과 표시 UI)
- Create: `src/components/tarot/TarotReadingMessages.tsx` (메시지 스트림 UI)

**Codex 핸드오프 브리프:**

```
tarot/session/page.tsx (853줄)를 다음 기준으로 분리해 주세요:

1. 페이지 컴포넌트는 상태 관리 + 이벤트 핸들러만 보유 (300줄 이하 목표)
2. 결과 패널 UI → src/components/tarot/TarotResultPanel.tsx
3. 메시지 스트림 UI → src/components/tarot/TarotReadingMessages.tsx
4. 분리 기준: "UI를 변경해도 로직을 건드리지 않아도 되는가?"
5. 기존 훅(useSession, useReadingReveal, useSSEStream)은 그대로 유지
6. 분리 후 pnpm type-check + pnpm test:coverage 통과 필수
7. 이미 추출된 헬퍼 함수(getReadingErrorText, addReadingResultMessages)는 유지
```

- [ ] **Step 1: 현재 컴포넌트 구조 파악**

```bash
wc -l src/app/tarot/session/page.tsx
grep -n "return (" src/app/tarot/session/page.tsx
```

- [ ] **Step 2: 분리 실행 (Codex)**

Codex가 분리를 수행한다. Claude는 위 브리프를 전달하고 결과를 검토한다.

- [ ] **Step 3: 검증**

```bash
pnpm type-check && pnpm test:coverage 2>&1 | tail -5
```

Expected: 오류 0건, 기존 테스트 통과.

---

### Task C-3: MysticBackground.tsx 분리

**Files:**
- Modify: `src/components/effects/MysticBackground.tsx` (581줄)
- Create: `src/components/effects/mysticUtils.ts` (순수 유틸 함수)

- [ ] **Step 1: 분리 대상 파악**

```bash
grep -n "^function\|^const.*=.*=>" src/components/effects/MysticBackground.tsx | head -20
```

Expected: 컴포넌트 렌더링과 무관한 순수 계산 함수 목록 파악.

- [ ] **Step 2: 순수 함수 추출**

canvas 계산, 파티클 로직 등 순수 유틸을 `mysticUtils.ts`로 추출. 패턴:

```typescript
// src/components/effects/mysticUtils.ts
export function calculateParticlePosition(
  x: number, y: number, t: number
): { x: number; y: number } {
  // 기존 로직 이동
}
```

- [ ] **Step 3: 검증**

```bash
pnpm type-check && pnpm build 2>&1 | tail -5
```

---

### Task C-4: shinjeom/session + saju/session 페이지 분리

**Files:**
- Modify: `src/app/shinjeom/session/page.tsx` (456줄)
- Modify: `src/app/saju/session/page.tsx` (383줄)
- Create 필요 시: `src/components/shinjeom/ShinjeomChatPanel.tsx`
- Create 필요 시: `src/components/saju/SajuResultDetail.tsx`

- [ ] **Step 1: 타로/사주/신점 세션 페이지 공통 패턴 파악**

```bash
# 세 파일에서 공통으로 나타나는 import 패턴
grep "^import" src/app/tarot/session/page.tsx | sort > /tmp/tarot_imports.txt
grep "^import" src/app/saju/session/page.tsx | sort > /tmp/saju_imports.txt
grep "^import" src/app/shinjeom/session/page.tsx | sort > /tmp/shinjeom_imports.txt
comm -12 /tmp/tarot_imports.txt /tmp/saju_imports.txt
```

Expected: 공통 import 목록. 공통 UI 블록 후보 파악.

- [ ] **Step 2: 공통 추출 가능 UI 블록 목록 작성**

3개 세션 페이지를 비교해 동일한 UI 패턴이 있으면 공통 컴포넌트(`src/components/common/`) 추출 후보로 기록.

```bash
# 실제 JSX 반환 구조 비교
grep -A 5 "return (" src/app/tarot/session/page.tsx | head -20
grep -A 5 "return (" src/app/saju/session/page.tsx | head -20
grep -A 5 "return (" src/app/shinjeom/session/page.tsx | head -20
```

- [ ] **Step 3: 분리 실행 (Codex)**

Codex 핸드오프 브리프:

```
shinjeom/session/page.tsx (456줄), saju/session/page.tsx (383줄)를 분리해 주세요:

1. 각 페이지는 상태 관리 + SSE 핸들러만 보유 (300줄 이하 목표)
2. 채팅 UI → ShinjeomChatPanel.tsx (신점)
3. 사주 결과 상세 → SajuResultDetail.tsx (사주, 필요 시)
4. 3개 서비스 간 완전히 동일한 UI 블록이 있으면 src/components/common/에 추출
5. useShinjeomSession, useSajuSession 훅은 그대로 유지
6. pnpm type-check + pnpm test:coverage 통과 필수
```

- [ ] **Step 4: 검증**

```bash
pnpm type-check && pnpm test:coverage 2>&1 | tail -5
```

---

### Task C-5: settings/page.tsx + mypage/page.tsx 검토

**Files:** `src/app/settings/page.tsx` (350줄), `src/app/mypage/page.tsx` (334줄)

- [ ] **Step 1: 분리 필요 여부 판단**

```bash
# JSX 내 섹션 개수 파악
grep -n "<section\|<div.*section\|{/\* .* \*/}" src/app/settings/page.tsx | head -15
grep -n "<section\|<div.*section\|{/\* .* \*/}" src/app/mypage/page.tsx | head -15
```

Expected: 섹션이 3개 이상이고 독립적이면 분리. 그렇지 않으면 이 태스크 스킵.

- [ ] **Step 2: 분리 필요 시 실행 (Codex)**

각 섹션을 `src/components/settings/` 또는 `src/components/mypage/`로 추출.

- [ ] **Step 3: 검증**

```bash
pnpm type-check && pnpm build 2>&1 | tail -5
```

---

### Task C-6: 훅 패턴 이탈 수정

**Files:** 이탈 발견된 훅 파일

- [ ] **Step 1: store vs. pure hook 혼용 탐지**

```bash
# Zustand store가 아닌데 전역 상태를 관리하는 훅
grep -rn "useState\|useRef" src/hooks --include="*.ts" | grep -v "\.test\." | head -20

# Zustand store 목록
grep -rn "create(" src/hooks --include="*.ts" | head -10
```

Expected: `use~Store.ts` 파일들이 `create()` 패턴 사용 확인. 일반 훅이 전역 상태 관리를 하면 Zustand store로 이전.

- [ ] **Step 2: useEffect 의존성 배열 누락 수정**

B-5에서 수정하지 않은 `exhaustive-deps` 경고를 해소한다. 의존성 추가 또는 `useCallback` 감싸기.

```bash
# 남은 경고 목록
pnpm lint 2>&1 | grep "exhaustive-deps"
```

---

### Task C-7: 전체 검증 + 커밋 + PR #C 생성

- [ ] **Step 1: 전체 품질 게이트**

```bash
pnpm type-check && pnpm lint && pnpm test:coverage && pnpm build 2>&1 | tail -10
pnpm check:doc-links && pnpm i18n:check
```

Expected: 모두 통과.

- [ ] **Step 2: 커밋**

```bash
git add src/
git commit -m "$(cat <<'EOF'
refactor: 대형 컴포넌트 분리 + 훅 패턴 정리

- tarot/session/page.tsx (853줄) → TarotResultPanel, TarotReadingMessages 추출
- MysticBackground.tsx (581줄) → mysticUtils.ts 분리
- shinjeom/session, saju/session 페이지 서브컴포넌트 추출
- 3개 서비스 공통 UI 블록 → components/common/ 통합
- useEffect exhaustive-deps 경고 해소

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: PR #C 생성**

```bash
git push origin refactor/component-deep-2026-05-15
gh pr create \
  --title "refactor: 대형 컴포넌트 분리 + 훅 패턴 정리" \
  --body "$(cat <<'EOF'
## Summary
- tarot/session/page.tsx (853줄) 서브컴포넌트 분리
- MysticBackground.tsx (581줄) 유틸 분리
- shinjeom/session, saju/session 페이지 분리
- 3개 서비스 공통 UI 블록 추출
- useEffect exhaustive-deps 경고 해소

## Test plan
- [ ] `pnpm type-check` 0건
- [ ] `pnpm lint` 0건
- [ ] `pnpm test:coverage` 전체 통과
- [ ] `pnpm build` 성공

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: PR #C 머지 확인**

CI 통과 후 머지.

---

## Phase D: 완료 문서화

### Task D-1: 문서 최신화 커밋 (main)

- [ ] **Step 1: main 체크아웃 + docs 최신화**

```bash
git checkout main && git pull origin main
```

CLAUDE.md의 프로젝트 구조 트리에 PR #C에서 생성된 신규 컴포넌트 파일을 추가한다.

- [ ] **Step 2: known-issues.md 업데이트**

PR #C에서 해소된 "300줄 초과 컴포넌트" 항목을 완료 처리한다.

- [ ] **Step 3: 커밋 + 푸시**

```bash
git add CLAUDE.md docs/
git commit -m "docs: 전체 문서 최신화 및 최적화 — 코드·문서 전체 정리 완료 반영"
git push origin main
```

---

## 검증 명령어 요약

```bash
# 품질 게이트 (모든 PR 공통)
pnpm type-check        # TypeScript 오류 0건
pnpm lint              # ESLint 오류 0건
pnpm test:coverage     # 전체 통과, statements 95%+
pnpm build             # 빌드 성공

# 문서 검증
pnpm check:doc-links   # 깨진 링크 0건
pnpm check:env-docs    # env 정합성
pnpm i18n:check        # 번역 키 drift 0건
```

## 파기 확정 (절대 수정 금지)

| 항목 | 파일 | 근거 |
|------|------|------|
| `as any` 5건 | `src/lib/db/postgres-adapter.ts` | 3-에이전트 심층 검토 파기 확정 (2026-04-26) |
| rate-limit Redis 전환 | — | 파기 확정 |
| SupabaseAdapter 통합 테스트 | — | 파기 확정 |
