import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getGrokApiKey,
  getGrokModel,
  getAnthropicApiKey,
  getClaudeModel,
  getClaudeBaseUrl,
  getGrokBaseUrl,
  getAiTimeoutMs,
  getDefaultMaxTokens,
  getAiTemperature,
  getAiFallbackCooldownMs,
  getAiAuthCooldownMs,
  getPostgresPoolSize,
  getPostgresUrl,
  getUpstashRedisRestToken,
} from "./env";

/** 각 테스트 전 관련 env 키를 모두 제거하고, 종료 후 복원 */
type EnvSnapshot = Record<string, string | undefined>;

const ENV_KEYS = [
  "GROK_API_KEY",
  "GROK_MODEL",
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "CLAUDE_BASE_URL",
  "GROK_BASE_URL",
  "AI_TIMEOUT_MS",
  "AI_DEFAULT_MAX_TOKENS",
  "AI_TEMPERATURE",
  "AI_FALLBACK_COOLDOWN_MS",
  "AI_AUTH_COOLDOWN_MS",
  "POSTGRES_POOL_SIZE",
  "POSTGRES_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

let snapshot: EnvSnapshot = {};

beforeEach(() => {
  // 현재 값 스냅샷 저장 후 제거
  snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  // 원래 값 복원
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
});

// ─────────────────────────── 문자열 반환 함수 ───────────────────────────

describe("getGrokApiKey", () => {
  it("env 미설정 시 빈 문자열을 반환한다", () => {
    expect(getGrokApiKey()).toBe("");
  });

  it("env 설정 시 해당 값을 반환한다", () => {
    process.env.GROK_API_KEY = "my-grok-key";
    expect(getGrokApiKey()).toBe("my-grok-key");
  });
});

describe("getGrokModel", () => {
  it("env 미설정 시 기본값 'grok-3'을 반환한다", () => {
    expect(getGrokModel()).toBe("grok-3");
  });

  it("env 설정 시 해당 값을 반환한다", () => {
    process.env.GROK_MODEL = "grok-3-mini";
    expect(getGrokModel()).toBe("grok-3-mini");
  });
});

describe("getAnthropicApiKey", () => {
  it("env 미설정 시 빈 문자열을 반환한다", () => {
    expect(getAnthropicApiKey()).toBe("");
  });

  it("env 설정 시 해당 값을 반환한다", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getAnthropicApiKey()).toBe("sk-ant-test");
  });
});

describe("getClaudeModel", () => {
  it("env 미설정 시 기본값 'claude-opus-4-7'을 반환한다", () => {
    expect(getClaudeModel()).toBe("claude-opus-4-7");
  });

  it("env 설정 시 해당 값을 반환한다", () => {
    process.env.CLAUDE_MODEL = "claude-opus-4-20250514";
    expect(getClaudeModel()).toBe("claude-opus-4-20250514");
  });
});

describe("getClaudeBaseUrl", () => {
  it("env 미설정 시 기본값 Anthropic API URL을 반환한다", () => {
    expect(getClaudeBaseUrl()).toBe("https://api.anthropic.com/v1");
  });

  it("env 설정 시 해당 URL을 반환한다", () => {
    process.env.CLAUDE_BASE_URL = "https://custom.proxy.com/v1";
    expect(getClaudeBaseUrl()).toBe("https://custom.proxy.com/v1");
  });
});

describe("getGrokBaseUrl", () => {
  it("env 미설정 시 기본값 xAI API URL을 반환한다", () => {
    expect(getGrokBaseUrl()).toBe("https://api.x.ai/v1");
  });

  it("env 설정 시 해당 URL을 반환한다", () => {
    process.env.GROK_BASE_URL = "https://custom-grok.example.com/v1";
    expect(getGrokBaseUrl()).toBe("https://custom-grok.example.com/v1");
  });
});

// ─────────────────────────── 숫자 반환 함수 ───────────────────────────

describe("getAiTimeoutMs", () => {
  it("env 미설정 시 기본값 60000을 반환한다", () => {
    expect(getAiTimeoutMs()).toBe(60000);
  });

  it("env 설정 시 정수로 파싱하여 반환한다", () => {
    process.env.AI_TIMEOUT_MS = "30000";
    expect(getAiTimeoutMs()).toBe(30000);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getAiTimeoutMs()).toBe("number");
  });
});

describe("getDefaultMaxTokens", () => {
  it("env 미설정 시 기본값 4000을 반환한다", () => {
    expect(getDefaultMaxTokens()).toBe(4000);
  });

  it("env 설정 시 정수로 파싱하여 반환한다", () => {
    process.env.AI_DEFAULT_MAX_TOKENS = "8192";
    expect(getDefaultMaxTokens()).toBe(8192);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getDefaultMaxTokens()).toBe("number");
  });
});

describe("getAiTemperature", () => {
  it("env 미설정 시 기본값 0.7을 반환한다", () => {
    expect(getAiTemperature()).toBeCloseTo(0.7);
  });

  it("env 설정 시 float으로 파싱하여 반환한다", () => {
    process.env.AI_TEMPERATURE = "0.5";
    expect(getAiTemperature()).toBeCloseTo(0.5);
  });

  it("0.0 경계값을 올바르게 파싱한다", () => {
    process.env.AI_TEMPERATURE = "0.0";
    expect(getAiTemperature()).toBeCloseTo(0.0);
  });

  it("1.0 경계값을 올바르게 파싱한다", () => {
    process.env.AI_TEMPERATURE = "1.0";
    expect(getAiTemperature()).toBeCloseTo(1.0);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getAiTemperature()).toBe("number");
  });
});

describe("getAiFallbackCooldownMs", () => {
  it("env 미설정 시 기본값 300000(5분)을 반환한다", () => {
    expect(getAiFallbackCooldownMs()).toBe(300000);
  });

  it("env 설정 시 정수로 파싱하여 반환한다", () => {
    process.env.AI_FALLBACK_COOLDOWN_MS = "30000";
    expect(getAiFallbackCooldownMs()).toBe(30000);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getAiFallbackCooldownMs()).toBe("number");
  });
});

describe("getAiAuthCooldownMs", () => {
  it("env 미설정 시 기본값 1800000(30분)을 반환한다", () => {
    expect(getAiAuthCooldownMs()).toBe(1800000);
  });

  it("env 설정 시 정수로 파싱하여 반환한다", () => {
    process.env.AI_AUTH_COOLDOWN_MS = "900000";
    expect(getAiAuthCooldownMs()).toBe(900000);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getAiAuthCooldownMs()).toBe("number");
  });
});

describe("getPostgresPoolSize", () => {
  it("env 미설정 시 기본값 10을 반환한다", () => {
    expect(getPostgresPoolSize()).toBe(10);
  });

  it("env 설정 시 정수로 파싱하여 반환한다", () => {
    process.env.POSTGRES_POOL_SIZE = "20";
    expect(getPostgresPoolSize()).toBe(20);
  });

  it("반환값이 number 타입이다", () => {
    expect(typeof getPostgresPoolSize()).toBe("number");
  });
});

describe("getPostgresUrl", () => {
  it("env 미설정 시 빈 문자열을 반환한다", () => {
    expect(getPostgresUrl()).toBe("");
  });

  it("env 설정 시 해당 URL을 반환한다", () => {
    process.env.POSTGRES_URL = "postgresql://localhost:5432/test";
    expect(getPostgresUrl()).toBe("postgresql://localhost:5432/test");
  });
});

describe("getUpstashRedisRestToken", () => {
  it("env 미설정 시 빈 문자열을 반환한다", () => {
    expect(getUpstashRedisRestToken()).toBe("");
  });

  it("env 설정 시 해당 토큰을 반환한다", () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-upstash-token";
    expect(getUpstashRedisRestToken()).toBe("test-upstash-token");
  });
});

