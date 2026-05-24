---
paths:
  - "src/services/**"
---

# Services 레이어 규칙

## DivinationService 구현 필수 체크리스트

새 서비스 구현 시 반드시 확인:

```typescript
interface DivinationService {
  id: string
  name: string
  getCharacter(): CharacterConfig          // getCharacterById(id) 사용
  startSession(topic: Topic): ...          // Topic 유니온 타입 준수
  getSystemPrompt(charId?, locale?): string // buildSystemPrompt(char, locale) 사용
  getReadingPrompt(context): string        // buildReadingPrompt() 사용
  parseResult(aiResponse, expectedCount?): ReadingResult  // 아래 체인 필수
}
```

## parseResult 3단계 체인 (필수)

```typescript
parseResult(aiResponse: string): ReadingResult {
  const parsed = parseJsonSafe(aiResponse);    // 1. JSON 안전 파싱
  if (parsed) {
    return {
      ...parsed,
      overallReading: cleanReadingText(parsed.overallReading || ""),  // 2. 텍스트 정제
      // parseError 시그널 설정 필수 (3번):
      ...(isTruncated ? { parseError: "truncated" } : {}),
      ...(hasMissingFields ? { parseError: "missing_fields" } : {}),
    };
  }
  const cleanText = extractFallbackText(aiResponse);  // 3. 최종 fallback
  return { ..., parseError: cleanText ? "fallback_text" : "invalid_json" };
}
```

**parseError 시그널 4종**: `truncated` | `invalid_json` | `fallback_text` | `missing_fields`  
누락 시 클라이언트가 빈 결과를 정상으로 판정 → DB에 빈 리딩 저장됨.

## FallbackProvider 사용법

```typescript
// ✅ 모듈 레벨 싱글턴 — 요청마다 new 하면 CircuitBreaker 상태 유실
const provider = new FallbackProvider();

// streamReading 내 hasYielded 분기 필수
let hasYielded = false;
for await (const chunk of provider.streamReading(...)) {
  hasYielded = true;
  yield chunk;
}
// hasYielded=true 상태에서 예외 → Claude fallback 안 함, 즉시 throw
```

## 언어 지시문 헬퍼 (필수 사용)

```typescript
// ✅ 직접 사용 — 하드코딩 금지
buildSystemPrompt(character, locale)   // 앞뒤 CRITICAL 지시문 주입
getLanguageFooter(locale)              // 프롬프트 끝 언어 강조
```

한국어 시스템 프롬프트에서 모델이 한국어로 응답하는 회귀를 방지.

## max_tokens 정책

카드 수 기반 동적 산정 → `computeReadingMaxTokens(cardCount)` 함수 참고.  
Grok-3 reasoning 토큰이 같은 예산을 소비하므로 충분한 버퍼 필수.
