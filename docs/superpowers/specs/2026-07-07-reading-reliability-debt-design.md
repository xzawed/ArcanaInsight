# 리딩 신뢰성 기술부채 해소 설계 (2026-07-07)

> 2026-07-06 전체 품질 감사에서 도출된 리딩 파이프라인 기술부채 2건을 해소한다.
> 브레인스토밍 결과: **② parseError 관측성(작음)** → **① 스키마 중복 제거(핵심)** 순서로 진행.
> 근거 매핑은 실측 워크플로(리딩 스키마·parseError/DLQ 2영역 병렬 조사)로 확보.

## 배경 · 문제

### ② parseError 관측성 격차
- `parseError` 4종(`truncated`/`invalid_json`/`fallback_text`/`missing_fields`, `src/types/service.ts:39-43)은 **지배적 실패 모드**이나 지금 어디에도 영속·집계 흔적을 안 남긴다.
- 3 리딩 라우트의 저장 게이트가 `if (db && sessionId && !result.parseError) { … }` 형태라, parseError 경로는 게이트째 건너뛴다. `recordFailedReading`(reading-saver.ts:204-227)도 게이트 **안쪽** DB-insert 실패 catch에만 배선(tarot route:136, saju:197, shinjeom message:59)돼 parseError를 절대 포착하지 못한다.
- 유일한 흔적은 서비스별 ad-hoc `console.warn("[service] 부분 파싱")` — 통합 grep 마커(`[reading-save-failed]`류)가 없어 로그 로테이션 후 소실.
- ⚠️ **감사 오류 정정**: "마이그 022 운영 미적용"은 **사실이 아님**. Supabase MCP 실측 결과 `failed_readings` 테이블이 프로덕션에 존재·적용됨(마이그 20260701040723). 원인은 `db-abstraction.md:77`의 stale 문구(known-issues.md:26은 정확). 즉 진짜 결함은 "마이그 미적용"이 아니라 **배선 위치**다.

### ① 리딩 결과 스키마 중복
- 사주·신점의 `overallReading`(【】 소제목 서사)과 `sajuSections`/`shinjeomSections`(4 라벨 필드)가 **내용상 1:1 중복**이다. 사주 `overallReading` 6개 【】(`saju-service.ts:262`) ≈ `sajuSections`{structure/elements/fortune/guidance}. 신점 7개 【】(`shinjeom-service.ts:129`) ≈ `shinjeomSections`{spiritual/current/obstacles/future}. `topicReading`·`directAnswer`는 상보적(중복 아님, 유지).
- **인과가 코드로 성립**: 중복 섹션이 JSON에서 필수 spine 필드보다 **먼저** 방출(사주 `sajuSections`=첫 키 `saju-service.ts:254`, 신점 `shinjeomSections`가 overallReading 앞 `shinjeom-service.ts:123`)되고, 무결과 판정은 뒤쪽 `overallReading`/`advice` 공백만 조건(`saju-service.ts:350`, `shinjeom-service.ts:177`). 고정 토큰 상한 아래 ~20-24문단의 중복 선방출이 필수 필드를 절단 절벽으로 밀어낸다 → truncation → missing_fields 기저율 상승.
- 대조군 **타로(무결과 0%)**: 스키마에 섹션↔overall 중복 없음(`cardInterpretations`는 카드별 독립, overallReading은 교차 합성=상보). 신점(상한 48k로 최타이트)이 최악(67%)인 것과 정합.
- `overallReading`은 **load-bearing**(parseError 판정, 캐릭터 메모리 `prompt-builder.ts:308`, 공유 요약 `saju session/page.tsx:37`). 섹션은 second-class(PR #414/#420 add-on, parseError 판정 무관, 마이그 024 best-effort UPDATE).
- **UX**: 결과화면이 섹션과 overallReading을 **둘 다 렌더** → 사용자가 같은 내용을 두 번 봄(saju session:96-123, saju result/[id]:92-139, shinjeom result/[id]:50-97).
- ⚠️ **기대치 정직성**: #480 파서 방어가 이미 무결과를 실측 ~0%로 낮춤. 본 변경은 truncation *기저율 인하(defense-in-depth)* + *중복 UX 해소*이지 "무결과를 처음 잡는" 수정이 아니다. 정확한 감소폭은 배포 후 실측으로 확인한다.

## 목표 · 비목표

**목표**
1. parseError를 통합 grep 마커로 관측 가능하게(②).
2. 사주·신점 스키마에서 중복 섹션을 제거해 토큰 압박·중복 UX를 해소하고 파서 방어를 단순화(①).
3. 사용자 체감 콘텐츠·깊이·스캔성 **불변**(중복만 제거, overallReading이 라벨 내용을 이미 담음).

**비목표**
- parseError DB 영속 계량(②의 접근 B) — YAGNI, 마커가 유의미 발생률을 드러내면 후속.
- 마이그 024 컬럼 drop — best-effort UPDATE 전제·구 행 데이터 보존을 위해 유지.
- max_tokens 절감 — 상한 유지(headroom이 신뢰성에 기여).
- overallReading 축소/재배선(접근안 2) — 고위험, 채택 안 함.

## 설계 ② — parseError 관측성

- `src/lib/db/reading-saver.ts`: `logReadingParseError(service: string, parseError: string, sessionId?: string)` 추가 — `logReadingSaveFailure`(35-45)와 대칭. 출력 `[reading-parse-error] service=<s> type=<parseError> session=<id>`.
- 3 리딩 라우트(`tarot/reading`, `saju/reading`, `shinjeom/message`): `result.parseError`가 있으면 `done` 전송 후 이 헬퍼 호출(best-effort, throw 금지 — 스트림 무영향). 기존 서비스별 `console.warn("[service] 부분 파싱")`을 통합 마커로 대체.
- 문서: `docs/architecture/db-abstraction.md:77`의 "022 … ⚠️ 운영 DB 미적용" → "✅ 운영 DB 적용 완료(2026-07-01)"(known-issues·실측 DB와 동기).

## 설계 ① — 스키마 중복 제거

**정본 = `overallReading`(【】 헤더 서사) + `topicReading` + `advice` + `directAnswer`. 섹션 제거.**

1. **프롬프트** (`saju-service.ts`·`shinjeom-service.ts`): 요청 JSON에서 `sajuSections`/`shinjeomSections` 키 제거. overallReading의 【】 소제목·문단 요구는 유지(깊이 재배분 불필요 — 이미 라벨 내용 포함). anti-nesting 지시(saju:252, shinjeom:136)는 섹션이 사라지면 무의미하므로 정리. 트레일링 콤마 금지 지시는 유지.
2. **파서** (`parseResult`, saju:322-351 / shinjeom:151-179): 섹션 조립·`promoteNestedFields`의 섹션 대상 호출 제거. 무결과 판정(`!overallReading || !advice` → missing_fields)·`stripTrailingCommas`·`parseJsonSafe` 유지. `promoteNestedFields`(text-cleaner.ts:149-164)가 다른 곳에서 미사용이면 함께 제거(text-cleaner.test.ts 동반 정리).
3. **타입** (`src/types/service.ts`): `sajuSections`/`shinjeomSections`(36-37) 및 `SajuSections`/`ShinjeomSections` 인터페이스(5-17) 제거.
4. **영속** (`reading-saver.ts`): `persistReadingSections`(142-180 영역) 제거. 본 insert(overall/topic/advice, saju route:185-193)·`persistDirectAnswer` 유지. shinjeom route:51-54의 섹션 UPDATE 호출 제거.
5. **UI**: saju/shinjeom 결과화면(세션 + `result/[id]`)에서 `ReadingSectionBlock` 렌더 제거. `hasSajuSections`/`hasShinjeomSections` 분기(saju result:62·102 등) 제거. overallReading은 `【】`로 스캔성 유지(선택: `ReadingText`가 【】를 소제목으로 스타일 — 별도 비목표로 두되 최소 렌더는 현행 유지). saju·신점 전용인 `ReadingSectionBlock` 컴포넌트는 미사용 → 컴포넌트·테스트 제거.
6. **i18n**: `saju.section.*`·`shinjeom.section.*` 키 3개 언어(ko/en/ja) 제거. `LANGUAGE_INSTRUCTIONS`(prompt-builder.ts:20-21)가 섹션 필드명을 언급하면 정리.
7. **max_tokens**: `computeSajuReadingMaxTokens`(saju route:27-34)·`SHINJEOM_TOKENS_FINAL`(shinjeom route:24) 상한 **유지**(요청 분량 감소로 headroom↑).

## 하위호환 · DB

- 마이그 024 컬럼(`saju_sections`/`shinjeom_sections`) **drop 안 함**. 신규 행은 공란, 구 행은 데이터 잔존하나 UI가 더 이상 읽지 않음 → 구·신 행 표시 일관, 데이터 손실 0, 신규 마이그 불필요.
- `db-abstraction.md`: 두 컬럼을 "deprecated · 미사용(섹션 스키마 폐지, 2026-07-07)"로 표기. `elements`(오행 jsonb)는 별개 컬럼이므로 무관.

## 검증 · 회귀

- **eval 하네스(`scripts/eval-reading.ts`) 갱신 (필수)**: 현재 `sajuSections`/`shinjeomSections` 4섹션 완결 검사 → **`overallReading`(비어있지 않음, 【】 포함)·`topicReading`·`advice`·`directAnswer`** 계약으로 재정의. 타로 계약(3-섹션 cardInterpretations)은 유지.
- **배포 후 실측**: eval 하네스 + ② 새 마커(`grep "[reading-parse-error]"`)로 사주·신점 truncation/missing_fields 기저율이 실제로 내려가는지 확인(현 실측 사주~21%·신점67% 대비). 감소폭은 사전 단정하지 않음.

## 테스트 동시 수정

- `src/__tests__/api/saju-reading.test.ts`·`shinjeom-message.test.ts`: 섹션 관련 mock·단언 제거, parseError 시 `logReadingParseError` 호출 단언 추가(기존 "parseError 시 save 미호출" 단언 saju:373/shinjeom:357/tarot:383 옆).
- `src/services/core/text-cleaner.test.ts`: `promoteNestedFields` 섹션 테스트 제거(해당 함수 제거 시).
- `src/test-helpers/mock-ai.ts`: 섹션 mock 필드 제거.
- `ReadingSectionBlock` 테스트 제거.
- `grep -rn "sajuSections\|shinjeomSections" src/`(감사 시점 33 파일)로 잔여 참조 전수 정리.
- `pnpm type-check && pnpm lint && pnpm test:coverage` 통과. sonar exclusions는 `sonar.sources=src`이므로 scripts/ 무관, src 컴포넌트 제거 시 exclusions에서도 제거.

## 리스크

- ①의 위험원이던 `overallReading` 재배선은 이 방향(섹션 제거·overall 유지)에선 **발생 안 함**. 순증 위험은 UI/i18n/테스트 정리 범위.
- 깊이 저하 오인 방지: "분량 축소가 아니라 중복 제거" 원칙(#471 정신) — overallReading이 이미 라벨 내용을 담으므로 사용자 체감 깊이 불변임을 배포 후 가독성 eval로 확인.
- 신뢰성 이득은 증분(defense-in-depth) — #480 위에 truncation 기저율만 인하. 기대치 과장 금지.

## 구현 순서 (권장)

1. ② 관측성 마커 + db-abstraction.md 정정 (작고 독립 — 먼저 배포해 ①의 효과 측정 기반 확보).
2. ① 스키마 중복 제거(프롬프트→파서→타입→영속→UI→i18n→테스트) + eval 하네스 갱신.
3. 배포 후 eval 하네스 + 마커로 기저율 실측.

②와 ①은 독립적이므로 별도 PR로 분리 가능(②→① 순).
