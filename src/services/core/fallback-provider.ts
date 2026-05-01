import "@verum/sdk/openai";
import { AIProvider } from "@/types/service";
import { GrokProvider, RateLimitError, AuthError } from "./grok-provider";
import { ClaudeProvider } from "./claude-provider";
import { getAiFallbackCooldownMs, getAiAuthCooldownMs } from "@/lib/env";
import { CircuitBreaker } from "./circuit-breaker";

/**
 * Fallback AI Provider — Grok API 우선, 실패 시 Claude API로 자동 전환
 *
 * - Grok 정상: Grok 사용
 * - Grok 장애 (500 등): Claude 전환 + 5분 쿨다운
 * - Grok Rate Limit (429): Claude 전환 + Retry-After 기반 쿨다운 (기본 30초)
 * - Grok 인증 실패 (401/403): Claude 전환 + 30분 쿨다운 (재시도 불가 에러)
 */

// globalThis 키로 서킷 상태 공유 — 서버리스 warm 인스턴스 교체 대응
const grokCircuit = new CircuitBreaker({ prefix: "FallbackProvider/Grok", globalKey: "__arcanaFallbackCircuit__" });

/** 테스트 전용 리셋 — 프로덕션 코드에서 호출 금지 */
export function __resetFallbackCircuitForTests(): void {
  grokCircuit.resetForTests();
}

export class FallbackProvider implements AIProvider {
  private grok: GrokProvider;
  private claude: ClaudeProvider | null = null;
  private static readonly COOLDOWN_MS = getAiFallbackCooldownMs();
  private static readonly AUTH_COOLDOWN_MS = getAiAuthCooldownMs();

  constructor() {
    this.grok = new GrokProvider();
  }

  private getClaude(): ClaudeProvider {
    if (!this.claude) this.claude = new ClaudeProvider();
    return this.claude;
  }

  private hasClaude(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private handleGrokError(e: unknown): void {
    const cooldown = e instanceof AuthError ? FallbackProvider.AUTH_COOLDOWN_MS
      : e instanceof RateLimitError ? e.retryAfterMs
      : FallbackProvider.COOLDOWN_MS;
    const reason = e instanceof AuthError ? "인증 실패 (401/403)"
      : e instanceof RateLimitError ? "Rate Limit (429)"
      : "서버 에러/네트워크";
    grokCircuit.markDown(cooldown, reason);
  }

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    if (grokCircuit.isAvailable()) {
      try {
        return await this.grok.generateReading(systemPrompt, userPrompt, maxTokens);
      } catch (e) {
        console.error("[FallbackProvider] Grok generateReading 실패:", e);
        if (this.hasClaude()) {
          this.handleGrokError(e);
        } else {
          throw e;
        }
      }
    }
    console.debug("[FallbackProvider] Claude API로 generateReading 실행");
    try {
      return await this.getClaude().generateReading(systemPrompt, userPrompt, maxTokens);
    } catch (claudeError) {
      console.error("[FallbackProvider] Claude generateReading도 실패:", claudeError);
      throw new Error("AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  async *streamReading(systemPrompt: string, userPrompt: string, maxTokens?: number): AsyncGenerator<string, void, unknown> {
    if (grokCircuit.isAvailable()) {
      let hasYielded = false;
      try {
        for await (const chunk of this.grok.streamReading(systemPrompt, userPrompt, maxTokens)) {
          hasYielded = true;
          yield chunk;
        }
        return;
      } catch (e) {
        console.error("[FallbackProvider] Grok streamReading 실패:", e);
        if (hasYielded) throw e;
        if (this.hasClaude()) {
          this.handleGrokError(e);
        } else {
          throw e;
        }
      }
    }
    console.debug("[FallbackProvider] Claude API로 streamReading 실행");
    try {
      yield* this.getClaude().streamReading(systemPrompt, userPrompt, maxTokens);
    } catch (claudeError) {
      console.error("[FallbackProvider] Claude streamReading도 실패:", claudeError);
      throw new Error("AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }
  }
}
