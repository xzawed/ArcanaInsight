# src/services/ 가이드

AI 리딩 로직의 핵심. `core/`는 공통 인프라, `tarot/saju/shinjeom/`은 서비스별 구현.

## 구조

```
services/
├── core/
│   ├── fallback-provider.ts   # Grok 우선 → Claude fallback, CircuitBreaker 관리
│   ├── circuit-breaker.ts     # 쿨다운 상태 globalThis 공유 (서버리스 warm 인스턴스 대응)
│   ├── grok-provider.ts       # Grok API 호출, RateLimitError / AuthError 정의
│   ├── claude-provider.ts     # Claude API 호출 (fallback 전용)
│   ├── ai-provider.ts         # AIProvider 공통 인터페이스 타입 정의
│   ├── http-utils.ts          # withAbortTimeout / readSseLines — Grok·Claude 공용 SSE reader
│   ├── prompt-builder.ts      # buildCharacterHeader / buildSystemPrompt / buildReadingPrompt / buildUserInfoPrompt / buildFreeQuestionPrompt / buildDirectAnswerContract(질문 직답 answer-first 계약) / buildReadabilityContract(쉬운 말 계약, 3서비스 공통) / buildCharacterMemoryPrompt / getLanguageFooter
│   ├── reading-generator.ts   # streamReadingWithParseRetry — 1차 스트리밍 → parseError 시 1회 non-stream 재생성 (3 리딩 라우트 공통)
│   └── text-cleaner.ts        # cleanReadingText / parseJsonSafe(트레일링 콤마 내성) / extractFallbackText
├── tarot/
│   ├── tarot-service.ts       # DivinationService 구현체
│   ├── deck-manager.ts        # 카드 덱 셔플·뽑기
│   └── spread-resolver.ts     # Topic → Spread 매핑
├── saju/
│   ├── saju-service.ts        # DivinationService 구현체
│   ├── saju-calculator.ts     # 사주 날짜 계산
│   └── saju-types.ts          # 사주 전용 타입 정의
└── shinjeom/
    └── shinjeom-service.ts    # DivinationService 구현체
```

## 핵심 패턴

### FallbackProvider 사용법

모든 API 라우트는 `FallbackProvider`를 직접 인스턴스화한다. Grok 장애 시 Claude로 자동 전환되며 호출 측은 분기를 신경 쓰지 않아도 된다. 모듈 레벨 싱글턴 필수·`hasYielded` 분기 등 사용 규칙은 [`.claude/rules/services.md`](../../.claude/rules/services.md) 참조.

```ts
const provider = new FallbackProvider();
// generateReading / generateReadingStream — 동일 인터페이스
const result = await provider.generateReading(systemPrompt, userPrompt, maxTokens);
```

### DivinationService 인터페이스

새 운세 서비스 추가 시 `divination-scaffold` 에이전트를 사용한다. 구현 필수 메서드 체크리스트(인터페이스 시그니처·parseResult 필드 계약)는 [`.claude/rules/services.md`](../../.claude/rules/services.md) 참조.

### max_tokens 정책

> 아래 함수·상수는 `services/`가 아니라 **각 API 라우트**(`computeReadingMaxTokens`는 `app/api/tarot/reading/route.ts`, `computeSajuReadingMaxTokens`는 `app/api/saju/reading/route.ts`, `SHINJEOM_TOKENS_*`는 `app/api/shinjeom/message/route.ts`)에 위치한다.

타로/사주/신점별 수치·cap은 [`.claude/rules/services.md`](../../.claude/rules/services.md) 참조. 상세: `docs/architecture/ai-infrastructure.md`.

## 테스트 위치

`core/`의 단위 테스트는 각 파일 옆에 `*.test.ts`로 배치. API 통합 테스트는 `src/__tests__/api/`에 배치.

CircuitBreaker 테스트 시 `__resetFallbackCircuitForTests()`로 초기화 필수 — 테스트 간 상태 누출 방지.

## 주의사항

- `core/__tests__/` 디렉토리에 통합 테스트용 파일이 별도 존재한다.
- Grok 쿨다운 값은 환경변수 `AI_FALLBACK_COOLDOWN_MS` / `AI_AUTH_COOLDOWN_MS`로 제어한다.
