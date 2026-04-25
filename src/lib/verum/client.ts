interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResult {
  messages: ChatMessage[];
  routed_to: "variant" | "baseline";
  deployment_id: string;
}

interface RecordParams {
  deploymentId: string;
  variant: "variant" | "baseline";
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export class VerumClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(opts: { apiUrl: string; apiKey: string }) {
    this.apiUrl = opts.apiUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    deploymentId?: string,
  ): Promise<ChatResult> {
    if (!this.apiUrl || !this.apiKey || !deploymentId) {
      return { messages, routed_to: "baseline", deployment_id: deploymentId ?? "" };
    }
    const res = await fetch(`${this.apiUrl}/api/v1/sdk/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ messages, deployment_id: deploymentId }),
    });
    if (!res.ok) {
      throw new Error(`Verum API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<ChatResult>;
  }

  async record(params: RecordParams): Promise<string> {
    const res = await fetch(`${this.apiUrl}/api/v1/sdk/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        deployment_id: params.deploymentId,
        variant: params.variant,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        latency_ms: params.latencyMs,
      }),
    });
    if (!res.ok) throw new Error(`Verum record error: ${res.status}`);
    const data = await res.json() as { trace_id: string };
    return data.trace_id;
  }
}

