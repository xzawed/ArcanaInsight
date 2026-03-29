import { AIProvider } from "@/types/service";

export class GrokProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.x.ai/v1";

  constructor() {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) throw new Error("GROK_API_KEY environment variable is required");
    this.apiKey = apiKey;
    this.model = process.env.GROK_MODEL || "grok-3";
  }

  async generateReading(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.8, max_tokens: 2000,
      }),
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`Grok API error (${response.status}): ${error}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async *streamReading(systemPrompt: string, userPrompt: string): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.8, max_tokens: 2000, stream: true,
      }),
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`Grok API error (${response.status}): ${error}`); }
    const reader = response.body!.getReader();
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
        } catch { /* skip malformed chunks */ }
      }
    }
  }
}
