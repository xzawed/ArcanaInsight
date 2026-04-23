/** AI 응답 텍스트에서 이스케이프/JSON 잔여물을 정리 */
export function cleanReadingText(text: string): string {
  return text
    // JSON 구조 잔여물 제거
    .replace(/"(cardInterpretations|cardId|position|interpretation|overallReading|topicReading|advice|isReversed|result|done|error)":\s*/g, "")
    .replace(/^\s*\[\s*\{/gm, "")
    .replace(/\}\s*\]\s*$/gm, "")
    .replace(/^\s*\{|\}\s*$/g, "")
    // 이스케이프 문자 처리
    .replace(/\\n\\n/g, "\n\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    // 줄 정리
    .replace(/^["']+|["']+$/gm, "")
    .replace(/,\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * AI 응답 raw 문자열에서 JSON 객체를 안전하게 추출·파싱.
 *
 * 처리 순서:
 * 1. <think>...</think> 등 thinking 토큰 제거
 * 2. 마크다운 코드블록 제거
 * 3. 가장 바깥 { ... } 추출
 * 4. JSON.parse 1차 시도
 * 5. 문자열 값 내 리터럴 개행·탭 이스케이프 후 2차 시도
 * 6. 실패 시 null 반환
 */
export function parseJsonSafe(raw: string): Record<string, unknown> | null {
  let text = raw.trim();

  // thinking 토큰 제거 (일부 Grok 버전이 <think>...</think> 붙임)
  text = text.replace(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "").trim();

  // 마크다운 코드블록에서 추출
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) text = codeMatch[1].trim();

  // 입력 길이 상한 (ReDoS 방어)
  if (text.length > 50_000) return null;

  // 가장 바깥 JSON 객체만 추출 — 괄호 카운터 기반으로 ReDoS 방지
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  text = text.slice(start, end + 1);

  // 1차 시도: 그대로 파싱
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch { /* 다음 파싱 방법으로 계속 */ } // NOSONAR

  // 2차 시도: 문자열 리터럴 내 개행·탭 이스케이프
  // "..." 패턴 내부의 비이스케이프 개행만 교체
  try {
    const sanitized = text.replace(/("(?:[^"\\]|\\.)*")/g, (m) =>
      m.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t")
    );
    return JSON.parse(sanitized) as Record<string, unknown>;
  } catch { /* 다음 파싱 방법으로 계속 */ } // NOSONAR

  return null;
}
