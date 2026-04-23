import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VerumClient } from "./client";
import { VerumAuthError, VerumRateLimitError, VerumTimeoutError } from "./errors";

/** fetch 응답 모킹 헬퍼 */
function makeJsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    body: { cancel: vi.fn() },
  } as unknown as Response;
}

function makeErrorResponse(status: number, headers: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    headers: new Headers(headers),
    json: () => Promise.reject(new Error("not json")),
    body: { cancel: vi.fn() },
  } as unknown as Response;
}

/** signal을 실제로 abort할 수 있는 pending fetch 모킹 */
function makePendingFetch() {
  return vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    }),
  );
}

const BASE_CONFIG = {
  deployment_id: "dep-1",
  status: "active",
  traffic_split: 1,
  variant_prompt: "You are a variant.",
};

describe("VerumClient", () => {
  let client: VerumClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new VerumClient({ apiUrl: "http://verum.test", apiKey: "test-key" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── chat() — deploymentId 없음 ──────────────────────────────────────────

  it("deploymentId 미설정 시 즉시 baseline 반환한다", async () => {
    const msgs = [{ role: "user" as const, content: "hi" }];
    const result = await client.chat(msgs);
    expect(result.routed_to).toBe("baseline");
    expect(result.deployment_id).toBeNull();
  });

  // ── chat() — 정상 config 조회 ──────────────────────────────────────────

  it("variant traffic_split=1 시 variant 프롬프트로 교체한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse(BASE_CONFIG),
    );
    const msgs = [{ role: "system" as const, content: "original" }];
    const result = await client.chat(msgs, "dep-1");
    expect(result.routed_to).toBe("variant");
    expect(result.messages[0].content).toBe("You are a variant.");
  });

  it("variant_prompt=null 시 메시지를 그대로 유지한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse({ ...BASE_CONFIG, variant_prompt: null }),
    );
    const msgs = [{ role: "user" as const, content: "hello" }];
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = await client.chat(msgs, "dep-1");
    expect(result.messages).toEqual(msgs);
  });

  // ── 서킷 오픈 중 즉시 baseline ──────────────────────────────────────────

  it("서킷 오픈 중 chat()은 fetch 없이 baseline을 반환한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeErrorResponse(500),
    );
    // 5xx로 서킷 오픈
    await expect(client.chat([], "dep-1")).rejects.toThrow();
    fetchSpy.mockClear();

    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("baseline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── config 타임아웃 → 서킷 마킹 ──────────────────────────────────────────

  it("config 조회 타임아웃 시 VerumTimeoutError를 던지고 서킷을 오픈한다", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(makePendingFetch());
    const chatPromise = client.chat([], "dep-1");
    vi.advanceTimersByTime(3001);
    await expect(chatPromise).rejects.toBeInstanceOf(VerumTimeoutError);

    // 서킷 오픈 확인
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("baseline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── config 401 → 30분 서킷 ──────────────────────────────────────────────

  it("config 401 시 VerumAuthError를 던지고 30분 서킷을 오픈한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeErrorResponse(401));
    await expect(client.chat([], "dep-1")).rejects.toBeInstanceOf(VerumAuthError);

    // 29분 경과 — 여전히 서킷 오픈
    vi.advanceTimersByTime(29 * 60 * 1000);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("baseline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── config 429 → retry-after 기반 서킷 ──────────────────────────────────

  it("config 429 시 VerumRateLimitError를 던지고 retry-after 기반 서킷을 오픈한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeErrorResponse(429, { "retry-after": "30" }),
    );
    await expect(client.chat([], "dep-1")).rejects.toBeInstanceOf(VerumRateLimitError);

    // 29초 — 여전히 오픈
    vi.advanceTimersByTime(29_000);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("baseline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── config 5xx → 60초 서킷 ──────────────────────────────────────────────

  it("config 5xx 시 60초 서킷을 오픈하고 이후 재시도한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeErrorResponse(503))
      .mockResolvedValueOnce(makeJsonResponse(BASE_CONFIG));

    await expect(client.chat([], "dep-1")).rejects.toThrow();

    // 60초 후 서킷 복구
    vi.advanceTimersByTime(60_001);
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("variant");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // ── schema 검증 실패 ──────────────────────────────────────────────────

  it("config 응답이 Zod 스키마를 통과하지 못하면 서킷을 오픈한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse({ deployment_id: "dep-1", traffic_split: "not-a-number" }),
    );
    await expect(client.chat([], "dep-1")).rejects.toThrow();

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("baseline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── record() — 서킷 오픈 시 스킵 ──────────────────────────────────────

  it("서킷 오픈 중 record()는 빈 문자열을 반환하고 fetch를 호출하지 않는다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeErrorResponse(500));
    await expect(client.chat([], "dep-1")).rejects.toThrow();

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const traceId = await client.record({
      deploymentId: "dep-1",
      variant: "baseline",
      model: "grok-3",
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 100,
    });
    expect(traceId).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── record() — 타임아웃 ──────────────────────────────────────────────

  it("record() 타임아웃 시 VerumTimeoutError를 던지고 서킷을 오픈한다", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(makePendingFetch());
    const recordPromise = client.record({
      deploymentId: "dep-1",
      variant: "baseline",
      model: "grok-3",
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 100,
    });
    vi.advanceTimersByTime(5001);
    await expect(recordPromise).rejects.toBeInstanceOf(VerumTimeoutError);
  });

  // ── record() — 정상 ──────────────────────────────────────────────────

  it("record() 정상 응답 시 trace_id를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse({ trace_id: "trace-abc" }),
    );
    const traceId = await client.record({
      deploymentId: "dep-1",
      variant: "baseline",
      model: "grok-3",
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 100,
    });
    expect(traceId).toBe("trace-abc");
  });

  // ── resetForTests() ──────────────────────────────────────────────────

  it("resetForTests() 호출 후 서킷이 닫힌다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeErrorResponse(500));
    await expect(client.chat([], "dep-1")).rejects.toThrow();

    client.resetForTests();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse(BASE_CONFIG),
    );
    const result = await client.chat([], "dep-1");
    expect(result.routed_to).toBe("variant");
    expect(fetchSpy).toHaveBeenCalled();
  });
});
