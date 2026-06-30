/**
 * SSE 스트림 공통 처리 Hook
 *
 * 타로/사주/신점 세션 페이지에서 공통으로 사용되는 SSE 처리 로직.
 * fetch → reader → buffer → parse → done/error 전체 흐름을 캡슐화.
 */

interface SSEStreamOptions {
  url: string;
  body: Record<string, unknown>;
  /** 스트리밍 청크 수신 시 콜백 */
  onChunk: (chunk: string, fullText: string) => void;
  /** 정상 완료 시 콜백 */
  onDone: (data: Record<string, unknown>) => void;
  /** 에러 시 콜백 */
  onError: (message: string) => void;
  /** 외부에서 fetch abort 신호 전달 (타임아웃 등) */
  signal?: AbortSignal;
  /** 저장 결과 시그널 콜백 (done 이후 후속 saved 이벤트).
   *  제공 시 done에서 멈추지 않고 trailing saved 이벤트까지 읽는다. 미제공 시 done 즉시 종료(하위호환). */
  onSaveStatus?: (saved: boolean) => void;
}

type LineResult = { signal: "done" | "error" } | { signal: "continue" };

function logParseError(e: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[SSE] 파싱 실패:", e);
  }
}

async function resolveErrorDetail(response: Response): Promise<string> {
  try {
    const errorBody = await response.json();
    return (errorBody?.error as string) || "";
  } catch {
    return "";
  }
}

function processLine(
  line: string,
  state: { fullText: string },
  handlers: Pick<SSEStreamOptions, "onChunk" | "onDone" | "onError" | "onSaveStatus">
): LineResult {
  if (!line.startsWith("data: ")) return { signal: "continue" };
  try {
    const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
    if (data.error) {
      handlers.onError(data.error as string);
      return { signal: "error" };
    }
    if (data.chunk) {
      state.fullText += data.chunk as string;
      handlers.onChunk(data.chunk as string, state.fullText);
    }
    // 저장 결과 시그널 (done 이후 후속 이벤트) — 수신 시 스트림 종료
    if (data.saved !== undefined) {
      handlers.onSaveStatus?.(Boolean(data.saved));
      return { signal: "done" };
    }
    if (data.done) {
      handlers.onDone(data);
      // onSaveStatus 소비자는 trailing saved 이벤트까지 계속 읽는다. 미제공 시 즉시 종료(하위호환).
      return handlers.onSaveStatus ? { signal: "continue" } : { signal: "done" };
    }
  } catch (e) {
    logParseError(e);
  }
  return { signal: "continue" };
}

function flushRemainingBuffer(
  sseBuffer: string,
  handlers: Pick<SSEStreamOptions, "onDone" | "onError" | "onSaveStatus">
): void {
  if (!sseBuffer.trim() || !sseBuffer.startsWith("data: ")) return;
  try {
    const data = JSON.parse(sseBuffer.slice(6)) as Record<string, unknown>;
    if (data.error) {
      handlers.onError?.(data.error as string);
    } else if (data.saved !== undefined) {
      handlers.onSaveStatus?.(Boolean(data.saved));
    } else if (data.done) {
      handlers.onDone(data);
    }
  } catch (e) {
    logParseError(e);
  }
}

async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: Pick<SSEStreamOptions, "onChunk" | "onDone" | "onError" | "onSaveStatus">
): Promise<void> {
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let streamDone = false;
  const state = { fullText: "" };

  while (!streamDone) {
    const { done, value } = await reader.read();

    if (done) {
      flushRemainingBuffer(sseBuffer, { onDone: handlers.onDone, onError: handlers.onError, onSaveStatus: handlers.onSaveStatus });
      break;
    }

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const result = processLine(line, state, handlers);
      if (result.signal === "done" || result.signal === "error") {
        streamDone = true;
        break;
      }
    }
  }
}

export async function fetchSSEStream({
  url,
  body,
  onChunk,
  onDone,
  onError,
  signal,
  onSaveStatus,
}: SSEStreamOptions): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok || !response.body) {
      const detail = await resolveErrorDetail(response);
      onError(detail || `HTTP ${response.status}`);
      return;
    }

    await readStream(response.body.getReader(), { onChunk, onDone, onError, onSaveStatus });
  } catch (e) {
    onError(e instanceof Error ? e.message : String(e));
  }
}
