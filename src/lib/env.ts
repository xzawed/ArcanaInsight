/** 환경변수 중앙화 래퍼 — 모든 env var 접근은 이 모듈을 통해 수행 */

// 인프라
export function getDbProvider(): string { return process.env.DB_PROVIDER ?? "supabase" }
export function getPostgresUrl(): string { return process.env.POSTGRES_URL ?? "" }

// AI 공통
export function getGrokApiKey(): string { return process.env.GROK_API_KEY ?? "" }
export function getGrokModel(): string { return process.env.GROK_MODEL ?? "grok-3" }
export function getGrokReasoningEffort(): string { return process.env.GROK_REASONING_EFFORT ?? "low" }
export function getAnthropicApiKey(): string { return process.env.ANTHROPIC_API_KEY ?? "" }
export function getClaudeModel(): string { return process.env.CLAUDE_MODEL ?? "claude-opus-4-7" }
export function getClaudeBaseUrl(): string { return process.env.CLAUDE_BASE_URL ?? "https://api.anthropic.com/v1" }
export function getGrokBaseUrl(): string { return process.env.GROK_BASE_URL ?? "https://api.x.ai/v1" }

// AI 동작 튜닝
// AI_TIMEOUT_MS — 120s는 10장+ 타로/full-fortune 사주(max_tokens 18000~20000)에서 부족 →
// reasoning 토큰 흡수 + 한국어 1.3x 비효율 + JSON 구조 오버헤드 고려해 240s로 상향.
// 클라이언트 hard timeout과 동일.
export function getAiTimeoutMs(): number { return Number.parseInt(process.env.AI_TIMEOUT_MS ?? "240000", 10) }
export function getDefaultMaxTokens(): number { return Number.parseInt(process.env.AI_DEFAULT_MAX_TOKENS ?? "4000", 10) }
export function getAiTemperature(): number { return Number.parseFloat(process.env.AI_TEMPERATURE ?? "0.7") }

// Fallback 쿨다운
export function getAiFallbackCooldownMs(): number { return Number.parseInt(process.env.AI_FALLBACK_COOLDOWN_MS ?? "300000", 10) }
export function getAiAuthCooldownMs(): number { return Number.parseInt(process.env.AI_AUTH_COOLDOWN_MS ?? "1800000", 10) }

// DB
export function getPostgresPoolSize(): number { return Number.parseInt(process.env.POSTGRES_POOL_SIZE ?? "10", 10) }

// Rate-limit (Upstash Redis)
export function getUpstashRedisRestUrl(): string { return process.env.UPSTASH_REDIS_REST_URL ?? "" }
export function getUpstashRedisRestToken(): string { return process.env.UPSTASH_REDIS_REST_TOKEN ?? "" }

// 리딩 dead-letter 재처리 엔드포인트 시크릿 (미설정 시 엔드포인트 비활성=404)
export function getDlqRetrySecret(): string { return process.env.DLQ_RETRY_SECRET ?? "" }

