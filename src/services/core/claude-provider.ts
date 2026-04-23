import { AIProvider } from "@/types/service";
import { getAnthropicApiKey, getClaudeBaseUrl, getClaudeModel, getAiTimeoutMs, getDefaultMaxTokens } from "@/lib/env";

/**
 * Claude API (Anthropic) — Grok API 장애 시 fallback provider
 * OpenAI 호환 API가 아니므로 Anthropic Messages API 사용
 */
export class ClaudeProvider implements AIProvider {
  private _apiKey: string | null = null;
  private baseUrl = getClaudeBaseUrl();
  private model = getClaudeModel();
  private static readonly TIMEOUT_MS = getAiTimeoutMs();

  private get apiKey(): string {
    if (!this._apiKey) {
      const key = getAnthropicApiKey();
      if (!key) {
        throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
      }
      this._apiKey = key;
    }
    return this._apiKey;
  }

  private static readonly DEFAULT_MAX_TOKENS = getDefaultMaxTokens();

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ClaudeProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens ?? ClaudeProvider.DEFAULT_MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ClaudeProvider] API 오류 (${response.status}):`, errorBody);
        throw new Error(`Claude API 요청이 실패했습니다. (HTTP ${response.status})`);
      }
      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (!content) throw new Error("Claude API가 빈 응답을 반환했습니다.");
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ClaudeProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens ?? ClaudeProvider.DEFAULT_MAX_TOKENS,
          stream: true,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ClaudeProvider] 스트림 API 오류 (${response.status}):`, errorBody);
        throw new Error(`Claude API 요청이 실패했습니다. (HTTP ${response.status})`);
      }
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
            // Anthropic SSE: content_block_delta 이벤트에서 텍스트 추출
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch (e) { console.warn("Claude SSE 파싱 실패:", e); }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
