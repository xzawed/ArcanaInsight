import { AIProvider } from "@/types/service";
import { GrokProvider } from "./grok-provider";
import { ClaudeProvider } from "./claude-provider";

/**
 * Fallback AI Provider — Grok API 우선, 실패 시 Claude API로 자동 전환
 *
 * 헬스체크 결과를 캐시하여 반복 실패를 방지:
 * - Grok 정상: Grok 사용
 * - Grok 장애: Claude로 전환 + 5분간 Grok 스킵 (불필요한 타임아웃 방지)
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

  private markGrokDown(): void {
    this.grokDown = true;
    this.grokDownUntil = Date.now() + FallbackProvider.COOLDOWN_MS;
    console.warn(`[FallbackProvider] Grok API 장애 감지 → Claude로 전환 (${new Date(this.grokDownUntil).toLocaleTimeString()}까지)`);
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
          this.markGrokDown();
        } else {
          throw e; // Claude 없으면 원래 에러 그대로 전파
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
          this.markGrokDown();
        } else {
          throw e;
        }
      }
    }
    console.log("[FallbackProvider] Claude API로 streamReading 실행");
    yield* this.getClaude().streamReading(systemPrompt, userPrompt);
  }
}
