import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveSystemPrompt, recordTrace, resetVerumClientForTests } from "./resolver";
import { VerumClient } from "./client";

function makeClient(overrides?: Partial<InstanceType<typeof VerumClient>>) {
  const c = new VerumClient({ apiUrl: "http://verum.test", apiKey: "test" });
  if (overrides) Object.assign(c, overrides);
  return c;
}

describe("resolveSystemPrompt", () => {
  beforeEach(() => {
    resetVerumClientForTests();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("VERUM_DEPLOYMENT_ID 미설정 시 즉시 baseline을 반환한다", async () => {
    vi.stubEnv("VERUM_DEPLOYMENT_ID", "");
    const result = await resolveSystemPrompt("fallback prompt");
    expect(result.routedTo).toBe("baseline");
    expect(result.systemPrompt).toBe("fallback prompt");
    expect(result.deploymentId).toBeNull();
  });

  it("deploymentId 명시 시 Verum을 조회하고 variant 프롬프트를 반환한다", async () => {
    const client = makeClient();
    vi.spyOn(client, "chat").mockResolvedValue({
      messages: [{ role: "system", content: "variant prompt" }],
      routed_to: "variant",
      deployment_id: "dep-1",
    });
    const result = await resolveSystemPrompt("fallback", client, "dep-1");
    expect(result.systemPrompt).toBe("variant prompt");
    expect(result.routedTo).toBe("variant");
    expect(result.deploymentId).toBe("dep-1");
  });

  it("baseline 라우팅 시 fallback 프롬프트를 유지한다", async () => {
    const client = makeClient();
    vi.spyOn(client, "chat").mockResolvedValue({
      messages: [{ role: "system", content: "fallback" }],
      routed_to: "baseline",
      deployment_id: "dep-1",
    });
    const result = await resolveSystemPrompt("fallback", client, "dep-1");
    expect(result.routedTo).toBe("baseline");
    expect(result.systemPrompt).toBe("fallback");
  });

  it("chat() 에러 시 warn 후 baseline으로 fallback한다", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = makeClient();
    vi.spyOn(client, "chat").mockRejectedValue(new Error("timeout"));
    const result = await resolveSystemPrompt("fallback", client, "dep-1");
    expect(result.routedTo).toBe("baseline");
    expect(result.systemPrompt).toBe("fallback");
    expect(result.deploymentId).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Verum] prompt routing failed"),
      expect.stringContaining("timeout"),
    );
  });
});

describe("recordTrace", () => {
  it("deploymentId=null 시 record()를 호출하지 않는다", () => {
    const client = makeClient();
    const recordSpy = vi.spyOn(client, "record");
    recordTrace({
      deploymentId: null,
      routedTo: "baseline",
      model: "grok-3",
      outputLength: 100,
      latencyMs: 50,
      client,
    });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("deploymentId 있을 때 record()를 fire-and-forget으로 호출한다", async () => {
    const client = makeClient();
    const recordSpy = vi.spyOn(client, "record").mockResolvedValue("trace-id");
    recordTrace({
      deploymentId: "dep-1",
      routedTo: "variant",
      model: "grok-3",
      outputLength: 400,
      latencyMs: 120,
      client,
    });
    expect(recordSpy).toHaveBeenCalledOnce();
  });

  it("record() 에러가 throw되지 않는다 (fire-and-forget)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = makeClient();
    vi.spyOn(client, "record").mockRejectedValue(new Error("network"));
    expect(() =>
      recordTrace({
        deploymentId: "dep-1",
        routedTo: "baseline",
        model: "grok-3",
        outputLength: 100,
        latencyMs: 50,
        client,
      }),
    ).not.toThrow();
    // microtask flush
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Verum] record failed:"),
      expect.stringContaining("network"),
    );
  });
});
