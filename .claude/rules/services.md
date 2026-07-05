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

### 리딩 안정성 내성 (2026-07-06)

사주·신점 리딩의 간헐적 JSON 형식 위반(트레일링 콤마·flat 필드를 섹션 객체 내부에 중첩)이 무결과를 유발했다. 파서·라우트에 3중 내성:

1. **`parseJsonSafe`** — 3차 파싱 시도에 **트레일링 콤마 제거** 포함 (`,}`·`,]` → `JSON.parse` 실패 방지).
2. **`promoteNestedFields(parsed, "sajuSections"|"shinjeomSections", [...])`** — 사주·신점 `parseResult`에서 파싱 직후 호출. 모델이 `overallReading`·`advice` 등을 섹션 객체 **내부**에 잘못 넣은 경우 top-level로 승격 (`missing_fields` 복구).
3. **`streamReadingWithParseRetry`** (`reading-generator.ts`) — 3개 리딩 라우트가 `for await streamReading` 대신 이 헬퍼 사용. 1차 파싱이 `parseError`면 **1회 non-stream 재생성** 후 재파싱(성공 시 채택, 실패 시 원본 유지).

클라이언트: 사주도 타로·신점과 동일 계약 — `invalid_json`/`missing_fields`만 무결과, `truncated`/`fallback_text`는 부분 표시. SSE 종단 이벤트(done/error) 없이 스트림이 끝나면 3훅 모두 명시적 에러로 전환(무한 스피너 방지). 클라 hard timeout 280s(서버 `AI_TIMEOUT_MS` 240s 대비 양의 마진).

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
공식: `min(15000 + cardCount × 9000 + 15000, 65000)` (PR #420 기준, cap 65,000).  
Grok-3 reasoning 토큰이 같은 예산을 소비하므로 충분한 버퍼 필수.
