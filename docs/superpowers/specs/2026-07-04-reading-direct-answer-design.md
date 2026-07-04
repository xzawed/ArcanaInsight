# 리딩 질문 직답(directAnswer) answer-first 설계 — 2026-07-04

## 문제

타로·사주·신점 리딩이 사용자의 구체적·시간한정 질문(예: "이번 달에 이직할 수 있을까요?")에 **동문서답**(질문 무시·일반론 나열)처럼 답한다.

## 진단 (딥리서치 + 서비스별 적대적 검증으로 확정)

세 서비스 모두 리딩을 "질문에 답하는 산출물"이 아니라 "도메인 섹션 카탈로그"로 설계했고, 유일한 직답 필드(`directAnswer`)마저 회피적이거나 배선이 끊겨 있었다.

| RC | 내용 | 판정 |
|----|------|------|
| RC1 | 타로 `directAnswer`가 "모든 상황(재직/구직/이직/창업) 균등 포괄" 강제 (`prompt-builder.ts`) | CONFIRMED |
| RC2 | 자유질문이 있어도 3-시나리오 헤지 재부과 (`buildFreeQuestionPrompt`) | CONFIRMED |
| RC3 | **사주: route가 "directAnswer에 답하라" append하지만 사주 스키마·파서·UI에 필드 없음 → 답 완전 소실** | CONFIRMED |
| RC4 | 사주/신점 섹션이 도메인 축 고정, 질문 앵커 부재 | CONFIRMED |
| RC5 | 시스템 프롬프트 "단정 금지·가능성 열기" 편향 | 타로 CONFIRMED / **신점 REFUTED**(해당 지시 없음) |
| RC6 | 신점 최종 리딩 "종합만" 지시, 핵심질문 직답 강제 없음 | CONFIRMED |
| RC7 | 시간한정 질문이 timeRange/월운과 미연계 | CONFIRMED |

**심각도**: 사주(최악, 답 소실 + UI 계약 위반) > 신점(되질문 루프 + 종합만) > 타로(필드는 살아있고 프롬프트만 회피적).

## 확정 처방 — answer-first 계약

① 질문 재진술 → ② 가장 유력한 한 방향 단언 → ③ 확신 수위 문체 표기 → ④ 근거(도메인 렌즈)+전제조건. "모든 상황 균등 나열" 안티패턴 금지. 2축 분리(사적 사실 완충 / 방향 커밋). 민감 도메인 강등.

## 사용자 결정 (2026-07-04)

- 범위: **P0 3건 + 헬퍼 substrate** 먼저 (P1 후속).
- 확신 수위: **방향 커밋 + 확신도 병기**, 민감 도메인 자동 강등.
- 신점 UX: **chat-only 유지 + 최종 턴 직답** (전용 입력창 미추가).

## 구현 (P0 — 이번 PR)

| # | 내용 | 파일 |
|---|------|------|
| #2 헬퍼 | `buildDirectAnswerContract(domain)` → `{schemaLine, systemSpec, footerReminder}` 단일 진실원 | `prompt-builder.ts` |
| #1 타로 | `buildSystemPrompt`·`buildReadingPrompt`·`buildFreeQuestionPrompt` answer-first 전환, 2축 분리 | `prompt-builder.ts` |
| #3 사주 | `getSystemPrompt` 스켈레톤에 directAnswer + `parseResult` 추출 + 결과화면 렌더 + i18n(ko/en/ja) | `saju-service.ts`, `saju/session/page.tsx`, i18n |
| #4 신점 | 최종 턴 첫 사용자 메시지 = 핵심질문 재노출 + directAnswer 필드·파서·렌더 + i18n | `shinjeom-service.ts`, `shinjeom/session/page.tsx`, i18n |
| 부수 | en/ja JSON 키 화이트리스트에 `directAnswer` 등 추가(키 번역 방지) | `prompt-builder.ts` |

테스트: `prompt-builder.test.ts`(헬퍼·buildFreeQuestionPrompt), `saju-service.test.ts`/`shinjeom-service.test.ts`(parseResult directAnswer 추출·하위호환, 최종턴 핵심질문 재노출). 기존 `tarot-reading.test.ts`("directAnswer 필드에서" assertion)는 문구 보존으로 무변경 통과.

## P1 구현 (2차 PR — #6 + #5)

- ✅ **#6 시간한정 질문 → 사주 월운/세운 결정론적 연계** (RC7): `detectSajuTimeHorizon(question)`(ko/en/ja 키워드)가 자유질문의 시간 지평(이번 주/달/올해/내년)을 감지 → route의 `applyHorizonToCalcOptions`가 드롭다운 timeRange와 무관하게 해당 월운/세운/일운 데이터를 **계산·주입**(시기 판정은 데이터에서 결정론적, 모델은 narration만 → SSE 재생성 플레이키 방지). `buildSajuPrompt`에 시기 창 지시 추가(정확한 날짜 금지, 범위+조건).
- ✅ **#5 렌더 통일·관측성**: 타로 `directAnswer`를 결과 최상단으로 승격(`TarotResultPanel`), 타로·사주 route에서 freeQuestion 있는데 `directAnswer` 비면 관측 경고 로그(RC3 재발 감시).

## P2 구현 (3차 PR — DB 영속)

- ✅ **directAnswer DB 영속**: 마이그 023(`readings`·`saju_readings`·`shinjeom_readings`에 `direct_answer TEXT DEFAULT ''`) + drizzle 스키마 + `persistDirectAnswer`(본 리딩 insert와 **분리된 best-effort UPDATE** — 컬럼 미적용 환경에서도 본 저장 무영향, 배포 순서 무관) + result API `SAFE_KEYS` + result 페이지 렌더(3서비스). ✅ 마이그 023 운영 Supabase 적용 완료(2026-07-04, 프로젝트 arcana-insight).

## 남은 과제 (미구현)

- **신점 중간 턴 되질문 루프**: 사용자 결정으로 이번엔 미변경.
- Grok `response_format json_schema`(strict)로 directAnswer 필수화 검토(양 provider 실측 선행).

## 방법

딥리서치(4각도) + 서비스별 적대적 진단(3서비스·횡단) + 설계 합성 다이나믹 워크플로(9 에이전트). 적대 검증이 초안의 RC5(신점) 오판을 REFUTED로 교정.
