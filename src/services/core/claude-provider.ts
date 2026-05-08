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
      const content = data.content?.[0]?.text;
      if (!content) throw new Error("Claude API가 빈 응답을 반환했습니다.");
      return content;
    }, getAiTimeoutMs());
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), getAiTimeoutMs());
    const effectiveMaxTokens = maxTokens ?? getDefaultMaxTokens();
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.anthropicHeaders,
        body: JSON.stringify({
          model: this.model,
          max_tokens: effectiveMaxTokens,
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
      // Anthropic SSE: content_block_delta(텍스트) + message_delta(stop_reason+usage) 캡처
      // closure 내 할당은 TS control-flow narrowing 대상이 아니므로 ref 객체로 wrap (never 좁힘 회피)
      const ref: { yielded: number; firstChunkAt: number | null; stopReason: string | null; outputTokens: number | null } = {
        yielded: 0, firstChunkAt: null, stopReason: null, outputTokens: null,
      };
      for await (const chunk of readSseLines(
        response,
        (p) => {
          const e = p as { type?: string; delta?: { text?: string; stop_reason?: string }; usage?: { output_tokens?: number } };
          if (e.type === "message_delta") {
            if (e.delta?.stop_reason) ref.stopReason = e.delta.stop_reason;
            if (typeof e.usage?.output_tokens === "number") ref.outputTokens = e.usage.output_tokens;
          }
          return e.type === "content_block_delta" && e.delta?.text ? e.delta.text : null;
        },
        "Claude"
      )) {
        if (ref.firstChunkAt === null) ref.firstChunkAt = Date.now();
        ref.yielded++;
        yield chunk;
      }
      const totalMs = Date.now() - startedAt;
      const ttfbMs = ref.firstChunkAt !== null ? ref.firstChunkAt - startedAt : null;
      console.log(`[Claude] stream done — chunks=${ref.yielded} ttfb=${ttfbMs}ms total=${totalMs}ms stop=${ref.stopReason ?? "?"} max_tokens=${effectiveMaxTokens} output_tokens=${ref.outputTokens ?? "?"}`);
      if (ref.stopReason === "max_tokens") {
        console.warn(`[Claude] ⚠️ TRUNCATED: max_tokens(${effectiveMaxTokens}) 초과로 본문 잘림 — output_tokens=${ref.outputTokens ?? "?"}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
