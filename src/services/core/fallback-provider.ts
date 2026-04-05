import { AIProvider } from "@/types/service";
import { GrokProvider, RateLimitError } from "./grok-provider";
import { ClaudeProvider } from "./claude-provider";

/**
 * Fallback AI Provider — Grok API 우선, 실패 시 Claude API로 자동 전환
 *
 * - Grok 정상: Grok 사용
 * - Grok 장애 (500 등): Claude 전환 + 5분 쿨다운
 * - Grok Rate Limit (429): Claude 전환 + Retry-After 헤더 기반 쿨다운 (기본 30초)
 */
export class FallbackProvider implements AIProvider {
  private grok: GrokProvider;
  private claude: ClaudeProvider | null = null;
  private grokDown = false;
  private grokDownUntil = 0;
  private static readonly COOLDOWN_MS = 5 * 60 * 1000; // 5분

  constructor() {
    this.grok = new GrokProvider();
  }

  private getClaude(): ClaudeProvider {
    if (!this.claude) {
      this.claude = new ClaudeProvider();
    }
    return this.claude;
  }

  private isGrokAvailable(): boolean {
    if (!this.grokDown) return true;
    if (Date.now() > this.grokDownUntil) {
      this.grokDown = false;
      return true;
    }
    return false;
  }

  private markGrokDown(cooldownMs?: number): void {
    this.grokDown = true;
    const duration = cooldownMs ?? FallbackProvider.COOLDOWN_MS;
    this.grokDownUntil = Date.now() + duration;
    console.warn(`[FallbackProvider] Grok API 사용 불가 → Claude로 전환 (${Math.round(duration / 1000)}초 후 Grok 재시도)`);
  }

  private hasClaude(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generateReading(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.isGrokAvailable()) {
      try {
        return await this.grok.generateReading(systemPrompt, userPrompt);
      } catch (e) {
        console.error("[FallbackProvider] Grok generateReading 실패:", e);
        if (this.hasClaude()) {
          const cooldown = e instanceof RateLimitError ? e.retryAfterMs : undefined;
          this.markGrokDown(cooldown);
        } else {
          throw e;
        }
      }
    }
    console.log("[FallbackProvider] Claude API로 generateReading 실행");
    return this.getClaude().generateReading(systemPrompt, userPrompt);
  }

  async *streamReading(systemPrompt: string, userPrompt: string): AsyncGenerator<string, void, unknown> {
    if (this.isGrokAvailable()) {
      try {
        yield* this.grok.streamReading(systemPrompt, userPrompt);
        return;
      } catch (e) {
        console.error("[FallbackProvider] Grok streamReading 실패:", e);
        if (this.hasClaude()) {
          const cooldown = e instanceof RateLimitError ? e.retryAfterMs : undefined;
          this.markGrokDown(cooldown);
        } else {
          throw e;
        }
      }
    }
    console.log("[FallbackProvider] Claude API로 streamReading 실행");
    yield* this.getClaude().streamReading(systemPrompt, userPrompt);
  }
}
