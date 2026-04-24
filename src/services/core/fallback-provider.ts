import { AIProvider } from "@/types/service";
import { GrokProvider, RateLimitError, AuthError } from "./grok-provider";
import { ClaudeProvider } from "./claude-provider";
import { getAiFallbackCooldownMs, getAiAuthCooldownMs } from "@/lib/env";

/**
 * Fallback AI Provider — Grok API 우선, 실패 시 Claude API로 자동 전환
 *
 * - Grok 정상: Grok 사용
 * - Grok 장애 (500 등): Claude 전환 + 5분 쿨다운
 * - Grok Rate Limit (429): Claude 전환 + Retry-After 기반 쿨다운 (기본 30초)
 * - Grok 인증 실패 (401/403): Claude 전환 + 30분 쿨다운 (재시도 불가 에러)
 */

// 서킷브레이커 상태를 globalThis에 저장 — 서버리스 콜드 스타트로 인스턴스가 교체되어도 동일 Node 프로세스 내에서 상태 유지
const CIRCUIT_KEY = "__arcanaFallbackCircuit__";

interface CircuitState {
  grokDown: boolean;
  grokDownUntil: number;
}

function getCircuit(): CircuitState {
  const g = globalThis as Record<string, unknown>;
  if (!g[CIRCUIT_KEY]) {
    g[CIRCUIT_KEY] = { grokDown: false, grokDownUntil: 0 };
  }
  return g[CIRCUIT_KEY] as CircuitState;
}

/** 테스트 전용 리셋 — 프로덕션 코드에서 호출 금지 */
export function __resetFallbackCircuitForTests(): void {
  (globalThis as Record<string, unknown>)[CIRCUIT_KEY] = { grokDown: false, grokDownUntil: 0 };
}

export class FallbackProvider implements AIProvider {
  private grok: GrokProvider;
  private claude: ClaudeProvider | null = null;
  private static readonly COOLDOWN_MS = getAiFallbackCooldownMs(); // 기본 5분 (서버 에러)
  private static readonly AUTH_COOLDOWN_MS = getAiAuthCooldownMs(); // 기본 30분 (인증 에러, 재시도 불가)

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
    const circuit = getCircuit();
    if (!circuit.grokDown) return true;
    if (Date.now() > circuit.grokDownUntil) {
      circuit.grokDown = false;
      return true;
    }
    return false;
  }

  private markGrokDown(cooldownMs?: number, reason?: string): void {
    const circuit = getCircuit();
    circuit.grokDown = true;
    const duration = cooldownMs ?? FallbackProvider.COOLDOWN_MS;
    circuit.grokDownUntil = Date.now() + duration;
    const reasonText = reason || "에러";
    console.warn(`[FallbackProvider] Grok ${reasonText} → Claude 전환 (${Math.round(duration / 1000)}초 후 Grok 재시도)`);
  }

  private hasClaude(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generateReading(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    if (this.isGrokAvailable()) {
      try {
        return await this.grok.generateReading(systemPrompt, userPrompt, maxTokens);
      } catch (e) {
        console.error("[FallbackProvider] Grok generateReading 실패:", e);
        if (this.hasClaude()) {
          const cooldown = e instanceof AuthError ? FallbackProvider.AUTH_COOLDOWN_MS
            : e instanceof RateLimitError ? e.retryAfterMs : undefined;
          const reason = e instanceof AuthError ? "인증 실패 (401/403)"
            : e instanceof RateLimitError ? "Rate Limit (429)"
            : "서버 에러/네트워크";
          this.markGrokDown(cooldown, reason);
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
    if (this.isGrokAvailable()) {
      try {
        yield* this.grok.streamReading(systemPrompt, userPrompt, maxTokens);
        return;
      } catch (e) {
        console.error("[FallbackProvider] Grok streamReading 실패:", e);
        if (this.hasClaude()) {
          const cooldown = e instanceof AuthError ? FallbackProvider.AUTH_COOLDOWN_MS
            : e instanceof RateLimitError ? e.retryAfterMs : undefined;
          const reason = e instanceof AuthError ? "인증 실패 (401/403)"
            : e instanceof RateLimitError ? "Rate Limit (429)"
            : "서버 에러/네트워크";
          this.markGrokDown(cooldown, reason);
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
