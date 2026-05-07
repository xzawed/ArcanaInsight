import { AIProvider } from "@/types/service";
import { getGrokApiKey, getGrokModel, getGrokBaseUrl, getAiTimeoutMs, getDefaultMaxTokens, getAiTemperature, getGrokReasoningEffort } from "@/lib/env";
import { withAbortTimeout, readSseLines } from "./http-utils";

/**
 * reasoning_effort 옵션이 적용 가능한 Grok 모델 패밀리만 본문에 포함.
 * - grok-3-mini, grok-3-mini-fast: "low" | "high" 지원
 * - grok-4 (자동 reasoning): 미지원 (요청 시 400 또는 무시)
 * - grok-4-fast-non-reasoning: 미지원 (reasoning 자체 비활성)
 * 미지원 모델에는 옵션을 보내지 않아 400 차단을 회피.
 */
function buildReasoningOption(model: string): { reasoning_effort: string } | Record<string, never> {
  const m = model.toLowerCase();
  if (m.includes("non-reasoning")) return {};
  if (m.includes("grok-3-mini")) return { reasoning_effort: getGrokReasoningEffort() };
  // grok-3 (reasoning 가능 모델)도 reasoning_effort 시도 — xAI가 무시해도 안전
  if (m === "grok-3" || m.startsWith("grok-3-")) return { reasoning_effort: getGrokReasoningEffort() };
  return {};
}

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
  private _baseUrl: string | null = null;

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
    if (!this._model) this._model = getGrokModel();
    return this._model;
  }

  private get baseUrl(): string {
    if (!this._baseUrl) this._baseUrl = getGrokBaseUrl();
    return this._baseUrl;
  }

  private handleErrorResponse(response: Response): Promise<never> {
    if (response.status === 401 || response.status === 403) {
      return response.text().then((e) => { throw new AuthError(response.status, e); });
    }
    if (response.status === 429) {
      const raw = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
      const retryAfter = (Number.isNaN(raw) ? DEFAULT_RETRY_AFTER_SEC : raw) * 1000;
      return Promise.reject(new RateLimitError(retryAfter));
    }
    return response.text().then((e) => { throw new Error(`Grok API error (${response.status}): ${e}`); });
  }

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    return withAbortTimeout(async (signal) => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: getAiTemperature(), max_tokens: maxTokens ?? getDefaultMaxTokens(),
          ...buildReasoningOption(this.model),
        }),
        signal,
      });
      if (!response.ok) return this.handleErrorResponse(response);
      const data = await response.json() as { choices?: [{ message?: { content?: string } }] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Grok API가 빈 응답을 반환했습니다.");
      return content;
    }, getAiTimeoutMs());
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), getAiTimeoutMs());
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: getAiTemperature(), max_tokens: maxTokens ?? getDefaultMaxTokens(), stream: true,
          ...buildReasoningOption(this.model),
        }),
        signal: controller.signal,
      });
      if (!response.ok) { await this.handleErrorResponse(response); return; }
      // reasoning 모델이 reasoning_content 채널로만 응답하고 content는 비어있는 경우를 감지하기 위해
      // yield 횟수를 추적. 0회면 throw → FallbackProvider가 Claude로 전환할 수 있도록.
      let yielded = 0;
      for await (const chunk of readSseLines(
        response,
        (p) => (p as { choices?: [{ delta?: { content?: string } }] }).choices?.[0]?.delta?.content ?? null,
        "Grok",
        controller.signal
      )) {
        yielded++;
        yield chunk;
      }
      if (yielded === 0) throw new Error("Grok API가 빈 응답을 반환했습니다 (reasoning 토큰만 소비됨 가능성).");
    } finally {
      clearTimeout(timer);
    }
  }
}
