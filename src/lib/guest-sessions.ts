/**
 * 비인증(게스트/만료 세션) 상태에서 생성된 익명 세션 id를 클라이언트에 보관한다.
 * 로그인 시 SessionClaimer가 이를 서버로 보내 계정에 연결(claim)한다.
 *
 * 항상 저장(인증 여부 무관) — claim API의 `WHERE user_id IS NULL` 가드가 멱등을 보장하므로
 * 이미 소유/타인 소유 세션은 서버에서 no-op 처리된다.
 * localStorage 차단 환경에서는 graceful no-op (기존 동작 유지).
 */
const STORAGE_KEY = "arcana_guest_sessions";
const CAP = 30;

export function rememberGuestSession(id: string): void {
  if (!id) return;
  try {
    const next = [id, ...getGuestSessions().filter((s) => s !== id)].slice(0, CAP);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage 차단 환경 — 무동작
  }
}

export function getGuestSessions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function clearGuestSessions(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const remove = new Set(ids);
    const next = getGuestSessions().filter((s) => !remove.has(s));
    if (next.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage 차단 환경 — 무동작
  }
}
