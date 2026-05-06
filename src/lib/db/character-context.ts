import type { DbClient } from "./types";

interface RecentSession {
  id: string;
  service_type: string;
  created_at: string;
}

interface RecentReading {
  session_id: string;
  overall_reading: string;
}

export interface CharacterMemoryEntry {
  serviceType: string;
  date: string;
  overallReading: string;
}

/**
 * 최근 N회 세션의 overall_reading을 조회해 캐릭터 메모리 컨텍스트로 반환.
 * 인증된 사용자에게만 의미 있음. 실패 시 빈 배열 반환 (리딩은 계속 진행).
 */
export async function getRecentCharacterMemory(
  db: DbClient,
  userId: string,
  characterId: string,
  limit = 3,
  locale?: string,
): Promise<CharacterMemoryEntry[]> {
  try {
    const filter: Record<string, unknown> = { user_id: userId, character_id: characterId, status: "completed" };
    if (locale) filter.locale = locale;
    const sessions = await db.findMany<RecentSession>(
      "sessions",
      filter,
      { limit, orderBy: "created_at", orderDir: "desc" },
    );
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const readings = await db.findManyIn<RecentReading>("readings", "session_id", sessionIds);

    return sessions.flatMap((s) => {
      const reading = readings.find((r) => r.session_id === s.id);
      if (!reading?.overall_reading) return [];
      return [{
        serviceType: s.service_type,
        date: s.created_at.slice(0, 10),
        overallReading: reading.overall_reading.slice(0, 150),
      }];
    });
  } catch (e) {
    console.warn("[character-context] 메모리 조회 실패 (리딩 계속):", e instanceof Error ? e.message : String(e));
    return [];
  }
}
