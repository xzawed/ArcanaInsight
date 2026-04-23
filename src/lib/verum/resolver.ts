import "server-only";
import { VerumClient } from "./client";
import { getVerumDeploymentId, getVerumApiUrl, getVerumApiKey, getGrokModel } from "@/lib/env";

let _client: VerumClient | null = null;

function getClient(): VerumClient {
  if (!_client) {
    _client = new VerumClient({ apiUrl: getVerumApiUrl(), apiKey: getVerumApiKey() });
  }
  return _client;
}

export async function resolveSystemPrompt(
  fallback: string,
  client?: VerumClient,
  deploymentId?: string,
): Promise<{ systemPrompt: string; routedTo: "variant" | "baseline"; deploymentId: string | null }> {
  const depId = deploymentId ?? getVerumDeploymentId();
  if (!depId) return { systemPrompt: fallback, routedTo: "baseline", deploymentId: null };

  try {
    const c = client ?? getClient();
    const result = await c.chat([{ role: "system", content: fallback }], depId);
    return {
      systemPrompt: result.messages[0]?.content ?? fallback,
      routedTo: result.routed_to,
      deploymentId: depId,
    };
  } catch (e) {
    console.warn("[Verum] prompt routing failed, using local prompt:", e instanceof Error ? e.message : e);
    return { systemPrompt: fallback, routedTo: "baseline", deploymentId: null };
  }
}

export function recordTrace(params: {
  deploymentId: string | null;
  routedTo: "variant" | "baseline";
  model: string;
  outputLength: number;
  latencyMs: number;
  client?: VerumClient;
}): void {
  if (!params.deploymentId) return;
  const c = params.client ?? getClient();
  void c.record({
    deploymentId: params.deploymentId,
    variant: params.routedTo,
    model: params.model ?? getGrokModel(),
    inputTokens: 0,
    outputTokens: Math.ceil(params.outputLength / 4),
    latencyMs: params.latencyMs,
  }).catch((e) => console.warn("[Verum] record failed:", e instanceof Error ? e.message : e));
}

/** 테스트 전용 — 싱글턴 클라이언트 초기화 */
export function resetVerumClientForTests(): void {
  _client = null;
}
