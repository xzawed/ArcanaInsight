import {
  getVerumApiUrl,
  getVerumApiKey,
  getVerumTimeoutMs,
  getVerumRecordTimeoutMs,
  getVerumFailureCooldownMs,
  getVerumAuthCooldownMs,
} from "@/lib/env";
import { DeploymentConfigCache } from "./cache";
import { chooseVariant } from "./router";
import {
  VerumAuthError,
  VerumRateLimitError,
  VerumTimeoutError,
  VerumSchemaError,
} from "./errors";
import { DeploymentConfigSchema, TraceResponseSchema } from "./schemas";
import type { DeploymentConfig } from "./schemas";

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

  private down = false;
  private downUntil = 0;

  constructor(options?: { apiUrl?: string; apiKey?: string; cacheTtlMs?: number }) {
    this.apiUrl = (options?.apiUrl ?? getVerumApiUrl()).replace(/\/$/, "");
    this.apiKey = options?.apiKey ?? getVerumApiKey();
    this.cache = new DeploymentConfigCache(options?.cacheTtlMs ?? 60_000);
  }

  private isAvailable(): boolean {
    if (!this.down) return true;
    if (Date.now() > this.downUntil) { this.down = false; return true; }
    return false;
  }

  private markDown(cooldownMs: number, reason: string): void {
    this.down = true;
    this.downUntil = Date.now() + cooldownMs;
    console.warn(`[Verum] circuit open for ${cooldownMs}ms — ${reason}`);
  }

  async chat(messages: ChatMessage[], deploymentId?: string): Promise<ChatResult> {
    if (!deploymentId) {
      return { messages, routed_to: "baseline", deployment_id: null };
    }

    if (!this.isAvailable()) {
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
    if (!this.isAvailable()) return "";

    const timeoutMs = getVerumRecordTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
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
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        res.body?.cancel();
        this.markDown(getVerumAuthCooldownMs(), `record auth error ${res.status}`);
        throw new VerumAuthError(res.status);
      }

      if (!res.ok) {
        res.body?.cancel();
        console.warn(`[Verum] record failed: ${res.status}`);
        return "";
      }

      const parsed = TraceResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        console.warn(`[Verum] record response schema invalid: ${parsed.error.message}`);
        return "";
      }
      return parsed.data.trace_id;
    } catch (err) {
      if (err instanceof VerumAuthError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        this.markDown(getVerumFailureCooldownMs(), `record timeout ${timeoutMs}ms`);
        throw new VerumTimeoutError(timeoutMs);
      }
      this.markDown(getVerumFailureCooldownMs(), `record network error`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async getDeploymentConfig(deploymentId: string): Promise<DeploymentConfig> {
    return this.cache.getOrFetch(deploymentId, () => this.fetchDeploymentConfig(deploymentId));
  }

  private async fetchDeploymentConfig(deploymentId: string): Promise<DeploymentConfig> {
    const timeoutMs = getVerumTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.apiUrl}/api/v1/deploy/${deploymentId}/config`, {
        headers: { "x-verum-api-key": this.apiKey },
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        res.body?.cancel();
        this.markDown(getVerumAuthCooldownMs(), `config auth error ${res.status}`);
        throw new VerumAuthError(res.status);
      }

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "30", 10);
        const retryMs = retryAfter * 1000;
        res.body?.cancel();
        this.markDown(retryMs, `config rate limited`);
        throw new VerumRateLimitError(retryMs);
      }

      if (!res.ok) {
        res.body?.cancel();
        this.markDown(getVerumFailureCooldownMs(), `config error ${res.status}`);
        throw new Error(`Verum config fetch failed: ${res.status}`);
      }

      const parsed = DeploymentConfigSchema.safeParse(await res.json());
      if (!parsed.success) {
        this.markDown(getVerumFailureCooldownMs(), `config schema invalid`);
        throw new VerumSchemaError(parsed.error.message);
      }
      return parsed.data;
    } catch (err) {
      if (
        err instanceof VerumAuthError ||
        err instanceof VerumRateLimitError ||
        err instanceof VerumSchemaError
      ) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        this.markDown(getVerumFailureCooldownMs(), `config timeout ${timeoutMs}ms`);
        throw new VerumTimeoutError(timeoutMs);
      }
      this.markDown(getVerumFailureCooldownMs(), `config network error`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 테스트 전용 — 서킷 브레이커 상태 초기화 */
  resetForTests(): void {
    this.down = false;
    this.downUntil = 0;
  }
}
