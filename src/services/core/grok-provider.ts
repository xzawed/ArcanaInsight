import { AIProvider } from "@/types/service";
import { getGrokApiKey, getGrokModel, getGrokBaseUrl, getAiTimeoutMs, getDefaultMaxTokens, getAiTemperature } from "@/lib/env";

/** Grok API Rate Limit (429) — Retry-After 기반 짧은 쿨다운 */
export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfter: number) {
    super(`Grok API rate limit (429) — retry after ${retryAfter}ms`);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfter;
  }
}

/** API 인증 실패 (401/403) — 재시도 불가, 장기 쿨다운 적용 */
export class AuthError extends Error {
  constructor(status: number, detail: string) {
    super(`Grok API auth error (${status}): ${detail}`);
    this.name = "AuthError";
  }
}

/** Retry-After 기본값 (초) — 헤더 미포함 시 사용 */
const DEFAULT_RETRY_AFTER_SEC = 30;

export class GrokProvider implements AIProvider {
  private _apiKey: string | null = null;
  private _model: string | null = null;
  private baseUrl = getGrokBaseUrl();

  /** 환경변수를 지연 로드 — 모듈 로드 시점이 아니라 첫 호출 시점에 확인 */
  private get apiKey(): string {
    if (!this._apiKey) {
      const key = getGrokApiKey();
      if (!key || key === "your_grok_api_key") {
        throw new Error("GROK_API_KEY 환경변수가 설정되지 않았습니다. Railway 또는 .env.local에 실제 API 키를 설정해주세요.");
      }
      this._apiKey = key;
    }
    return this._apiKey;
  }

  private get model(): string {
    if (!this._model) {
      this._model = getGrokModel();
    }
    return this._model;
  }

  private static readonly TIMEOUT_MS = getAiTimeoutMs();

  private static readonly DEFAULT_MAX_TOKENS = getDefaultMaxTokens();

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GrokProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: getAiTemperature(), max_tokens: maxTokens ?? GrokProvider.DEFAULT_MAX_TOKENS,
        }),
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        const error = await response.text();
        throw new AuthError(response.status, error);
      }
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") ?? String(DEFAULT_RETRY_AFTER_SEC), 10) * 1000;
        throw new RateLimitError(retryAfter);
      }
      if (!response.ok) { const error = await response.text(); throw new Error(`Grok API error (${response.status}): ${error}`); }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Grok API가 빈 응답을 반환했습니다.");
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GrokProvider.TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: getAiTemperature(), max_tokens: maxTokens ?? GrokProvider.DEFAULT_MAX_TOKENS, stream: true,
        }),
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        const error = await response.text();
        throw new AuthError(response.status, error);
      }
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") ?? String(DEFAULT_RETRY_AFTER_SEC), 10) * 1000;
        throw new RateLimitError(retryAfter);
      }
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
          } catch (e) { console.warn("Grok SSE 청크 파싱 실패:", data.slice(0, 100), e); }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
