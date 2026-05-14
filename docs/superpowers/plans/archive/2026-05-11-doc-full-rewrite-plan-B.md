# 문서 전면 재작성 계획 (Plan B)

> 작성일: 2026-05-11  
> 선행 작업: PR #335·#336·#337 (Plan A — 사실 정합성 수정) 머지 후 착수

---

## 목표

사실 오류 수정(Plan A)과 달리, 문서의 **구조·목차·표현·중복** 전체를 개편해  
"처음 보는 개발자가 docs/ 만으로 프로젝트를 파악할 수 있는" 수준으로 끌어올린다.

---

## 범위

| 카테고리 | 파일 | 재작성 우선순위 | 이유 |
|----------|------|:-----------:|------|
| architecture/ | system-overview.md | 상 | 카드 스타일 시스템·Visual Overhaul 전체 미반영 |
| architecture/ | data-model.md | 상 | 스킨·스타일·이미지 경로 설명이 혼재 |
| workflow/ | task-playbooks.md | 상 | 신규 컴포넌트(StyleSelector, SkinSelector) 미포함 |
| workflow/ | claude-codex-collaboration.md | 중 | 최신 역할 분담(에이전트 6종) 반영 필요 |
| conventions/ | image-assets.md | 중 | 섹션 중복, 경로 규칙 혼재 |
| operations/ | known-issues.md | 중 | 해결된 이슈와 잔존 이슈 분류 재정비 |
| operations/ | operation-guide.md | 하 | mermaid 다이어그램 최신화 |
| CLAUDE.md | (루트) | 하 | 분량 증가 추세 — 핵심만 남기고 링크로 위임 |

---

## 접근 방법

### 원칙

1. **정본 우선**: 코드를 정본으로 삼고 문서를 맞춘다. 문서가 맞고 코드가 틀린 경우는 별도 코드 수정 PR로 분리.
2. **중복 제거**: 동일 내용이 두 곳 이상에 있으면 한 곳을 정본으로 두고 나머지는 링크로 대체.
3. **구조 통일**: 각 문서는 `# 제목 → ## 개요 → ## 상세 섹션 → ## 관련 문서` 형식을 따른다.
4. **길이 제한**: CLAUDE.md 200행 이하 유지. 세부 설명은 docs/ 문서로 위임.

### 실행 전략

멀티 에이전트 병렬 재작성 — 카테고리별 독립 브랜치 → PR 분할 머지

```
PR-B1: architecture/ 전면 재작성 (system-overview + data-model)
PR-B2: workflow/ 재작성 (task-playbooks + claude-codex-collaboration)
PR-B3: conventions/ 재작성 (image-assets + 기타)
PR-B4: operations/ + CLAUDE.md 재작성
```

---

## 주요 재작성 사항

### architecture/system-overview.md
- Visual Overhaul 이후 전체 컴포넌트 지도 업데이트
- CardStyleId, useCardStyleStore, FallbackProvider, SSE 패턴을 레이어 다이어그램으로 표현
- DB/Auth 추상화 분기 흐름 다이어그램 추가

### architecture/data-model.md
- 카드 비주얼 시스템 섹션을 `CardStyles(아트 스타일) ↔ Skins(팔레트) ↔ SVG(원본)` 3계층으로 재정리
- 이미지 경로 규칙을 `nukki / nukki-enhanced / card-styles (Supabase) / skins (SVG)` 4 유형으로 통합 표
- 설정 페이지 vs SkinGallery 구성 차이를 표로 명시

### workflow/task-playbooks.md
- 새 컴포넌트 추가 플레이북: StyleSelector, SkinSelector, CardStyleSelector
- 카드 스타일 이미지 생성·업로드 플레이북 추가
- 에이전트(character-add, skin-manager, divination-scaffold 등) 활용 가이드 추가

### CLAUDE.md (루트)
- 프로젝트 구조 트리를 5행 이내 요약으로 압축, 상세는 `docs/architecture/system-overview.md` 링크
- "핵심 아키텍처" 항목 각 3줄 이내로 압축
- "필수 주의사항" 항목을 docs 링크로 대체 (중복 제거)

---

## 체크리스트

착수 전:
- [x] PR #335·#336·#337 모두 머지 확인
- [x] `pnpm check:doc-links` 로컬 통과 확인
- [x] `pnpm test:coverage` 861개 이상 통과 확인

착수 후 각 PR:
- [x] 재작성 내용이 실제 코드와 일치하는지 교차검증 에이전트 실행
- [x] `pnpm check:doc-links` 통과
- [x] CLAUDE.md 200행 이내 유지

---

## 예상 일정

| PR | 예상 범위 | 비고 |
|----|---------|------|
| PR-B1 | architecture/ (2파일) | 가장 변화가 큰 영역 |
| PR-B2 | workflow/ (2파일) | 에이전트 목록 포함 |
| PR-B3 | conventions/ | 이미지 경로 통합 |
| PR-B4 | operations/ + CLAUDE.md | CLAUDE.md 압축 병행 |

각 PR은 독립적으로 머지 가능. PR-B1 → PR-B4 순서 권장 (architecture 먼저 확정 후 다른 문서가 참조).
