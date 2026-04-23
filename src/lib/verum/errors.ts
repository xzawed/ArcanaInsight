export class VerumAuthError extends Error {
  constructor(status: number) {
    super(`Verum auth failed: ${status}`);
    this.name = "VerumAuthError";
  }
}

export class VerumRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Verum rate limited — retry after ${retryAfterMs}ms`);
    this.name = "VerumRateLimitError";
  }
}

export class VerumTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Verum request timed out after ${timeoutMs}ms`);
    this.name = "VerumTimeoutError";
  }
}

export class VerumSchemaError extends Error {
  constructor(message: string) {
    super(`Verum response schema invalid: ${message}`);
    this.name = "VerumSchemaError";
  }
}
