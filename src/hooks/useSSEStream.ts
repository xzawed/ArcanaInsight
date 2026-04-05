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
}

export async function fetchSSEStream({ url, body, onChunk, onDone, onError }: SSEStreamOptions): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      let errorDetail = "";
      try {
        const errorBody = await response.json();
        errorDetail = errorBody?.error || "";
      } catch { /* 파싱 실패 무시 */ }
      onError(errorDetail || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let fullText = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();

      if (done) {
        // 스트림 종료 — 버퍼에 남은 마지막 데이터 처리
        if (sseBuffer.trim() && sseBuffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(sseBuffer.slice(6));
            if (data.done) {
              onDone(data);
            }
          } catch { /* 파싱 실패 무시 */ }
        }
        break;
      }

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            onError(data.error);
            streamDone = true;
            break;
          }

          if (data.chunk) {
            fullText += data.chunk;
            onChunk(data.chunk, fullText);
          }

          if (data.done) {
            onDone(data);
            streamDone = true;
            break;
          }
        } catch { /* SSE 파싱 실패 무시 */ }
      }
    }
  } catch (e) {
    onError(e instanceof Error ? e.message : String(e));
  }
}
