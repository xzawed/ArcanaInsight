/** 환경변수 중앙화 래퍼 — 모든 env var 접근은 이 모듈을 통해 수행 */

// AI 공통
export function getGrokApiKey(): string { return process.env.GROK_API_KEY ?? "" }
export function getGrokModel(): string { return process.env.GROK_MODEL ?? "grok-3" }
export function getAnthropicApiKey(): string { return process.env.ANTHROPIC_API_KEY ?? "" }
export function getClaudeModel(): string { return process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514" }
export function getClaudeBaseUrl(): string { return process.env.CLAUDE_BASE_URL ?? "https://api.anthropic.com/v1" }
export function getGrokBaseUrl(): string { return process.env.GROK_BASE_URL ?? "https://api.x.ai/v1" }

// AI 동작 튜닝
export function getAiTimeoutMs(): number { return parseInt(process.env.AI_TIMEOUT_MS ?? "60000", 10) }
export function getDefaultMaxTokens(): number { return parseInt(process.env.AI_DEFAULT_MAX_TOKENS ?? "4000", 10) }
export function getAiTemperature(): number { return parseFloat(process.env.AI_TEMPERATURE ?? "0.7") }

// Fallback 쿨다운
export function getAiFallbackCooldownMs(): number { return parseInt(process.env.AI_FALLBACK_COOLDOWN_MS ?? "300000", 10) }
export function getAiAuthCooldownMs(): number { return parseInt(process.env.AI_AUTH_COOLDOWN_MS ?? "1800000", 10) }

// DB
export function getPostgresPoolSize(): number { return parseInt(process.env.POSTGRES_POOL_SIZE ?? "10", 10) }

// Verum
export function getVerumApiUrl(): string { return process.env.VERUM_API_URL ?? "" }
export function getVerumApiKey(): string { return process.env.VERUM_API_KEY ?? "" }
export function getVerumDeploymentId(): string { return process.env.VERUM_DEPLOYMENT_ID ?? "" }
