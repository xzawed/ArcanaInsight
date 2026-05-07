import { getUpstashRedisRestUrl, getUpstashRedisRestToken } from "@/lib/env";
import { t as translate } from "@/i18n/translations";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// fallback: 모듈 전역 Map (UPSTASH_REDIS_REST_URL 미설정 시 — 로컬 개발·테스트 환경)
const hits = new Map<string, RateLimitEntry>();

function checkMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

async function checkUpstash(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = getUpstashRedisRestUrl();
  const token = getUpstashRedisRestToken();
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // pipeline: [INCR key, EXPIRE key windowSec NX]
    // NX = expiry를 첫 요청 시에만 설정 (이후 요청은 기존 TTL 유지)
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
    });

    if (!res.ok) return checkMemory(key, limit, windowMs);

    const data = (await res.json()) as [{ result: number }, unknown];
    const count = data[0]?.result ?? 1;
    return count <= limit;
  } catch {
    // 네트워크 오류 시 in-memory fallback
    return checkMemory(key, limit, windowMs);
  }
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!getUpstashRedisRestUrl()) return checkMemory(key, limit, windowMs);
  return checkUpstash(key, limit, windowMs);
}

export function rateLimitResponse(locale: Locale = DEFAULT_LOCALE): Response {
  return new Response(
    JSON.stringify({ error: translate("api.rate-limit-error", locale) }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
  );
}
