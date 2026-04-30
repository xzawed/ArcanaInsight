import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSSEStream } from "./useSSEStream";

const encoder = new TextEncoder();

/** SSE 라인 배열로 ReadableStream 응답을 만드는 헬퍼 */
function makeSseResponse(lines: string[], status = 200, ok = true) {
  const text = lines.join("\n") + "\n";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return {
    ok,
    status,
    body: stream,
    json: () => Promise.resolve({ error: `HTTP ${status}` }),
  } as unknown as Response;
}

describe("fetchSSEStream", () => {
  const mockFetch = vi.fn<typeof fetch>();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("chunk 이벤트를 수신하고 fullText를 누적한다", async () => {
    const lines = [
      'data: {"chunk":"안녕"}',
      'data: {"chunk":"하세요"}',
      'data: {"done":true,"sessionId":"abc"}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    const chunks: string[] = [];
    const fullTexts: string[] = [];
    let doneData: Record<string, unknown> | null = null;

    await fetchSSEStream({
      url: "/api/test",
      body: { test: true },
      onChunk: (chunk, full) => { chunks.push(chunk); fullTexts.push(full); },
      onDone: (data) => { doneData = data; },
      onError: vi.fn(),
    });

    expect(chunks).toEqual(["안녕", "하세요"]);
    expect(fullTexts).toEqual(["안녕", "안녕하세요"]);
    expect(doneData).toMatchObject({ done: true, sessionId: "abc" });
  });

  it("done 이벤트에서 스트림 처리를 중단한다", async () => {
    const lines = [
      'data: {"chunk":"첫 번째"}',
      'data: {"done":true}',
      'data: {"chunk":"이후는 무시"}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    const chunks: string[] = [];
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: (chunk) => chunks.push(chunk),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(chunks).toEqual(["첫 번째"]);
  });

  it("data.error가 있으면 onError를 호출하고 중단한다", async () => {
    const lines = [
      'data: {"chunk":"시작"}',
      'data: {"error":"AI 서비스 오류"}',
      'data: {"chunk":"중단 후 무시"}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    const onError = vi.fn();
    const chunks: string[] = [];
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: (chunk) => chunks.push(chunk),
      onDone: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith("AI 서비스 오류");
    expect(chunks).toEqual(["시작"]);
  });

  it("HTTP 에러 응답이면 onError를 호출한다", async () => {
    const errorBody = { error: "서버 오류" };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
      json: () => Promise.resolve(errorBody),
    } as unknown as Response);

    const onError = vi.fn();
    await fetchSSEStream({ url: "/api/test", body: {}, onChunk: vi.fn(), onDone: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith("서버 오류");
  });

  it("HTTP 에러 + JSON 파싱 실패 시 'HTTP {status}'로 fallback한다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      body: null,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    const onError = vi.fn();
    await fetchSSEStream({ url: "/api/test", body: {}, onChunk: vi.fn(), onDone: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith("HTTP 503");
  });

  it("response.body가 null이면 onError를 호출한다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      body: null,
      json: () => Promise.resolve({ error: "" }),
    } as unknown as Response);

    const onError = vi.fn();
    await fetchSSEStream({ url: "/api/test", body: {}, onChunk: vi.fn(), onDone: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith("HTTP 400");
  });

  it("fetch 자체가 throw하면 onError를 호출한다", async () => {
    mockFetch.mockRejectedValue(new Error("네트워크 오류"));

    const onError = vi.fn();
    await fetchSSEStream({ url: "/api/test", body: {}, onChunk: vi.fn(), onDone: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith("네트워크 오류");
  });

  it("data: 로 시작하지 않는 라인은 무시한다", async () => {
    const lines = [
      ": comment",
      "event: chunk",
      'data: {"chunk":"유효"}',
      'data: {"done":true}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    const chunks: string[] = [];
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: (c) => chunks.push(c),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(chunks).toEqual(["유효"]);
  });

  it("잘못된 JSON 라인은 무시하고 계속 처리한다", async () => {
    const lines = [
      "data: {invalid}",
      'data: {"chunk":"정상"}',
      'data: {"done":true}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    const chunks: string[] = [];
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: (c) => chunks.push(c),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(chunks).toEqual(["정상"]);
  });

  it("스트림 종료 시 버퍼에 남은 done 이벤트를 처리한다", async () => {
    // 개행 없이 끝나는 마지막 라인을 남기는 케이스 시뮬레이션
    const text = 'data: {"chunk":"마지막"}\ndata: {"done":true,"result":"완료"}';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text)); // 마지막 줄에 \n 없음
        controller.close();
      },
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200, body: stream, json: vi.fn() } as unknown as Response);

    let doneData: Record<string, unknown> | null = null;
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: vi.fn(),
      onDone: (d) => { doneData = d; },
      onError: vi.fn(),
    });

    // 버퍼에 남은 done 이벤트가 처리되었는지 확인
    expect(doneData).toMatchObject({ done: true, result: "완료" });
  });

  it("done 페이로드의 result.parseError를 onDone에 그대로 전달한다 (truncated 시그널)", async () => {
    const lines = [
      'data: {"done":true,"result":{"cardInterpretations":[],"overallReading":"부분","advice":"","parseError":"truncated","expectedCardCount":5}}',
    ];
    mockFetch.mockResolvedValue(makeSseResponse(lines));

    let doneData: Record<string, unknown> | null = null;
    await fetchSSEStream({
      url: "/api/test",
      body: {},
      onChunk: vi.fn(),
      onDone: (d) => { doneData = d; },
      onError: vi.fn(),
    });

    expect(doneData).toBeTruthy();
    const result = (doneData as unknown as { result: Record<string, unknown> }).result;
    expect(result.parseError).toBe("truncated");
    expect(result.expectedCardCount).toBe(5);
  });

  it("POST 요청 body를 JSON으로 직렬화해서 전송한다", async () => {
    mockFetch.mockResolvedValue(makeSseResponse(['data: {"done":true}']));

    await fetchSSEStream({
      url: "/api/reading",
      body: { sessionId: "s1", cardIds: ["a", "b"] },
      onChunk: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/reading", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "s1", cardIds: ["a", "b"] }),
    }));
  });
});
