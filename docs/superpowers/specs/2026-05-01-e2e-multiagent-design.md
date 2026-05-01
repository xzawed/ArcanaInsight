# 가상 실사용자 멀티 에이전트 E2E 전수 검증 설계

**날짜**: 2026-05-01  
**목표**: 타로·사주·신점 전체 경우의 수(~252 조합)를 가상 실사용자가 실제 UI를 동작하며 검증한다.  
**범위**: 플로우 완주 + UI 구조 + AI 응답 콘텐츠 품질 (C 레벨)  
**AI 호출**: 실제 Grok/Claude API (Mock 없음)  
**실행 모드**: CI 20개(10분 이내) / Full run ~252개(병렬 6 워커, 무제한)

---

## 아키텍처

```
[orchestrator.ts]
  ├── 테스트 매트릭스 생성 (~252 조합)
  ├── CI 모드: ci-subset.ts에서 20개 선택
  ├── Full 모드: 6개 청크로 분할
  ├── pnpm --parallel로 worker.ts × 6 동시 실행
  └── 결과 집계 → docs/e2e-reports/{날짜}-full-run.md

[worker.ts × 6 (각자 독립 Node.js 프로세스)]
  ├── Playwright Chromium (headless, 자체 브라우저 인스턴스)
  ├── 타로/사주/신점 플로우 실행 헬퍼 호출
  ├── SSE 스트리밍 완료 대기 (최대 120초)
  ├── structure-validator: JSON 미노출·URL·텍스트 길이
  ├── content-validator: Claude Haiku API → JSON 판정
  └── results/worker-{N}.json 저장

[reporter.ts]
  └── 전체 JSON 집계 → Markdown 리포트 생성
```

**핵심 판단**: Playwright MCP는 단일 브라우저 공유로 병렬 불가. 워커마다 독립 Chromium 프로세스 + Claude API 직접 호출 방식 채택.

---

## 테스트 매트릭스

### 타로 — 84 조합

12 캐릭터 × 7 주제 (주제 → 스프레드 자동 결정)

| 주제 | 자동 스프레드 | 카드 수 |
|------|-------------|---------|
| love | three-card | 3장 |
| love-single | three-card | 3장 |
| love-couple | relationship | 7장 |
| finance | horseshoe | 7장 |
| career | horseshoe | 7장 |
| health | one-card | 1장 |
| general | celtic-cross | 10장 |

고정 입력값: 이름 `"테스터"`, 생년월일 `"1995-06-15"`, 성별 `"female"`

### 사주 — 96 조합

12 캐릭터 × 8 주제

| 주제 | 시간단위 |
|------|---------|
| saju-general | 올해 |
| saju-love-single | 올해 |
| saju-love-couple | 올해 |
| saju-career | 이번 달 |
| saju-health | 올해 |
| saju-personality | 올해 |
| saju-compatibility | 올해 |
| saju-auspicious-date | 올해 |

고정 입력값: 생년월일 `"1990-03-20"`, 출생시 `"자시(23:00~01:00)"`, 성별 `"male"`

### 신점 — 72 조합

12 캐릭터 × 6 주제, 3턴 대화 후 결과 요청

| 주제 | 질문 템플릿 |
|------|-----------|
| shinjeom-general | "올해 전반적인 운세가 궁금합니다" |
| shinjeom-love | "연애운이 어떤지 봐주세요" |
| shinjeom-wealth | "재물운을 알고 싶어요" |
| shinjeom-career | "직장운을 봐주세요" |
| shinjeom-health | "건강운이 궁금합니다" |
| shinjeom-auspicious | "좋은 날을 잡아주세요" |

**총합: 252 조합**

---

## CI 20개 대표 케이스

기존 GitHub Actions `pnpm test:e2e` 파이프라인에 `e2e/smart-ci.spec.ts` 추가.

| 분류 | 케이스 | 수 |
|------|--------|---|
| 타로 핵심 | arcana×love, cairn×general, hoshi×finance, ren×health | 4 |
| 사주 핵심 | miko×saju-general, zero×saju-love-single, luna×saju-career, haru×saju-personality | 4 |
| 신점 핵심 | seonhwa×shinjeom-general, lix×shinjeom-love, rei×shinjeom-wealth, ethan×shinjeom-career | 4 |
| 에러 시나리오 | rate-limit(타로), network-timeout(사주), invalid-input(신점), SSE-abort(신점) | 4 |
| 크로스 플랫폼 | Mobile Android(타로×arcana), Mobile Android(사주×miko), iOS(신점×luna), iOS(타로×zero) | 4 |

---

## 콘텐츠 품질 검증 (C 레벨)

### 공통 체크 (전 서비스)

| 체크 키 | 판정 기준 |
|---------|---------|
| `no_json_artifacts` | `{"`, `"}`, `"key":` 패턴 UI 미노출 |
| `minimum_length` | 응답 텍스트 200자 이상 |
| `no_error_text` | "오류", "에러", "undefined", "null" 미포함 |
| `result_page_reached` | `/result/[id]` URL 도달 확인 |

### 타로 특화

| 체크 키 | 판정 기준 |
|---------|---------|
| `card_name_mentioned` | 선택 카드 한국어 이름 언급 |
| `position_label_present` | 스프레드 위치 레이블 언급 |
| `topic_keyword_match` | 주제 키워드 포함 (love→연애/사랑, finance→재물/금전 등) |
| `no_cross_service` | 사주 전용어(천간/지지/오행) 미포함 |

### 사주 특화

| 체크 키 | 판정 기준 |
|---------|---------|
| `saju_terminology` | 사주/오행/천간/지지/운세 중 1개 이상 |
| `topic_alignment` | 선택 주제와 내용 일치 |
| `time_period_mentioned` | 선택 시간단위 언급 (올해/이번 달) |
| `no_cross_service` | 타로 전용어(카드/스프레드) 미포함 |

### 신점 특화

| 체크 키 | 판정 기준 |
|---------|---------|
| `question_responded` | 입력 질문 주제에 대한 답변 포함 |
| `shinjeom_vocabulary` | 신점/운/기운/점 중 1개 이상 |
| `multiturn_consistency` | 최종 결과가 이전 대화 맥락 이어받음 |
| `definitive_guidance` | 방향성·조언 문장 포함 |

### 판정 구조

```typescript
interface ValidationResult {
  passed: boolean;       // 5/5 또는 4/5 이상 = true
  score: number;         // 0–100
  checks: Record<string, boolean>;
  reason: string;
}
```

| 통과 체크 수 | 판정 |
|------------|------|
| 5/5 | ✅ PASS |
| 4/5 | ⚠️ WARNING (기록, 실패 처리 안 함) |
| 3/5 이하 | ❌ FAIL |

### content-validator 프롬프트 패턴

```
당신은 운세 서비스 QA 검증 에이전트입니다.
서비스: {service} / 캐릭터: {character} / 주제: {topic}
선택 카드(타로만): {cards}

아래 응답 텍스트를 평가하고 JSON으로 반환하세요.
[체크 항목 목록]

응답 텍스트:
{responseText}
```

모델: `claude-haiku-4-5-20251001` (속도·비용 최적화)

---

## 파일 구조

```
scripts/
└── e2e-full/
    ├── orchestrator.ts
    ├── worker.ts
    ├── reporter.ts
    ├── matrix/
    │   ├── tarot.ts
    │   ├── saju.ts
    │   ├── shinjeom.ts
    │   └── ci-subset.ts
    ├── flows/
    │   ├── tarot-flow.ts
    │   ├── saju-flow.ts
    │   └── shinjeom-flow.ts
    └── validators/
        ├── content-validator.ts
        └── structure-validator.ts

e2e/
└── smart-ci.spec.ts             # CI 20개 — 기존 Playwright runner 사용

docs/e2e-reports/                # .gitignore에 추가 (결과 파일 제외)
    └── {날짜}-full-run.md
```

---

## 실행 방법

```bash
# CI 모드 (기존 GitHub Actions 파이프라인에서 자동 실행)
pnpm test:e2e                    # 기존 19개 + smart-ci.spec.ts 20개

# Full run — 릴리즈 전 수동 실행
pnpm test:e2e:full               # 252개, 워커 6개 병렬, 결과 → docs/e2e-reports/

# 서비스별 개별 실행
pnpm test:e2e:full --service=tarot
pnpm test:e2e:full --service=saju
pnpm test:e2e:full --service=shinjeom

# 특정 캐릭터만
pnpm test:e2e:full --character=arcana
```

---

## 의존성

추가 패키지 없음. 기존 의존성만 사용:
- `playwright` (이미 설치)
- `@anthropic-ai/sdk` (이미 설치)
- `tsx` (이미 설치)

---

## 성공 기준

| 항목 | 기준 |
|------|------|
| CI 20개 | 전체 PASS, 10분 이내 완료 |
| Full run PASS율 | 95% 이상 (238/252 이상) |
| Full run 실행 시간 | 6 워커 기준 3시간 이내 |
| 리포트 생성 | `docs/e2e-reports/{날짜}-full-run.md` 자동 생성 |
| WARNING 처리 | 기록만, 빌드 실패 없음 |
| FAIL 시 | 리포트에 상세 이유·재현 커맨드 포함 |

---

## 제약 및 주의사항

- **실제 AI 호출**: Grok API Key + Anthropic API Key 환경변수 필요 (`GROK_API_KEY`, `ANTHROPIC_API_KEY`)
- **비용**: Full run 1회당 AI 호출 약 252 × (서비스 응답 + Haiku 검증) — 사전 비용 추정 필요
- **비결정성**: AI 응답이 매번 달라지므로 콘텐츠 체크는 규칙 기반이 아닌 LLM 판단 사용
- **SSE 타임아웃**: celtic-cross(10장) 등 대형 스프레드는 응답 시간 90~120초 허용
- **결과 파일**: `docs/e2e-reports/`는 `.gitignore`에 추가 (대용량 JSON 커밋 방지)
- **로컬 서버 필수**: Full run 전 `pnpm dev` 또는 `pnpm build && pnpm start` 실행 필요
