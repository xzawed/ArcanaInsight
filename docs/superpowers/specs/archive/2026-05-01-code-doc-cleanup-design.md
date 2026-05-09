# 전체 코드·문서 멀티 에이전트 심층 정리 설계

**날짜**: 2026-05-01  
**목표**: 코드 품질(SonarCloud CRITICAL 12건 해소) + 문서 정합성(PR #182·#184 반영) 동시 달성  
**범위**: 코드 + 문서 전체 — 검토·계획·실행·검증·후속 계획까지 단일 세션 완료  
**수정 범위**: 적극적 (대규모 함수 분리 포함, 테스트 커버리지 98% 유지 필수)

---

## 아키텍처: 3단계 멀티 에이전트 교차 검토

```
[Stage 1 — 병렬 탐색]          [Stage 2 — 교차 종합]     [Stage 3 — 실행]        [Stage 4 — 검증]
Agent-코드    ─┐                                           병렬: 문서·P3·P2
Agent-문서    ─┼─→ 오케스트레이터 → 우선순위 계획 ──→      순차: P1(CC 고복잡도)  → Verification
Agent-아키텍처─┘                                           각 단계 후 로컬 test
```

---

## Stage 1: 병렬 탐색 에이전트

### Agent-코드 (Code Quality)

**임무:**
- SonarCloud CRITICAL 12건 각각 현재 코드 상태 직접 확인
  - PR #184로 `tarot/session/page.tsx` 대폭 변경됨 → CC 75 해소 여부 재측정 필수
- 미사용 import·export·dead code 전체 탐색
- `as any` 잔존 위치 및 안전 대체 가능 여부 판단
- 각 CRITICAL 함수의 분리 전략 설계 (서브함수 경계 제안)

**대상 파일 (SonarCloud CRITICAL 기준):**
| 파일 | 라인 | 구 복잡도 | 확인 후 현황 |
|------|------|-----------|-------------|
| `src/app/tarot/session/page.tsx` | 209 | 75 | PR #184 후 재측정 |
| `src/hooks/useSSEStream.ts` | 19 | 47 | — |
| `src/services/saju/saju-service.ts` | 57 | 33 | — |
| `src/components/common/UserInfoForm.tsx` | 63 | 30 | — |
| `src/app/tarot/session/page.tsx` | 189 | 중첩 4단계 | PR #184 후 재측정 |
| `src/app/saju/session/page.tsx` | 197 | 22 | — |
| `src/app/tarot/session/page.tsx` | 584 | 22 | PR #184 후 재측정 |
| `src/app/shinjeom/session/page.tsx` | 165 | 21 | — |
| `src/app/shinjeom/session/page.tsx` | 69 | 20 | — |
| `src/services/core/http-utils.ts` | 19 | 18 | — |
| `src/components/common/ReadingText.tsx` | 9 | 18 | — |
| `src/components/home/DailyCard.tsx` | 22 | 17 | — |

**산출물:** 파일별 현재 CC + 분리 전략 보고서

---

### Agent-문서 (Documentation)

**임무:**
- CLAUDE.md ↔ 현재 코드 전체 정합성 검사
  - 테스트 수(현재 672), 컴포넌트 목록, 파일 구조 트리
- PR #182 반영 확인: ReviewCarousel·StatsCounter·reviews.ts·stats.ts 삭제 → docs/ 잔존 언급
- PR #184 반영 확인: tarot 아키텍처 변경 → ai-infrastructure·task-playbooks 등 업데이트 필요 여부
- known-issues.md SonarCloud 표 ↔ 실제 코드 현황 대조
- docs/ 전체 47개 파일 순회 → 오래된 경로·파일명·숫자 탐색

**산출물:** 문서-코드 불일치 목록 + 수정 필요 파일·내용 보고서

---

### Agent-아키텍처 (Testing & Patterns)

**임무:**
- PR #184 신규 테스트 3종 분석 → CLAUDE.md 필수 주의사항 6번(outer catch 패턴) 준수 여부
- 리팩터링 후 CC 해소 시 테스트 커버리지 유지 전략 설계
  - 현재 98% 임계값 안전마진 계산 (672개 테스트 중 몇 개까지 손실 허용?)
- `useSSEStream.ts` CC=47: 훅 계약(반환 타입·인터페이스) 변경 없이 내부 분리 가능한지 경계 분석
- `saju-service.ts` CC=33: SSE fire-and-forget 패턴(CLAUDE.md 주의사항 7번) 유지 여부 검증
- 각 리팩터링 후 어떤 테스트를 추가해야 하는지 명세

**산출물:** 테스트 전략 보고서 + 함수 경계 분석

---

## Stage 2: 교차 종합 (오케스트레이터)

3개 보고서 통합 → 충돌 해소 → 우선순위 계획:

| 등급 | 기준 | 처리 방식 |
|------|------|----------|
| **P0** | 타입 오류·빌드 실패·Claude 행동에 영향 주는 문서 오류 | 최우선 순차 처리 |
| **P1** | CC > 30, 핵심 문서-코드 불일치 | 순차 처리 (테스트 동반) |
| **P2** | CC 15~30, 마이너 문서 갱신 | 병렬 가능 |
| **P3** | 미사용 import·dead code·스타일 | 병렬 일괄 처리 |

---

## Stage 3: 실행

### 병렬 실행 (독립 작업)
- 문서 업데이트 전체 (코드 리스크 없음)
- P3: dead code·미사용 import 정리
- P2: CC 15~30 소형 함수 분리 (ReadingText, DailyCard, http-utils)

### 순차 실행 (의존성 있는 작업)
각 단계 후 `pnpm test` 통과 확인 필수:

1. `useSSEStream.ts` CC=47 — 훅 인터페이스 유지, 내부 로직 서브함수 분리
2. `tarot/session/page.tsx` — PR #184 잔여 CC 확인 후 처리
3. `saju-service.ts` CC=33 → `saju/session/page.tsx` CC=22
4. `shinjeom/session/page.tsx` (69, 165 두 함수)
5. `UserInfoForm.tsx` CC=30
6. 각 리팩터링 함수에 테스트 추가 (outer catch 포함)

---

## Stage 4: 검증 에이전트

```bash
pnpm type-check        # TS 오류 0건
pnpm lint              # ESLint 오류 0건
pnpm test:coverage     # 672개+, statements 98%+
pnpm build             # 빌드 성공
pnpm exec tsx scripts/sync-test-count.ts    # CLAUDE.md 테스트 수 동기화
pnpm exec tsx scripts/check-doc-links.ts    # 깨진 링크 0건
pnpm exec tsx scripts/check-env-docs.ts     # env 정합성
```

실패 시: `git checkout -- <파일>` 으로 해당 파일만 복원, 나머지 유지. 원인 분석 후 재시도.

---

## 후속 계획 문서

`docs/superpowers/plans/2026-05-01-code-doc-cleanup-result.md` 작성:
- 완료 항목 목록
- 잔여 항목 및 이유
- 다음 세션 권장 작업 (SonarCloud 재분석 결과 포함)

---

## 성공 기준

| 항목 | 기준 |
|------|------|
| SonarCloud CRITICAL | 12건 → 0건 (또는 PR #184 해소분 제외 잔여 0건) |
| 테스트 수 | 672개 이상 유지 |
| 커버리지 | statements 98% 이상 |
| 빌드 | 성공 |
| 문서 링크 | 깨진 링크 0건 |
| CLAUDE.md | 현재 코드 상태 완전 반영 |
