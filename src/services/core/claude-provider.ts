import { AIProvider } from "@/types/service";
import { getAnthropicApiKey, getClaudeBaseUrl, getClaudeModel, getAiTimeoutMs, getDefaultMaxTokens } from "@/lib/env";
import { withAbortTimeout, readSseLines } from "./http-utils";

/**
 * Claude API (Anthropic) — Grok API 장애 시 fallback provider
 * OpenAI 호환 API가 아니므로 Anthropic Messages API 사용
 */
export class ClaudeProvider implements AIProvider {
  private _apiKey: string | null = null;
  private _baseUrl: string | null = null;
  private _model: string | null = null;

  private get apiKey(): string {
    if (!this._apiKey) {
      const key = getAnthropicApiKey();
      if (!key) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
      this._apiKey = key;
    }
    return this._apiKey;
  }

  private get baseUrl(): string {
    if (!this._baseUrl) this._baseUrl = getClaudeBaseUrl();
    return this._baseUrl;
  }
// TODO: [Verum] Wrap this anthropic call (ClaudeProvider.generateReading) with VerumClient for A/B prompt optimization. See: https://verum.dev/docs/sdk-integration

  private get model(): string {
    if (!this._model) this._model = getClaudeModel();
    return this._model;
  }

  private get anthropicHeaders() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    } as const;
  }

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    return withAbortTimeout(async (signal) => {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.anthropicHeaders,
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens ?? getDefaultMaxTokens(),
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ClaudeProvider] API 오류 (${response.status}):`, errorBody);
        throw new Error(`Claude API 요청이 실패했습니다. (HTTP ${response.status})`);
      }
      const data = await response.json() as { content?: [{ text?: string }] };
// TODO: [Verum] Wrap this anthropic call (ClaudeProvider.streamReading) with VerumClient for A/B prompt optimization. See: https://verum.dev/docs/sdk-integration
      const content = data.content?.[0]?.text;
      if (!content) throw new Error("Claude API가 빈 응답을 반환했습니다.");
      return content;
    }, getAiTimeoutMs());
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), getAiTimeoutMs());
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.anthropicHeaders,
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens ?? getDefaultMaxTokens(),
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
      // Anthropic SSE: content_block_delta 이벤트에서 텍스트 추출
      yield* readSseLines(
        response,
        (p) => {
          const e = p as { type?: string; delta?: { text?: string } };
          return e.type === "content_block_delta" && e.delta?.text ? e.delta.text : null;
        },
        "Claude"
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
