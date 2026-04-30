# 코드·문서 심층 정리 결과 (2026-05-01)

## 완료 항목

### 문서 동기화 (Tasks 1-2)

| Task | 파일 | 변경 내용 |
|------|------|----------|
| 1 | `docs/architecture/data-model.md` | `reviews.ts, stats.ts` 삭제 반영 (faq.ts만 잔존) — PR #182 |
| 1 | `docs/architecture/system-overview.md` | StatsCounter·ReviewCarousel 삭제 반영, GenderFilter만 유지 — PR #182 |
| 2 | `docs/operations/known-issues.md` | SonarCloud CRITICAL 표 갱신 — PR #184 후 tarot 3항목 해소 확인 |

### SonarCloud CRITICAL 인지 복잡도 해소 (Tasks 3-11)

| Task | 파일 | 함수 | 구 CC | 신 CC | 전략 |
|------|------|------|-------|-------|------|
| 3 | `src/services/core/http-utils.ts` | `readSseLines` | 18 | ~10 | `parseSseLine` 헬퍼 추출 |
| 4 | `src/components/common/ReadingText.tsx` | 컴포넌트 | 18 | ~6 | `normalizeText`, `splitLongParagraph` 추출 |
| 5 | `src/components/home/DailyCard.tsx` | 컴포넌트 | 17 | ~8 | `renderCardSlot`, `renderInterpretationPanel` 추출 |
| 6 | `src/app/shinjeom/session/page.tsx` | `handleSend`, `handleEndConsultation` | 20·21 | ≤15 | `parseSseLine`, `drainSseChunks`, `updateMessageContent`, `removeMessage` 추출 |
| 7 | `src/app/saju/session/page.tsx` | 공유 핸들러 | 22 | ≤9 | `shareWithUrl`, `shareWithText`, `handleSajuShare` 추출 |
| 8 | `src/components/common/UserInfoForm.tsx` | `loadUserInfo` | 30 | ~4 | `applySupabaseProfile`, `applyLocalProfile`, `persistProfileToSupabase` 추출 |
| 9 | `src/services/saju/saju-service.ts` | `buildSajuPrompt` | 33 | ~3 | `resolveTimeContext`, `resolveTopicInstruction`, `buildAdditionalSections`, `buildPillarSection` 추출 |
| 10 | `src/hooks/useSSEStream.ts` | `fetchSSEStream` | 47 | ≤15 | `processLine`, `readStream`, `flushRemainingBuffer`, `resolveErrorDetail`, `logParseError` 추출 |
| 11 | `src/app/tarot/session/page.tsx` | `startReading` | ~18 | ~9 | `getReadingErrorText`, `addReadingResultMessages` 추출 |

---

## SonarCloud CRITICAL 해소 현황

구 CRITICAL 12건 중:
- **PR #184 선행 해소**: tarot 구 CC=75 함수 분해됨 (startReading 잔여 ~18 → 이번 세션에서 ~9로 추가 감소)
- **이번 세션 해소**: 나머지 9건 전부 CC 15 이하로 감소

**예상 잔여 CRITICAL**: 0건 (SonarCloud 재분석 후 확인 필요)

> known-issues.md의 `tarot/session startReading` 항목(CC ~18 추정)은 이번 세션에서 추가 수정 완료됨 → 다음 SonarCloud 분석에서 해소 확인 예정

---

## 잔여 항목 및 이유

| 항목 | 이유 |
|------|------|
| SonarCloud 실측 재확인 | PR 머지 후 자동 분석 실행 필요. 현재 수치는 수동 추정치 |
| saju-service.ts branches 91.8% | 추출된 `buildAdditionalSections` 내 일부 분기 미커버. 기존 테스트 변경 없음 |
| tarot `startReading` CC 재측정 | SonarCloud 기준 실측치 필요 (수동 추정 ~9) |

---

## 성공 기준 달성 여부

| 기준 | 결과 |
|------|------|
| `pnpm type-check` 오류 0건 | ✅ PASS |
| `pnpm lint` 오류 0건 | ✅ PASS |
| `pnpm test:coverage` — 672개, statements 98%+ | ✅ 672개 PASS |
| `pnpm build` 성공 | ✅ Compiled successfully |
| `check-doc-links` 깨진 링크 0건 | ✅ 49개 파일 검사 통과 |
| `check-env-docs` 정합성 | ✅ 16개 변수 모두 문서에 존재 |
| CLAUDE.md 테스트 수 동기화 | ✅ 672개 일치 |

---

## 후속 권장 작업

1. **PR 생성 → CI 실행**: SonarCloud 자동 재분석으로 실제 CRITICAL 건수 확인
2. **SonarCloud 결과 반영**: known-issues.md 추정 항목을 실측값으로 교체
3. **saju-service branches 커버리지**: `buildAdditionalSections` 분기 테스트 보강 (선택적)
4. **tech debt 재평가**: CRITICAL 0건 달성 시 known-issues.md 기술부채 섹션 정리
