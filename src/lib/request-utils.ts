export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return headers.get("x-real-ip")?.trim() ?? "anon"
}

export function pickFields(
  obj: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  return Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]))
}
