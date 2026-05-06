# i18n 정합성 핫픽스 계획 (PR-1·PR-2 머지 후 발견)

## Context

8 병렬 에이전트 감사로 PR #223 (Foundation) + PR #225 (translations·UI) 머지 후 **17건의 정합성 결함** 식별. 마스터 플랜 PR-3 진입 전에 코드 정합성·문서 정합성을 분리해 두 PR로 처리한다.

## 8 라운드 발견사항 통합

### R1A (i18n 자체 정합성)
- ✅ SharedKeys ↔ ko 사전 100% 동기화 (54/54 키)
- ✅ en 사전 54/54 (100%) — 임시 영어 번역 완료, 외부 번역가 발주 대기
- ✅ ja 사전 11/54 (20%) — common·locale만 1차, PR-5에서 채움
- ✅ LOCALE_COOKIE 일관성 — 8개 참조처 모두 일치
- ✅ middleware 두 경로(supabase + postgres) 쿠키·헤더·max-age 일치
- ⚠️ LanguageSwitcher · LocaleConfirmModal에 `setLocale + /api/locale POST` 패턴 중복 (경미)
- ❌ **R1A 결함 보고 오인**: shared/keys.ts는 sonar exclusions에 미포함이라 이미 정상 측정 (lcov.info에 `SF:` 항목 확인). 무시.

### R1B (API/DB locale 연결) — **P0 데이터 정합성 결함**
- 🔴 sessions INSERT 3개 라우트 locale 미동봉:
  - `src/app/api/tarot/session/route.ts:33`
  - `src/app/api/saju/session/route.ts:23`
  - `src/app/api/shinjeom/session/route.ts:18`
- 🔴 readings INSERT 3개 함수 locale 미동봉 (`src/lib/db/reading-saver.ts`):
  - `saveTarotReading` 라인 35-40
  - `saveSajuReading` 라인 65
  - `saveShinjeomFinalReading` 라인 82-87
- 🔴 daily_cards 테이블 locale 컬럼 자체 부재 (016 의도적 누락 vs 결함 여부 결정 필요)
- 🟡 character-context.ts locale 필터 미사용 (인덱스만 있음 — PR-4 예정 영역)
- 🟡 서비스 계층(prompt-builder·saju-service 등) locale 인수 미수신 (PR-4)
- 🟢 AuthUser 타입 locale 부재 — 설계상 허용 (cookie SSOT, profiles 보조)
- 🟡 Zod 7 스키마 locale 필드 부재 — PR-4 일괄

**영향**: 영어/일본어 사용자가 신규 세션 만들어도 모두 locale='ko'로 기록. 향후 character-context cross-locale 오염 위험.

### R1C (UI 한글 잔존)
- 페이지 한글 401줄 / 컴포넌트 219줄 / 데이터 214줄 = 총 **834줄**
- TOP 3 적용 부담: tarot/session 76줄, privacy 62줄, mypage 54줄
- 미사용 i18n 키 19개 (home.* 8 + settings.* 11) — PR-2가 사전만 만들고 페이지 코드는 미적용
- PR-3 예상 범위: 약 315줄
- **분류**: 의도적 후속 PR (PR-3·5·6에서 처리 예정), 핫픽스 대상 아님

### R1D (테스트·CI·Sonar 정합) — **P0 측정 신뢰도 결함**
- 🔴 sonar-project.properties ↔ vitest.config.ts 표류:
  - `src/lib/validation/api-schemas.ts`: vitest include / sonar `validation/**` 전체 exclude → SonarCloud 분모 제외, vitest 측정. **불일치**
  - `src/lib/db/index.ts`: vitest include / sonar exclude
- 🔴 `e2e/responsive.spec.ts:12` `/타로 상담/` regex 깨짐 (Header에서 `타로 상담` → `타로` 변경)
- 🔴 `e2e/responsive.spec.ts:30` `/홈|타로|사주|신점|MY/` regex에서 `MY` 미매칭 (`마이페이지`로 변경)
- 🟡 i18n:check 스크립트 부재 (PR-6 예정, 현재 미가동)
- 🟢 vitest coverage.include 22→27 모두 파일 존재
- 🟢 i18n 단위 테스트 30개 모두 vitest 수집

### R2A (CLAUDE.md drift) — 점수 **72/100**
- L34 테스트 수: 714 → 744
- L68 마이그레이션: "001 + 003~015 (14개)" → "001 + 003~016 (15개)"
- 프로젝트 구조 L39-77: `src/i18n/` 디렉토리·`useLocaleStore`·`api/locale`·`Toast`·`LocaleConfirmModal`·`LanguageSwitcher` 누락
- 기술 스택 표: i18n 항목 추가 필요
- 핵심 아키텍처 섹션: i18n 다국어 시스템 단락 신규 필요
- 필수 주의사항: i18n SSR 규칙(`setTimeout` 패턴) + 키 정의 우선 + E2E `data-testid` 필수
- 업무 유형별 가이드: "다국어·번역" 행 추가
- 캐릭터 시스템 표: 영문 페르소나 PR-4 예정 주석

### R2B (docs/architecture) — 등급 **C**
- system-overview.md: i18n 흐름·다이어그램 부재 → 즉시 추가
- ai-infrastructure.md: parseJsonSafe 일본어 안전성 단위 테스트 명시 부재
- db-abstraction.md: 016 마이그레이션·5테이블·인덱스 명시 부재 → 즉시 추가
- auth-abstraction.md: AuthUser locale 미포함 PR-4 명시 → PR-4 후
- data-model.md: 카드 name 객체화(PR-3) + 캐릭터 페르소나(PR-4) 예정 명시
- 신규 작성: `docs/architecture/i18n.md` (필수)

### R2C (docs/conventions·workflow)
- coding-style.md: t() 호출 패턴·useT 가이드 부재
- layout-rules.md: LanguageSwitcher 데스크탑·모바일 분리 규칙 부재
- e2e-testing.md: data-testid 우선 정책 부재
- code-change-process.md: i18n 체크리스트 부재
- ci-cd.md: sonar↔vitest 정합 검증 단계 부재
- unit-testing.md: i18n 테스트 패턴(stubGlobal·NextRequest mock) 부재 — PR-6 후
- task-playbooks.md: i18n 작업 진입 파일 부재
- scripts.md: i18n:check 등록 — PR-6 후
- 신설 강권: `docs/conventions/i18n-style.md` (즉시)

### R2D (docs/operations·plan)
- known-issues.md 추가 5건:
  1. AuthUser 타입 locale 미포함 (PR-4 대기)
  2. daily_cards 테이블 locale 컬럼 미지 (016 누락 vs 의도)
  3. PR-2 사전 정의 vs 페이지 적용 갭 (19 미사용 키)
  4. translations 15 파일 SonarCloud 중복 위험 (현재 4 파일이지만 PR-3·5에서 누적)
  5. 외부 번역가 발주 시점 미결정
- env-variables.md: postgres 모드 + i18n 컬럼 호환 메모
- deployment.md: 016 마이그레이션 적용 절차·롤백
- monitoring.md: locale별 토큰 비용 모니터링 (PR-6 후)
- operation-guide.md: 쿠키 차단 환경 트러블슈팅
- 마스터 플랜 갱신: PR-1·PR-2 실제 작업량 vs 추정 차이 / PR-4 시간 분리 (코드 vs 외부 번역 검수)
- 활성 마스터 플랜 archive 이관: PR-6 머지 후

## 정합성 수정 계획 (2 PR 분할)

### PR-A: 코드 정합성 핫픽스 (i18n wiring + 테스트·Sonar 표류 정리)

**위험도**: P0 / **시간**: 4~5h / **의존성**: 없음 (PR #225 머지 위에)

#### 작업 1: locale wiring (R1B 즉시 수정 영역)
- `src/app/api/tarot/session/route.ts:33` — `db.insert("sessions", { ..., locale })` 추가
- `src/app/api/saju/session/route.ts:23` — 동일
- `src/app/api/shinjeom/session/route.ts:18` — 동일
- `src/lib/db/reading-saver.ts` 3개 함수 — readings INSERT에 locale 동봉
- locale 결정 패턴: 우선순위 = 요청 헤더 `x-locale` (middleware 부착) → 쿠키 → DEFAULT('ko')
- 헬퍼 추가: `src/i18n/server-locale.ts` — server-side locale 추출 함수 (`getRequestLocale(req)`)

#### 작업 2: daily_cards 마이그레이션 결정
- **결정 필요**: daily_cards에 locale 컬럼 추가 여부
  - 옵션 A: 추가 → 사용자별·locale별 카드 표시 가능 (PR-3·PR-5에서 활용)
  - 옵션 B: 유지 → daily_cards는 캐릭터별·날짜별 단일 사전(공유), locale은 표시 시점 결정
- 권장: **옵션 B** (daily_cards 키는 character_id+date 유니크, locale 분리 시 4×용량 폭증)
- 단, 문서에 "daily_cards locale 미포함 = 의도적 결정" 명시

#### 작업 3: Sonar↔vitest 표류 정리
- `sonar-project.properties` 검토:
  - `src/lib/validation/**` 통째 exclude → `src/lib/validation/auth/**` 같이 좁히거나 vitest include와 정합
  - `src/lib/db/index.ts` 동일 검토
- 또는 vitest include에서 빼고 sonar exclude 유지 (단순화)
- 권장: **vitest include 유지 + sonar.coverage.exclusions에서 명시 제외 빼기** (실측치를 sonar에 반영)

#### 작업 4: E2E 셀렉터 갱신
- `e2e/responsive.spec.ts:12` — `/타로 상담/` → `data-testid` 또는 `header.nav.tarot` t() 결과 ko 값 `타로`
- `e2e/responsive.spec.ts:30` — regex 갱신: `/홈|타로|사주|신점|마이페이지/`
- 또는 더 안정적인 `data-testid="mobile-nav-*"` 활용

#### 작업 5: 단위 테스트 보강
- `src/__tests__/api/locale-wiring.test.ts` 신규: 3개 session route + 3개 reading 저장 함수가 locale 파라미터 전달하는지 검증 (mock-db로 INSERT 인수 캡처)
- `src/i18n/__tests__/server-locale.test.ts` 신규: getRequestLocale 우선순위 검증

#### 검증
- type-check + lint + test (744 → ~755개 예상)
- E2E `responsive.spec.ts` 로컬 실행 (3 디바이스)
- SonarCloud 재분석 후 Quality Gate Pass 확인

### PR-B: 문서 정합성 (CLAUDE.md + architecture + conventions + known-issues + 마스터 플랜)

**위험도**: P1 / **시간**: 5~6h / **의존성**: PR-A 머지 (코드 변경 반영 후 문서 갱신)

#### 작업 1: CLAUDE.md 8개 즉시 갱신 (R2A)
- L34 테스트 수: 744
- L68 마이그레이션: 001 + 003~016 (15개)
- 프로젝트 구조: src/i18n/·common/·layout/·api/locale 추가
- 기술 스택 표: i18n 항목 행 추가
- 핵심 아키텍처: i18n 다국어 시스템 단락 신규
- 필수 주의사항 카테고리: i18n 신규 섹션 (SSR setTimeout·키 정의 우선·data-testid 필수)
- 업무 유형별 가이드: "다국어·번역" 행
- 캐릭터 시스템 표 주석: PR-4 영문 페르소나 예정

#### 작업 2: docs/architecture 5개 갱신 + i18n.md 신설
- `system-overview.md`: "다국어(i18n) 인프라" 섹션 신규 (middleware → cookie → SSR → LocaleProvider → useT 흐름)
- `ai-infrastructure.md`: parseJsonSafe 일본어·중영일 혼합 안전성 + PR-4 prompt-builder locale 분기 예정
- `db-abstraction.md`: 016 마이그레이션·5테이블·idx_sessions_user_locale 인덱스 + daily_cards locale 미포함 의도 명시
- `auth-abstraction.md`: AuthUser locale 필드 PR-4 예정 명시
- `data-model.md`: 카드 name 객체화(PR-3) + 캐릭터 페르소나(PR-4) 예정 주석
- **신규**: `docs/architecture/i18n.md` (i18n 전체 인프라 문서, 500~800자, PR-3~6 진행 시 갱신)

#### 작업 3: docs/conventions 갱신 + i18n-style.md 신설
- `coding-style.md`: t() 호출 패턴 + useT 훅 가이드 + 클라이언트 vs 서버 사이드 호출 (translate vs useT) 차이
- `layout-rules.md`: LanguageSwitcher 데스크탑·모바일 분리 (PR #211 outside-click 교훈) + Toast 위치 규칙
- `e2e-testing.md`: data-testid 우선 정책 + locale 매트릭스 PR-6 예정 명시
- `code-change-process.md`: 다국어 변경 시 추가 검증 단계 (UI 텍스트 변경 → ko/en/ja 동시 검토 + e2e 셀렉터 동시 갱신)
- `ci-cd.md`: sonar↔vitest 정합 검증 단계
- **신규**: `docs/conventions/i18n-style.md` (t·useT·키 네이밍·namespace 규칙·번역 우선순위 통합)

#### 작업 4: known-issues 5건 추가 + 운영 가이드
- `docs/operations/known-issues.md`:
  1. AuthUser locale 미포함 (PR-4 대기)
  2. daily_cards locale 의도적 미추가 (단일 사전 정책)
  3. PR-2 미사용 키 19개 (PR-3 페이지 적용 시 사용)
  4. translations SonarCloud 중복도 모니터링 (현재 4 파일, PR-3·5에서 누적)
  5. 외부 번역가 발주 시점 미결정 (현재 임시 영어 사용 중)
- `docs/operations/operation-guide.md`: 쿠키 차단 환경 locale 변경 미적용 트러블슈팅
- `docs/operations/deployment.md`: 016 마이그레이션 적용 절차·롤백 SQL
- `docs/operations/env-variables.md`: postgres 모드 + i18n 컬럼 호환 메모

#### 작업 5: 마스터 플랜 갱신
- `~/.claude/plans/spicy-riding-token.md`:
  - PR-1·PR-2 실제 작업량 갱신 (Round 5 추정 vs 실제)
  - PR-4 시간 분리: 코드 ~15h + 외부 번역 검수 별도 2주
  - 신규 발견사항 반영: daily_cards 결정·sonar 표류·E2E 셀렉터 위험 등
  - "추가 의사결정 필요 항목" 결정 상태 업데이트
- archive 이관 시점: PR-6 머지 후 (현재 활성 유지)

#### 검증
- `pnpm check:doc-links` 통과
- `pnpm check:env-docs` 통과
- 추가 multi-agent 검증 (정합성 등급 C → A 상승 확인)

## 의존성 그래프

```
PR-A (코드 정합성, 4~5h)
  └─→ PR-B (문서 정합성, 5~6h, PR-A 변경 반영 필요)
        └─→ [외부 번역 발주] (병렬 진행 가능)
              └─→ PR-3 (도메인 영문화, 마스터 플랜)
```

## 우선순위·시간 요약

| PR | 영역 | 위험 | 시간 | 결함 수 |
|---|---|---|---|---|
| **PR-A** | 코드 정합성 | P0 | 4~5h | 7건 (locale wiring 6 + sonar 1 + E2E 1) |
| **PR-B** | 문서 정합성 | P1 | 5~6h | 17건 (CLAUDE 8 + arch 5 + conv 5 + ops 5 + plan 4) |

**총 9~11h** 추가 작업으로 정합성 등급 C → A.

## 의도적 후속 PR 영역 (현 핫픽스 제외)

- 페이지 한글 잔존 834줄 → PR-3 (315줄) + PR-4·5·6 분할
- character-context locale 필터 → PR-4
- 서비스 계층 locale 인수 → PR-4
- AuthUser 타입 locale → PR-4
- Zod 스키마 locale → PR-4
- i18n:check 스크립트·SEO hreflang → PR-6
- 일본어 전체 사전 → PR-5
- archive 이관 → PR-6 머지 후

## 검증 게이트 (PR-A·PR-B 공통)

```bash
pnpm type-check && pnpm lint && pnpm test
pnpm exec tsx scripts/check-doc-links.ts
pnpm exec tsx scripts/check-env-docs.ts
# PR-A 추가
curl -s -u "$SONARQUBE_TOKEN:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=xzawed_ArcanaInsight" | grep status
```

## 추가 의사결정 필요 항목

1. **daily_cards 결정**: locale 컬럼 추가 vs 의도적 미포함 (옵션 B 권장)
2. **PR 처리 방식**: PR-A·PR-B 분리 vs 단일 PR 누적 — 이전 패턴(누적) 권장
3. **외부 번역가 발주 시점**: PR-A·PR-B 머지 후 vs PR-3 진입 시 — PR-3 진입과 함께 발주가 자연스러움

---

**예상 완료**: PR-A·PR-B 합쳐 9~11h, 1.5 영업일. PR-3 진입 전 정합성 정리 완료 가능.
