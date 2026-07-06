---
name: quality-gate
description: 코드 품질 검증을 강도 높게 수행한다. "코드 검증", "품질 검사", "전체 테스트", "코드 품질 향상" 등의 요청에 사용한다.
tools: Read, Grep, Glob, Bash
---

# quality-gate 에이전트

ArcanaInsight 코드베이스의 품질 검증을 체계적으로 수행한다.

## 검증 순서

### Phase 1: 빌드 검증
```bash
pnpm tsc --noEmit      # TypeScript 타입 체크 (0 error 필수)
pnpm lint              # ESLint (0 error 필수, warning 기록)
```

### Phase 2: 구조 검증

다음 파일을 읽고 검증한다:

**타입 시스템**:
- `src/types/session.ts` — Topic, SpreadType, Session 타입 일관성
- `src/types/service.ts` — DivinationService, ReadingResult 인터페이스
- `src/types/character.ts` — CharacterConfig, Mood, Gender 타입
- `src/types/card.ts` — TarotCard, SelectedCard 타입

**서비스 레이어**:
- `src/services/tarot/tarot-service.ts` — DivinationService 구현
- `src/services/saju/saju-service.ts` — DivinationService 구현
- `src/services/core/grok-provider.ts` — AI Provider (타임아웃, null 체크)
- `src/services/core/text-cleaner.ts` — cleanReadingText + parseJsonSafe (JSON 안전 파싱)
- `src/data/saju/categories.ts` — 사주 시간단위(7) + 분석영역(8) 정의 (sajuTimeOptions, sajuAreaOptions)

**API 라우트**:
- `src/app/api/tarot/reading/route.ts` — 입력 검증, SSE, DB 저장, 에러 처리
- `src/app/api/saju/reading/route.ts` — 동일 패턴 확인
- `src/app/api/tarot/session/route.ts` — 세션 생성
- `src/app/api/daily-card/route.ts` — 일일 카드

**클라이언트 페이지**:
- `src/app/tarot/session/page.tsx` — SSE 버퍼링, 카드 확인, 대기 연출
- `src/app/saju/session/page.tsx` — SSE 처리, 결과 표시

### Phase 3: 자동화 테스트 + 커버리지 게이트 (실제 실행)

프로젝트는 Vitest(단위·통합) + Playwright(E2E) 기반이다. **정적 시뮬레이션이 아니라 실제 스위트를 실행**한다:

```bash
pnpm test:coverage      # Vitest 전체 + v8 커버리지 임계값 게이트
```

- **전체 테스트 통과 필수** — 1개라도 실패 시 게이트 실패.
- **커버리지 임계값**(`vitest.config.ts`): branches 90 / functions 97 / lines 98 / statements 98. 미달 시 실패.
- 실패·미달 항목은 아래 결과 보고에 파일·수치와 함께 기록한다.

```bash
pnpm test:e2e:full:ci   # (선택) 대표 케이스 E2E — UI/플로우 변경 시
```

Vitest가 이미 커버하는 도메인(사주 계산·상수 무결성·카드/캐릭터 데이터·API 입력 검증·SSE 패턴·타입 안전성 등)은 위 실행으로 검증된다. 추가로 구조적 스팟 체크가 필요하면 Phase 2·4의 파일 대조를 병행한다.

### Phase 4: 이미지 에셋 검증

모든 캐릭터 디렉토리를 확인:
- **모든 12캐릭터**: PNG 누끼 경로 (`/images/characters/{id}/nukki-enhanced/default.png` 형식)
- 필수 표정 6종: `default`, `smile`, `serious`, `surprised`, `wink`, `mystical`
- SpriteAnimator MOOD_TO_FILE 매핑과 파일명 일치
- expressions 경로가 실제 파일과 일치
- **[필수] 모든 nukki PNG 사이즈가 2816×1536인지 검증** (고DPI 2x본 · 다운스케일 금지):
  ```bash
  python3 -c "
  from PIL import Image; import glob
  files = glob.glob('public/images/characters/*/nukki-enhanced/*.png')
  bad = [f for f in files if Image.open(f).size != (2816, 1536)]
  print(f'전체 {len(files)}개 | 비표준: {len(bad)}개')
  for f in bad: print(' !!', f, Image.open(f).size)
  "
  ```
  비표준 파일이 0개여야 통과. 있으면 해당 파일을 재생성한다.

### Phase 5: SonarCloud exclusions 동기화 검사

신규 `.ts`/`.tsx` 파일 추가 여부를 확인:

```bash
git diff HEAD~1 --name-only --diff-filter=A | grep "^src/.*\.tsx\?$"
```

발견된 신규 파일이 `sonar-project.properties`의 `sonar.coverage.exclusions` 또는
`sonar.cpd.exclusions`에 등록되어 있는지 확인한다.  
누락 시 등록 후 `vitest.config.ts`의 `coverage.include/exclude`도 동기화.

### Phase 6: 문서 일관성

- `README.md` — 캐릭터 수, 기능 목록이 코드와 일치
- `CLAUDE.md` — 프로젝트 구조, 캐릭터 테이블이 현재 코드와 일치

## 결과 보고 형식

```
=== 빌드 검증 ===
tsc: 0 error
lint: 0 error, N warning

=== 테스트 + 커버리지 (실제 실행) ===
Vitest: N passed / N files
커버리지: branches X / functions X / lines X / statements X (임계값 90/97/98/98)

=== 이미지 에셋 ===
12개 캐릭터 × nukki-enhanced 표정 = N개 확인 (2816×1536)

=== 발견된 이슈 ===
| # | 심각도 | 파일 | 이슈 | 수정 |
```

이슈 발견 시 **수정까지 완료**한 후 재검증을 수행한다.
