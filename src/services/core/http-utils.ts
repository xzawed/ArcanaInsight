/** AbortController 타임아웃을 관리하며 비동기 함수를 실행 */
export async function withAbortTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** SSE 한 줄을 파싱해 텍스트 반환. "[DONE]"이면 null, 스킵 대상이면 undefined */
function parseSseLine(
  line: string,
  extractDelta: (parsed: unknown) => string | null,
  logTag: string
): string | null | undefined {
  const trimmed = line.trim();
  if (!trimmed?.startsWith("data: ")) return undefined;
  const data = trimmed.slice(6);
  if (data === "[DONE]") return null;
  try {
    return extractDelta(JSON.parse(data)) ?? undefined;
  } catch (e) {
    console.warn(`[${logTag}] SSE 청크 파싱 실패:`, data.slice(0, 100), e);
    return undefined;
  }
}

/**
 * SSE 응답 스트림을 읽어 텍스트 청크를 순차적으로 yield.
 * extractDelta: 파싱된 JSON 이벤트에서 텍스트를 추출하는 함수 (없으면 null 반환)
 */
export async function* readSseLines(
  response: Response,
  extractDelta: (parsed: unknown) => string | null,
  logTag = "SSE",
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (!response.body) throw new Error("Response body is null");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const result = parseSseLine(line, extractDelta, logTag);
      if (result === null) return;
      if (result !== undefined) yield result;
    }
  }
}
