import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClaudeProvider } from "./claude-provider";

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body = "error") {
  return {
    ok: false,
    status,
    headers: new Headers(),
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeSseResponse(lines: string[], status = 200) {
  const encoder = new TextEncoder();
  const text = lines.join("\n") + "\n";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    body: stream,
    text: () => Promise.resolve("error body"),
  } as unknown as Response;
}

async function collectStream(gen: AsyncGenerator<string, void, unknown>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;
  const mockFetch = vi.fn<typeof fetch>();

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-claude-key";
    provider = new ClaudeProvider();
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── generateReading ───────────────────────────────────────────────────────

  describe("generateReading", () => {
    it("성공 시 content를 반환한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "Claude 리딩 결과" }] })
      );

      const result = await provider.generateReading("시스템", "유저");
      expect(result).toBe("Claude 리딩 결과");
    });

    it("x-api-key 헤더로 API 키를 전달한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "ok" }] })
      );

      await provider.generateReading("s", "u");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options?.headers as Record<string, string>;
      expect(headers["x-api-key"]).toBe("test-claude-key");
    });

    it("anthropic-version 헤더를 전달한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "ok" }] })
      );

      await provider.generateReading("s", "u");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options?.headers as Record<string, string>;
      expect(headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("Anthropic Messages API 포맷으로 body를 전송한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "ok" }] })
      );

      await provider.generateReading("my-system", "my-user");

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);
      expect(body.system).toBe("my-system");
      expect(body.messages).toEqual([{ role: "user", content: "my-user" }]);
    });

    it("4xx/5xx 응답 시 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, "internal error"));

      await expect(provider.generateReading("s", "u")).rejects.toThrow("HTTP 500");
    });

    it("401 응답도 동일하게 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, "unauthorized"));

      await expect(provider.generateReading("s", "u")).rejects.toThrow("HTTP 401");
    });

    it("빈 content 시 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "" }] })
      );

      await expect(provider.generateReading("s", "u")).rejects.toThrow("빈 응답");
    });

    it("content 배열이 비어있으면 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ content: [] }));

      await expect(provider.generateReading("s", "u")).rejects.toThrow("빈 응답");
    });

    it("ANTHROPIC_API_KEY 미설정 시 fetch 전에 Error를 던진다", async () => {
      process.env.ANTHROPIC_API_KEY = "";
      const freshProvider = new ClaudeProvider();

      await expect(freshProvider.generateReading("s", "u")).rejects.toThrow("ANTHROPIC_API_KEY");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("maxTokens 인자를 body에 전달한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ content: [{ text: "ok" }] })
      );

      await provider.generateReading("s", "u", 2048);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);
      expect(body.max_tokens).toBe(2048);
    });
  });

  // ─── streamReading ─────────────────────────────────────────────────────────

  describe("streamReading", () => {
    it("content_block_delta 이벤트에서 텍스트를 yield한다", async () => {
      const sseLines = [
        'data: {"type":"content_block_delta","delta":{"text":"안녕"}}',
        'data: {"type":"content_block_delta","delta":{"text":"하세요"}}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["안녕", "하세요"]);
    });

    it("content_block_delta가 아닌 이벤트는 무시한다", async () => {
      const sseLines = [
        'data: {"type":"message_start","message":{}}',
        'data: {"type":"content_block_start","index":0}',
        'data: {"type":"content_block_delta","delta":{"text":"텍스트"}}',
        'data: {"type":"message_delta","delta":{}}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["텍스트"]);
    });

    it("data: 로 시작하지 않는 라인은 건너뛴다", async () => {
      const sseLines = [
        "event: content_block_delta",
        'data: {"type":"content_block_delta","delta":{"text":"유효"}}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["유효"]);
    });

    it("non-ok 응답 시 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, "server error"));

      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow("HTTP 500");
    });

    it("body가 null이면 Error를 던진다", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null,
        text: () => Promise.resolve(""),
      } as unknown as Response);

      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow("Response body is null");
    });

    it("[DONE]에서 스트림을 종료한다", async () => {
      const sseLines = [
        'data: {"type":"content_block_delta","delta":{"text":"첫 번째"}}',
        "data: [DONE]",
        'data: {"type":"content_block_delta","delta":{"text":"이 이후는 무시"}}',
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["첫 번째"]);
    });

    it("message_delta stop_reason='max_tokens' 시 TRUNCATED 경고 로그 (10장+ truncation 진단)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const sseLines = [
        'data: {"type":"content_block_delta","delta":{"text":"부분"}}',
        'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"},"usage":{"output_tokens":24500}}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u", 24500));
      expect(chunks).toEqual(["부분"]);
      const truncatedCall = warnSpy.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("TRUNCATED")
      );
      expect(truncatedCall).toBeDefined();
      expect(truncatedCall?.[0]).toContain("24500");
      warnSpy.mockRestore();
    });
  });
});
