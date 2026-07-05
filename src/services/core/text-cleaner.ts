/** JSON 파싱 완전 실패 시 raw 텍스트에서 의미 있는 내용만 추출 */
export function extractFallbackText(raw: string): string {
  return raw
    .replace(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[{}[\]]/g, "")
    .replace(/"[a-zA-Z_]+"\s*:/g, "")
    .replace(/"[, \t]*\n/g, "\n")
    .replace(/^[ \t]*"/gm, "")
    .replace(/",?\s*$/gm, "")
    .replaceAll(String.raw`\n`, "\n")
    .replaceAll(String.raw`\"`, '"')
    .replace(/,\s*\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** AI 응답 텍스트에서 이스케이프/JSON 잔여물을 정리 */
export function cleanReadingText(text: string): string {
  return text
    // JSON 구조 잔여물 제거
    .replace(/"(cardInterpretations|cardId|position|interpretation|overallReading|topicReading|advice|isReversed|result|done|error)":\s*/g, "")
    .replace(/^\s*\[\s*\{/gm, "")
    .replace(/\}\s*\]\s*$/gm, "")
    .replace(/^\s*\{|\}\s*$/g, "")
    // 이스케이프 문자 처리
    .replaceAll(String.raw`\n\n`, "\n\n")
    .replaceAll(String.raw`\n`, "\n")
    .replaceAll(String.raw`\r`, "")
    .replaceAll(String.raw`\t`, " ")
    .replaceAll(String.raw`\"`, '"')
    // 줄 정리
    .replace(/^["']+|["']+$/gm, "")
    .replace(/,\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 문자열 리터럴 내부의 { } 를 무시하면서 가장 바깥 JSON 객체의 끝 인덱스를 반환.
 * 닫히지 않은 경우 -1 반환.
 */
function findOutermostObjectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * 객체·배열 닫힘 앞의 트레일링 콤마를 제거한다 (`,}` / `,]`).
 * LLM이 마지막 필드 뒤에 콤마를 남기는 매우 흔한 형식 위반을 교정. (문자열 내부는 건드리지 않음)
 */
function stripTrailingCommas(text: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { out += ch; escape = false; continue; }
    if (ch === "\\") { out += ch; escape = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (!inString && ch === ",") {
      // 다음 비공백 문자가 } 또는 ] 이면 트레일링 콤마 → 제거
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === "}" || text[j] === "]")) continue;
    }
    out += ch;
  }
  return out;
}

/**
 * AI 응답 raw 문자열에서 JSON 객체를 안전하게 추출·파싱.
 *
 * 처리 순서:
 * 1. <think>...</think> 등 thinking 토큰 제거
 * 2. 마크다운 코드블록 제거
 * 3. 가장 바깥 { ... } 추출 (문자열 내부 { } 무시)
 * 4. JSON.parse 1차 시도
 * 5. 문자열 값 내 리터럴 개행·탭 이스케이프 후 2차 시도
 * 6. 트레일링 콤마 제거 후 3차 시도 (LLM 흔한 형식 위반)
 * 7. 실패 시 null 반환
 */
export function parseJsonSafe(raw: string): Record<string, unknown> | null {
  let text = raw.trim();

  // thinking 토큰 제거 (일부 Grok 버전이 <think>...</think> 붙임)
  text = text.replaceAll(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "").trim();

  // 마크다운 코드블록에서 추출
  const codeMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (codeMatch) text = codeMatch[1].trim();

  // 입력 길이 상한 (ReDoS 방어)
  if (text.length > 50_000) return null;

  const start = text.indexOf("{");
  if (start === -1) return null;
  const end = findOutermostObjectEnd(text, start);
  if (end === -1) return null;
  text = text.slice(start, end + 1);

  // 1차 시도: 그대로 파싱
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch { /* 다음 파싱 방법으로 계속 */ } // NOSONAR

  // 2차 시도: 문자열 리터럴 내 개행·탭 이스케이프
  // "..." 패턴 내부의 비이스케이프 개행만 교체
  const escaped = text.replace(/("(?:[^"\\]|\\.)*")/g, (m) =>
    m.replaceAll("\n", String.raw`\n`).replaceAll("\r", "").replaceAll("\t", String.raw`\t`)
  );
  try {
    return JSON.parse(escaped) as Record<string, unknown>;
  } catch { /* 다음 파싱 방법으로 계속 */ } // NOSONAR

  // 3차 시도: 트레일링 콤마 제거 (2차의 개행 교정과 합쳐 적용)
  try {
    return JSON.parse(stripTrailingCommas(escaped)) as Record<string, unknown>;
  } catch { /* 최종 실패 */ } // NOSONAR

  return null;
}

/**
 * 모델이 flat 필드(overallReading·advice 등)를 섹션 객체(sajuSections/shinjeomSections) *내부*에
 * 잘못 중첩한 경우 top-level로 승격한다. (실측: 사주·신점 리딩의 흔한 형식 위반으로, 내용은
 * 생성됐으나 위치가 틀려 missing_fields로 폐기되던 결함을 복구.)
 *
 * parsed[sectionKey][field]가 비지 않은 문자열이고 parsed[field]가 없거나 빈 문자열일 때만 끌어올린다.
 * parsed 객체를 in-place로 수정한다.
 */
export function promoteNestedFields(
  parsed: Record<string, unknown>,
  sectionKey: string,
  fields: readonly string[],
): void {
  const section = parsed[sectionKey];
  if (!section || typeof section !== "object") return;
  const s = section as Record<string, unknown>;
  for (const f of fields) {
    const cur = parsed[f];
    const nested = s[f];
    if ((cur === undefined || cur === null || cur === "") && typeof nested === "string" && nested.trim()) {
      parsed[f] = nested;
    }
  }
}
