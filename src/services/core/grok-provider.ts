import { AIProvider } from "@/types/service";

export class GrokProvider implements AIProvider {
  private _apiKey: string | null = null;
  private _model: string | null = null;
  private baseUrl = "https://api.x.ai/v1";

  /** 환경변수를 지연 로드 — 모듈 로드 시점이 아니라 첫 호출 시점에 확인 */
  private get apiKey(): string {
    if (!this._apiKey) {
      const key = process.env.GROK_API_KEY;
      if (!key) throw new Error("GROK_API_KEY environment variable is required");
      this._apiKey = key;
    }
    return this._apiKey;
  }

  private get model(): string {
    if (!this._model) {
      this._model = process.env.GROK_MODEL || "grok-3";
    }
    return this._model;
  }

  private static readonly TIMEOUT_MS = 60_000; // 60초 타임아웃

  async generateReading(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GrokProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7, max_tokens: 2000,
        }),
        signal: controller.signal,
      });
      if (!response.ok) { const error = await response.text(); throw new Error(`Grok API error (${response.status}): ${error}`); }
      const data = await response.json();
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamReading(systemPrompt: string, userPrompt: string): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GrokProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7, max_tokens: 2000, stream: true,
        }),
        signal: controller.signal,
      });
      if (!response.ok) { const error = await response.text(); throw new Error(`Grok API error (${response.status}): ${error}`); }
      if (!response.body) throw new Error("Response body is null");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip malformed SSE chunk */ }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
