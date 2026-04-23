import { DeploymentConfigCache } from "./cache";
import { chooseVariant } from "./router";

interface DeploymentConfig {
  deployment_id: string;
  status: string;
  traffic_split: number;
  variant_prompt: string | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  messages: ChatMessage[];
  routed_to: "variant" | "baseline";
  deployment_id: string | null;
}

export class VerumClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly cache: DeploymentConfigCache<DeploymentConfig>;

  constructor(options?: { apiUrl?: string; apiKey?: string; cacheTtlMs?: number }) {
    this.apiUrl = (options?.apiUrl ?? process.env.VERUM_API_URL ?? "").replace(/\/$/, "");
    this.apiKey = options?.apiKey ?? process.env.VERUM_API_KEY ?? "";
    this.cache = new DeploymentConfigCache(options?.cacheTtlMs ?? 60_000);
  }

  async chat(messages: ChatMessage[], deploymentId?: string): Promise<ChatResult> {
    if (!deploymentId) {
      return { messages, routed_to: "baseline", deployment_id: null };
    }

    const config = await this.getDeploymentConfig(deploymentId);
    const routedTo = chooseVariant(config.traffic_split);
    let finalMessages = [...messages];

    if (routedTo === "variant" && config.variant_prompt) {
      if (finalMessages[0]?.role === "system") {
        finalMessages[0] = { ...finalMessages[0], content: config.variant_prompt };
      } else {
        finalMessages = [{ role: "system", content: config.variant_prompt }, ...finalMessages];
      }
    }

    return { messages: finalMessages, routed_to: routedTo, deployment_id: deploymentId };
  }

  async record(params: {
    deploymentId: string;
    variant: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    error?: string | null;
  }): Promise<string> {
    const res = await fetch(`${this.apiUrl}/api/v1/traces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-verum-api-key": this.apiKey },
      body: JSON.stringify({
        deployment_id: params.deploymentId,
        variant: params.variant,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        latency_ms: params.latencyMs,
        error: params.error ?? null,
      }),
    });
    if (!res.ok) throw new Error(`Verum record failed: ${res.status}`);
    const data = await res.json() as { trace_id: string };
    return data.trace_id;
  }

  private async getDeploymentConfig(deploymentId: string): Promise<DeploymentConfig> {
    const cached = this.cache.get(deploymentId);
    if (cached) return cached;

    const res = await fetch(`${this.apiUrl}/api/v1/deploy/${deploymentId}/config`, {
      headers: { "x-verum-api-key": this.apiKey },
    });
    if (!res.ok) throw new Error(`Verum config fetch failed: ${res.status}`);
    const config = await res.json() as DeploymentConfig;
    this.cache.set(deploymentId, config);
    return config;
  }
}
