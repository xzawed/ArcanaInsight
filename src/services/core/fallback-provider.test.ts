import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// GrokProvider, ClaudeProvider 모킹
vi.mock("./grok-provider", () => ({
  GrokProvider: vi.fn(),
  RateLimitError: class extends Error {
    constructor(public retryAfterMs: number) {
      super("rate limit");
    }
  },
  AuthError: class extends Error {
    constructor() {
      super("auth error");
    }
  },
}));

vi.mock("./claude-provider", () => ({
  ClaudeProvider: vi.fn(),
}));

import { FallbackProvider, __resetFallbackCircuitForTests } from "./fallback-provider";
import { GrokProvider } from "./grok-provider";
import { ClaudeProvider } from "./claude-provider";

// 모킹된 생성자 타입
const MockGrokProvider = GrokProvider as unknown as ReturnType<typeof vi.fn>;
const MockClaudeProvider = ClaudeProvider as unknown as ReturnType<typeof vi.fn>;

/** AsyncGenerator를 배열로 수집하는 헬퍼 */
async function collectStream(gen: AsyncGenerator<string, void, unknown>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

/** 주어진 청크를 순서대로 yield하는 AsyncGenerator 팩토리 */
async function* makeStream(chunks: string[]): AsyncGenerator<string, void, unknown> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

/** 청크를 일부 yield 후 throw하는 Grok 부분 스트림 시뮬레이터 */
async function* makePartialThenFailStream(chunks: string[], errorMsg: string): AsyncGenerator<string, void, unknown> {
  for (const chunk of chunks) yield chunk;
  throw new Error(errorMsg);
}

describe("FallbackProvider", () => {
  let mockGrokInstance: {
    generateReading: ReturnType<typeof vi.fn>;
    streamReading: ReturnType<typeof vi.fn>;
  };
  let mockClaudeInstance: {
    generateReading: ReturnType<typeof vi.fn>;
    streamReading: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    __resetFallbackCircuitForTests();
    vi.useFakeTimers();

    mockGrokInstance = {
      generateReading: vi.fn(),
      streamReading: vi.fn(),
    };
    mockClaudeInstance = {
      generateReading: vi.fn(),
      streamReading: vi.fn(),
    };

    MockGrokProvider.mockImplementation(() => mockGrokInstance);
    MockClaudeProvider.mockImplementation(() => mockClaudeInstance);

    // ANTHROPIC_API_KEY 기본 설정 (vitest.setup.ts에서 이미 설정되어 있음)
    process.env.ANTHROPIC_API_KEY = "test-claude-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ─── generateReading ───────────────────────────────────────────────────────

  describe("generateReading — Grok 정상 동작", () => {
    it("Grok가 성공하면 Grok 결과를 반환한다", async () => {
      mockGrokInstance.generateReading.mockResolvedValue("Grok 리딩 결과");

      const provider = new FallbackProvider();
      const result = await provider.generateReading("시스템 프롬프트", "유저 프롬프트");

      expect(result).toBe("Grok 리딩 결과");
      expect(mockGrokInstance.generateReading).toHaveBeenCalledOnce();
      expect(mockClaudeInstance.generateReading).not.toHaveBeenCalled();
    });
  });

  describe("generateReading — Grok 실패 → Claude fallback", () => {
    it("Grok가 일반 Error를 던지면 Claude로 전환한다", async () => {
      mockGrokInstance.generateReading.mockRejectedValue(new Error("서버 에러"));
      mockClaudeInstance.generateReading.mockResolvedValue("Claude 리딩 결과");

      const provider = new FallbackProvider();
      const result = await provider.generateReading("시스템 프롬프트", "유저 프롬프트");

      expect(result).toBe("Claude 리딩 결과");
      expect(mockClaudeInstance.generateReading).toHaveBeenCalledOnce();
    });
  });

  describe("generateReading — Grok RateLimitError → 쿨다운", () => {
    it("RateLimitError 시 grokDown=true 설정 및 retryAfterMs 기반 쿨다운이 적용된다", async () => {
      const retryAfterMs = 5000;
      const { RateLimitError: MockRateLimitError } = await import("./grok-provider");
      mockGrokInstance.generateReading.mockRejectedValue(new MockRateLimitError(retryAfterMs));
      mockClaudeInstance.generateReading.mockResolvedValue("Claude fallback");

      const provider = new FallbackProvider();
      await provider.generateReading("s", "u");

      // 두 번째 호출 — 쿨다운 중이므로 Grok를 호출하지 않고 Claude로 직행
      await provider.generateReading("s", "u");

      expect(mockGrokInstance.generateReading).toHaveBeenCalledOnce(); // 최초 1회만
      expect(mockClaudeInstance.generateReading).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateReading — Grok AuthError → 긴 쿨다운", () => {
    it("AuthError 시 AUTH_COOLDOWN_MS(30분) 쿨다운 후에도 Grok를 우회한다", async () => {
      const { AuthError: MockAuthError } = await import("./grok-provider");
      mockGrokInstance.generateReading.mockRejectedValue(new MockAuthError(401, "unauthorized"));
      mockClaudeInstance.generateReading.mockResolvedValue("Claude fallback");

      const provider = new FallbackProvider();
      await provider.generateReading("s", "u");

      // 15분 경과 (30분 쿨다운 미만)
      vi.setSystemTime(Date.now() + 15 * 60 * 1000);
      await provider.generateReading("s", "u");

      expect(mockGrokInstance.generateReading).toHaveBeenCalledOnce(); // 여전히 1회
      expect(mockClaudeInstance.generateReading).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateReading — ANTHROPIC_API_KEY 미설정 + Grok 실패", () => {
    it("Claude 키 없이 Grok가 실패하면 원래 에러를 throw한다", async () => {
      process.env.ANTHROPIC_API_KEY = "";
      const originalError = new Error("Grok 완전 실패");
      mockGrokInstance.generateReading.mockRejectedValue(originalError);

      const provider = new FallbackProvider();
      await expect(provider.generateReading("s", "u")).rejects.toThrow("Grok 완전 실패");
      expect(mockClaudeInstance.generateReading).not.toHaveBeenCalled();
    });
  });

  describe("generateReading — 쿨다운 중 Grok 우회", () => {
    it("grokDownUntil이 현재 시간보다 미래이면 Claude를 바로 사용한다", async () => {
      mockGrokInstance.generateReading
        .mockRejectedValueOnce(new Error("첫 번째 실패"))
        .mockResolvedValue("Grok 복구");
      mockClaudeInstance.generateReading.mockResolvedValue("Claude 응답");

      const provider = new FallbackProvider();
      // 첫 번째 호출로 쿨다운 시작
      await provider.generateReading("s", "u");

      // 쿨다운 만료 전 재호출
      const result = await provider.generateReading("s", "u");
      expect(result).toBe("Claude 응답");
      // Grok는 처음 1회만 호출됨
      expect(mockGrokInstance.generateReading).toHaveBeenCalledOnce();
    });
  });

  describe("generateReading — 쿨다운 만료 후 Grok 재시도", () => {
    it("쿨다운 시간이 지나면 Grok를 다시 시도한다", async () => {
      mockGrokInstance.generateReading
        .mockRejectedValueOnce(new Error("첫 번째 실패"))
        .mockResolvedValue("Grok 복구 성공");
      mockClaudeInstance.generateReading.mockResolvedValue("Claude");

      const provider = new FallbackProvider();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // 첫 번째 호출 — Grok 실패 → Claude 응답
      await provider.generateReading("s", "u");

      // 기본 쿨다운(5분) 경과
      vi.setSystemTime(startTime + 5 * 60 * 1000 + 1);

      const result = await provider.generateReading("s", "u");
      expect(result).toBe("Grok 복구 성공");
      expect(mockGrokInstance.generateReading).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateReading — Grok + Claude 둘 다 실패", () => {
    it('"AI 서비스가 일시적으로 사용할 수 없습니다" 에러를 던진다', async () => {
      mockGrokInstance.generateReading.mockRejectedValue(new Error("Grok 실패"));
      mockClaudeInstance.generateReading.mockRejectedValue(new Error("Claude 실패"));

      const provider = new FallbackProvider();
      await expect(provider.generateReading("s", "u")).rejects.toThrow(
        "AI 서비스가 일시적으로 사용할 수 없습니다"
      );
    });
  });

  // ─── streamReading ─────────────────────────────────────────────────────────

  describe("streamReading — Grok 정상 동작", () => {
    it("Grok 스트림이 정상이면 Grok 청크를 반환한다", async () => {
      const chunks = ["청크1", "청크2", "청크3"];
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(makeStream(chunks));

      const provider = new FallbackProvider();
      const result = await collectStream(provider.streamReading("s", "u"));

      expect(result).toEqual(chunks);
      expect(mockClaudeInstance.streamReading).not.toHaveBeenCalled();
    });
  });

  describe("streamReading — Grok 실패 → Claude fallback", () => {
    it("Grok 스트림이 실패하면 Claude 스트림으로 전환한다", async () => {
      // Grok stream: 에러를 throw하는 AsyncGenerator
      async function* failingStream(): AsyncGenerator<string, void, unknown> {
        throw new Error("스트림 에러");
      }
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(failingStream());

      const claudeChunks = ["Claude 청크1", "Claude 청크2"];
      mockClaudeInstance.streamReading = vi.fn().mockReturnValue(makeStream(claudeChunks));

      const provider = new FallbackProvider();
      const result = await collectStream(provider.streamReading("s", "u"));

      expect(result).toEqual(claudeChunks);
    });
  });

  describe("streamReading — Grok + Claude 둘 다 실패", () => {
    it('"AI 서비스가 일시적으로 사용할 수 없습니다" 에러를 던진다', async () => {
      async function* failingStream(): AsyncGenerator<string, void, unknown> {
        throw new Error("스트림 에러");
      }
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(failingStream());
      async function* failingClaudeStream(): AsyncGenerator<string, void, unknown> {
        throw new Error("Claude 스트림 에러");
      }
      mockClaudeInstance.streamReading = vi.fn().mockReturnValue(failingClaudeStream());

      const provider = new FallbackProvider();
      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow(
        "AI 서비스가 일시적으로 사용할 수 없습니다"
      );
    });
  });

  // ─── 크로스 인스턴스 상태 공유 ──────────────────────────────────────────────

  describe("globalThis 상태 공유 — 서버리스 인스턴스 재생성 대응", () => {
    it("인스턴스1에서 Grok가 다운되면 인스턴스2도 즉시 Claude를 사용한다", async () => {
      mockGrokInstance.generateReading.mockRejectedValueOnce(new Error("Grok 장애"));
      mockClaudeInstance.generateReading.mockResolvedValue("Claude 응답");

      const provider1 = new FallbackProvider();
      await provider1.generateReading("s", "u"); // Grok 실패 → grokDown=true (globalThis)

      // 새 인스턴스 — 이미 globalThis에 grokDown=true이므로 Grok 호출 없이 Claude 직행
      const provider2 = new FallbackProvider();
      const result = await provider2.generateReading("s", "u");

      expect(result).toBe("Claude 응답");
      expect(mockGrokInstance.generateReading).toHaveBeenCalledOnce(); // provider1에서 1회만
      expect(mockClaudeInstance.generateReading).toHaveBeenCalledTimes(2);
    });
  });

  // ─── streamReading — ANTHROPIC_API_KEY 미설정 + Grok 실패 ─────────────────

  describe("streamReading — ANTHROPIC_API_KEY 미설정 + Grok 실패", () => {
    it("Claude 키 없이 Grok 스트림이 실패하면 원래 에러를 throw한다", async () => {
      process.env.ANTHROPIC_API_KEY = "";
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(makePartialThenFailStream([], "Grok 스트림 에러"));

      const provider = new FallbackProvider();
      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow("Grok 스트림 에러");
      expect(mockClaudeInstance.streamReading).not.toHaveBeenCalled();
    });
  });

  // ─── streamReading — 부분 yield 후 throw → Claude fallback 차단 ──────────

  describe("streamReading — 부분 yield 후 Grok throw → Claude fallback 차단", () => {
    it("Grok가 청크를 일부 yield한 뒤 throw하면 Claude로 fallback하지 않는다", async () => {
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(
        makePartialThenFailStream(["청크1", "청크2"], "중간에 스트림 끊김")
      );
      mockClaudeInstance.streamReading = vi.fn().mockReturnValue(makeStream(["Claude 청크"]));

      const provider = new FallbackProvider();
      await expect(collectStream(provider.streamReading("s", "u"))).rejects.toThrow("중간에 스트림 끊김");
      expect(mockClaudeInstance.streamReading).not.toHaveBeenCalled();
    });

    it("Grok가 청크를 yield하지 않고 즉시 throw하면 Claude로 fallback된다", async () => {
      mockGrokInstance.streamReading = vi.fn().mockReturnValue(makePartialThenFailStream([], "즉시 실패"));
      mockClaudeInstance.streamReading = vi.fn().mockReturnValue(makeStream(["Claude 응답"]));

      const provider = new FallbackProvider();
      const result = await collectStream(provider.streamReading("s", "u"));
      expect(result).toEqual(["Claude 응답"]);
      expect(mockClaudeInstance.streamReading).toHaveBeenCalledOnce();
    });
  });
});
