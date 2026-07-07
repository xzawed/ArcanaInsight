---
name: pre-pr-checklist
description: PR 생성 전 자동화 불가 항목을 점검한다. "PR 올리기 전 확인", "PR 체크리스트", "머지 요청 전 검토" 등의 요청에 사용한다.
when_to_use: PR 생성 직전, gh pr create 실행 전, 코드 변경 완료 후 최종 검토 시
disable-model-invocation: false
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status *) Bash(grep *) Bash(pnpm check:*)
---

# PR 생성 전 최종 체크리스트

## 현재 변경 범위 파악

```!
git diff --stat HEAD origin/main 2>/dev/null || git diff --stat HEAD~1
```

## 자동화 게이트 (scripts/pre-pr-checks.sh가 검증)

- [ ] `pnpm type-check` — 0 error
- [ ] `pnpm lint` — 0 error
- [ ] `pnpm test:coverage` — branches 90 / functions 97 / lines·statements 98 (정본: `vitest.config.ts`)
- [ ] `pnpm check:doc-links` — 링크 유효
- [ ] `pnpm check:env-docs` — env.ts ↔ env-variables.md 정합성
- [ ] `pnpm i18n:check` — 번역 키 drift 없음

## 수동 확인 항목 (자동화 불가)

### 코드 품질
- [ ] 새 TS 파일 추가 시 `sonar-project.properties` exclusions 동기화했는가?
- [ ] 상수(max_tokens 등) 변경 시 해당 상수를 기댓값으로 쓰는 테스트도 수정했는가?
  - 확인: `grep -r "toBe(" src/__tests__/` 에서 변경 전 값 검색
- [ ] 이미지 덮어쓰기 전 기존 이미지 백업했는가? (캐릭터=R2 `cdn.xzawed.xyz/characters`, 스킨=R2 `cdn.xzawed.xyz/card-skins`에서 다운로드 — `nukki/`·`backup-v2/` 로컬 폴더는 #447로 제거됨)

### UI 변경
- [ ] UI 텍스트 변경 시 E2E `hasText`/`getByText` 셀렉터도 같이 수정했는가?
  - 확인: `grep -r "[변경된 텍스트]" e2e/`
- [ ] DOM 구조 변경 시 `e2e/helpers/service-navigation.ts` 영향 확인했는가?
- [ ] 캐릭터 등장 페이지: `md:w-[50%]` 5:5 규칙 유지했는가?

### 문서
- [ ] 변경한 동작과 관련 문서를 함께 갱신했는가?
- [ ] PR 설명에 변경 이유(WHY)가 명확히 기술됐는가?

### 브랜치
- [ ] feature 브랜치 → PR → 머지 순서인가? (main 직접 커밋 금지)
- [ ] 브랜치명 규칙 준수: `fix/`, `feat/`, `docs/`, `refactor/`, `test/`, `chore/`

## 현재 브랜치 상태

```!
git log --oneline origin/main..HEAD 2>/dev/null | head -10
```

---

모든 항목 확인 후 `gh pr create`를 실행하세요.  
자동화 게이트는 `gh pr create` 훅이 `scripts/pre-pr-checks.sh`를 자동 실행합니다.
