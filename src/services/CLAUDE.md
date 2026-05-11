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
│   ├── prompt-builder.ts      # buildSystemPrompt / buildReadingPrompt / buildUserInfoPrompt
│   └── text-cleaner.ts        # cleanReadingText / parseJsonSafe / extractFallbackText
├── tarot/
│   ├── tarot-service.ts       # DivinationService 구현체
│   ├── deck-manager.ts        # 카드 덱 셔플·뽑기
│   └── spread-resolver.ts     # Topic → Spread 매핑
├── saju/
│   ├── saju-service.ts        # DivinationService 구현체
│   └── saju-calculator.ts     # 사주 날짜 계산
└── shinjeom/
    └── shinjeom-service.ts    # DivinationService 구현체
```

## 핵심 패턴

### FallbackProvider 사용법

모든 API 라우트는 `FallbackProvider`를 직접 인스턴스화한다. Grok 장애 시 Claude로 자동 전환되며 호출 측은 분기를 신경 쓰지 않아도 된다.

```ts
const provider = new FallbackProvider();
// generateReading / generateReadingStream — 동일 인터페이스
const result = await provider.generateReading(systemPrompt, userPrompt, maxTokens);
```

### DivinationService 인터페이스

새 운세 서비스 추가 시 `divination-scaffold` 에이전트를 사용한다. 구현 필수 메서드:

```ts
interface DivinationService {
  id: string;
  name: string;
  getCharacter(): CharacterConfig;
  startSession(topic: Topic): Omit<Session, "id" | "createdAt">;
  getSystemPrompt(characterId?: string, locale?: string): string;
  getReadingPrompt(context: SessionContext): string;
  parseResult(aiResponse: string): ReadingResult;
}
```

### max_tokens 정책 (타로)

카드 수 비례 동적 산정 — `src/app/api/tarot/reading/route.ts`의 `computeReadingMaxTokens()` 함수 기준. 신규 스프레드 추가 시 이 함수에 케이스를 추가한다.

## 테스트 위치

`core/`의 단위 테스트는 각 파일 옆에 `*.test.ts`로 배치. API 통합 테스트는 `src/__tests__/api/`에 배치.

CircuitBreaker 테스트 시 `__resetFallbackCircuitForTests()`로 초기화 필수 — 테스트 간 상태 누출 방지.

## 주의사항

- `FallbackProvider` 인스턴스를 모듈 레벨(파일 상단)에 싱글턴으로 생성한다. 요청마다 `new`하면 CircuitBreaker 쿨다운 상태가 유실된다.
- `core/__tests__/` 디렉토리에 통합 테스트용 파일이 별도 존재한다.
- Grok 쿨다운 값은 환경변수 `AI_FALLBACK_COOLDOWN_MS` / `AI_AUTH_COOLDOWN_MS`로 제어한다.
