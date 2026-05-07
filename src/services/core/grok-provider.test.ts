import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GrokProvider, RateLimitError, AuthError } from "./grok-provider";

/** fetch 응답을 모킹하는 헬퍼 */
function makeJsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body = "error", headers: Record<string, string> = {}) {
  const headersObj = new Headers(headers);
  return {
    ok: false,
    status,
    headers: headersObj,
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

/** SSE 스트리밍 응답을 모킹하는 헬퍼 */
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

describe("GrokProvider", () => {
  let provider: GrokProvider;
  const mockFetch = vi.fn<typeof fetch>();

  beforeEach(() => {
    process.env.GROK_API_KEY = "test-grok-key";
    provider = new GrokProvider();
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 에러 클래스 ───────────────────────────────────────────────────────────

  describe("RateLimitError", () => {
    it("retryAfterMs를 저장한다", () => {
      const err = new RateLimitError(30000);
      expect(err.retryAfterMs).toBe(30000);
      expect(err.name).toBe("RateLimitError");
      expect(err).toBeInstanceOf(Error);
    });

    it("메시지에 retry-after 시간이 포함된다", () => {
      const err = new RateLimitError(5000);
      expect(err.message).toContain("5000ms");
    });
  });

  describe("AuthError", () => {
    it("status와 detail이 메시지에 포함된다", () => {
      const err = new AuthError(401, "unauthorized");
      expect(err.name).toBe("AuthError");
      expect(err.message).toContain("401");
      expect(err.message).toContain("unauthorized");
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ─── generateReading ───────────────────────────────────────────────────────

  describe("generateReading", () => {
    it("성공 시 content를 반환한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ choices: [{ message: { content: "Grok 리딩 결과" } }] })
      );

      const result = await provider.generateReading("시스템", "유저");
      expect(result).toBe("Grok 리딩 결과");
    });

    it("Authorization Bearer 헤더로 API 키를 전달한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ choices: [{ message: { content: "ok" } }] })
      );

      await provider.generateReading("s", "u");

      const [, options] = mockFetch.mock.calls[0];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-grok-key");
    });

    it("401 응답 시 AuthError를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, "unauthorized"));

      await expect(provider.generateReading("s", "u")).rejects.toThrow(AuthError);
    });

    it("403 응답 시 AuthError를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(403, "forbidden"));

      await expect(provider.generateReading("s", "u")).rejects.toThrow(AuthError);
    });

    it("429 응답 시 RateLimitError를 던진다", async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(429, "too many requests", { "retry-after": "10" })
      );

      await expect(provider.generateReading("s", "u")).rejects.toThrow(RateLimitError);
    });

    it("429 + retry-after 헤더로 retryAfterMs를 계산한다", async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(429, "rate limited", { "retry-after": "5" })
      );

      const error = await provider.generateReading("s", "u").catch((e) => e);
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterMs).toBe(5000); // 5초 * 1000
    });

    it("429 + retry-after 헤더 없으면 기본 30초를 사용한다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(429, "rate limited"));

      const error = await provider.generateReading("s", "u").catch((e) => e);
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterMs).toBe(30000);
    });

    it("429 + retry-after 헤더가 비숫자이면 기본 30초로 fallback한다", async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(429, "rate limited", { "retry-after": "not-a-number" })
      );

      const error = await provider.generateReading("s", "u").catch((e) => e);
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterMs).toBe(30000);
    });

    it("500 응답 시 일반 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, "server error"));

      await expect(provider.generateReading("s", "u")).rejects.toThrow(/Grok API error \(500\)/);
    });

    it("빈 응답 content 시 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ choices: [{ message: { content: "" } }] })
      );

      await expect(provider.generateReading("s", "u")).rejects.toThrow("빈 응답");
    });

    it("choices가 비어있으면 Error를 던진다", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ choices: [] }));

      await expect(provider.generateReading("s", "u")).rejects.toThrow("빈 응답");
    });

    it("GROK_API_KEY 미설정 시 fetch 호출 전에 Error를 던진다", async () => {
      process.env.GROK_API_KEY = "";
      const freshProvider = new GrokProvider();

      await expect(freshProvider.generateReading("s", "u")).rejects.toThrow("GROK_API_KEY");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("GROK_API_KEY가 기본 placeholder이면 Error를 던진다", async () => {
      process.env.GROK_API_KEY = "your_grok_api_key";
      const freshProvider = new GrokProvider();

      await expect(freshProvider.generateReading("s", "u")).rejects.toThrow("GROK_API_KEY");
    });

    it("maxTokens 인자를 body에 전달한다", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({ choices: [{ message: { content: "ok" } }] })
      );

      await provider.generateReading("s", "u", 1024);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);
      expect(body.max_tokens).toBe(1024);
    });
  });

  // ─── streamReading ─────────────────────────────────────────────────────────

  describe("streamReading", () => {
    it("SSE [DONE] 이전까지 content 청크를 yield한다", async () => {
      const sseLines = [
        'data: {"choices":[{"delta":{"content":"안녕"}}]}',
        'data: {"choices":[{"delta":{"content":"하세요"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["안녕", "하세요"]);
    });

    it("content 없는 delta 청크는 무시한다", async () => {
      const sseLines = [
        'data: {"choices":[{"delta":{}}]}',
        'data: {"choices":[{"delta":{"content":"텍스트"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["텍스트"]);
    });

    it("data: 로 시작하지 않는 라인은 건너뛴다", async () => {
      const sseLines = [
        ": keep-alive",
        "",
        'data: {"choices":[{"delta":{"content":"유효"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["유효"]);
    });

    it("잘못된 JSON 청크는 경고 후 계속 진행한다", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const sseLines = [
        "data: {invalid json}",
        'data: {"choices":[{"delta":{"content":"정상"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));

      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["정상"]);
      expect(consoleSpy).toHaveBeenCalledOnce();
    });

    it("401 응답 시 AuthError를 던진다", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, "unauthorized"));

      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow(AuthError);
    });

    it("429 응답 시 RateLimitError를 던진다", async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(429, "rate limited", { "retry-after": "60" })
      );

      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow(RateLimitError);
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

    // ─── reasoning 모델 회귀 방지 (PR 회귀 분석) ──────────────────────────
    it("reasoning 토큰만 소비하고 content가 비어있으면 throw → FallbackProvider Claude 전환", async () => {
      // reasoning_content만 있고 content는 null인 청크 (delta.content가 없으므로 yield 안 됨)
      const sseLines = [
        'data: {"choices":[{"delta":{"reasoning_content":"thinking..."}}]}',
        'data: {"choices":[{"delta":{"reasoning_content":"more thinking"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow(/빈 응답.*reasoning/);
    });

    it("reasoning 청크 사이에 content 청크가 1개라도 있으면 정상 yield (throw 안 함)", async () => {
      const sseLines = [
        'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}',
        'data: {"choices":[{"delta":{"content":"본문"}}]}',
        "data: [DONE]",
      ];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      const chunks = await collectStream(provider.streamReading("s", "u"));
      expect(chunks).toEqual(["본문"]);
    });

    it("grok-3 모델이면 reasoning_effort 옵션이 body에 포함된다", async () => {
      process.env.GROK_MODEL = "grok-3";
      const newProvider = new GrokProvider();
      const sseLines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await collectStream(newProvider.streamReading("s", "u"));
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.reasoning_effort).toBeDefined();
      expect(["low", "high"]).toContain(body.reasoning_effort);
    });

    it("grok-4-fast-non-reasoning 모델이면 reasoning_effort 옵션 제외 (400 차단 회피)", async () => {
      process.env.GROK_MODEL = "grok-4-fast-non-reasoning";
      const newProvider = new GrokProvider();
      const sseLines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await collectStream(newProvider.streamReading("s", "u"));
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.reasoning_effort).toBeUndefined();
    });

    it("GROK_REASONING_EFFORT 환경변수가 'high'면 그대로 적용", async () => {
      process.env.GROK_MODEL = "grok-3";
      process.env.GROK_REASONING_EFFORT = "high";
      const newProvider = new GrokProvider();
      const sseLines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await collectStream(newProvider.streamReading("s", "u"));
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.reasoning_effort).toBe("high");
      delete process.env.GROK_REASONING_EFFORT;
    });

    it("grok-3-mini 모델도 reasoning_effort 옵션 적용", async () => {
      process.env.GROK_MODEL = "grok-3-mini";
      const newProvider = new GrokProvider();
      const sseLines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await collectStream(newProvider.streamReading("s", "u"));
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.reasoning_effort).toBe("low");
    });

    it("grok-4 (자동 reasoning, 옵션 미지원) → reasoning_effort 옵션 제외", async () => {
      process.env.GROK_MODEL = "grok-4";
      const newProvider = new GrokProvider();
      const sseLines = ['data: {"choices":[{"delta":{"content":"x"}}]}', "data: [DONE]"];
      mockFetch.mockResolvedValue(makeSseResponse(sseLines));
      await collectStream(newProvider.streamReading("s", "u"));
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.reasoning_effort).toBeUndefined();
    });
  });
});
