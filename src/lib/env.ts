/** 환경변수 중앙화 래퍼 — 모든 env var 접근은 이 모듈을 통해 수행 */

// 인프라
export function getDbProvider(): string { return process.env.DB_PROVIDER ?? "supabase" }
export function getPostgresUrl(): string { return process.env.POSTGRES_URL ?? "" }

// AI 공통
export function getGrokApiKey(): string { return process.env.GROK_API_KEY ?? "" }
export function getGrokModel(): string { return process.env.GROK_MODEL ?? "grok-3" }
export function getAnthropicApiKey(): string { return process.env.ANTHROPIC_API_KEY ?? "" }
export function getClaudeModel(): string { return process.env.CLAUDE_MODEL ?? "claude-opus-4-7" }
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

// Verum 타임아웃 & 서킷 브레이커
export function getVerumTimeoutMs(): number { return parseInt(process.env.VERUM_TIMEOUT_MS ?? "3000", 10) }
export function getVerumRecordTimeoutMs(): number { return parseInt(process.env.VERUM_RECORD_TIMEOUT_MS ?? "5000", 10) }
export function getVerumFailureCooldownMs(): number { return parseInt(process.env.VERUM_FAILURE_COOLDOWN_MS ?? "60000", 10) }
export function getVerumAuthCooldownMs(): number { return parseInt(process.env.VERUM_AUTH_COOLDOWN_MS ?? "1800000", 10) }
