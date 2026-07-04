import { getDb } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/translations";
import {
  getReadingFromSession,
  getMostFrequentCard,
  getCharacterName,
  type ReadingData,
  type SessionRow,
  type SessionCard,
  type Profile,
} from "./mypage-utils";

// ─── DB 쿼리 및 데이터 처리 ───────────────────────────────────────────────────

export interface MypageData {
  profile: Profile | null;
  profileError: { message: string } | null;
  sessionList: SessionRow[];
  sessionCards: SessionCard[];
  totalReadings: number;
  lastReadingDate: string | null;
  favoriteCharName: string | null;
  mostFrequentCard: string | null;
  nickname: string;
  initial: string;
}

export async function fetchMypageData(userId: string, locale: Locale): Promise<MypageData> {
  const db = getDb();

  // 1. 프로필 + 전체 세션 병렬 조회
  const [profile, allRawSessions] = await Promise.all([
    db.findOne<Profile>("profiles", { id: userId }).catch(() => null),
    db.findMany<SessionRow>("sessions", { user_id: userId }).catch(() => [] as SessionRow[]),
  ]);

  const profileError: { message: string } | null = profile
    ? null
    : { message: t("mypage.profile.error-detail-fallback", locale) };

  // status 필터 + 최신순 정렬 (DB Provider별 ORDER BY 미지원이므로 JS에서 처리)
  const filtered = (allRawSessions as SessionRow[])
    .filter((s) => s.status === "completed" || s.status === "in_progress")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  // 2. 서비스 타입별 ID 분류 → 3개 테이블 일괄 조회 (N+1 → 3 queries)
  const tarotIds = filtered.filter((s) => s.service_type === "tarot").map((s) => s.id);
  const sajuIds = filtered.filter((s) => s.service_type === "saju").map((s) => s.id);
  const shinjeomIds = filtered.filter((s) => s.service_type === "shinjeom").map((s) => s.id);

  const [tarotReadings, sajuReadings, shinjeomReadings] = await Promise.all([
    db.findManyIn<ReadingData>("readings", "session_id", tarotIds).catch(() => [] as ReadingData[]),
    db.findManyIn<ReadingData>("saju_readings", "session_id", sajuIds).catch(() => [] as ReadingData[]),
    db.findManyIn<ReadingData>("shinjeom_readings", "session_id", shinjeomIds).catch(() => [] as ReadingData[]),
  ]);

  const tarotMap = new Map(tarotReadings.map((r) => [r.session_id, r]));
  const sajuMap = new Map(sajuReadings.map((r) => [r.session_id, r]));
  const shinjeomMap = new Map(shinjeomReadings.map((r) => [r.session_id, r]));

  const withReadings = filtered.map((session) => ({
    ...session,
    readings: session.service_type === "tarot" ? (tarotMap.get(session.id) ?? null) : null,
    saju_readings: session.service_type === "saju" ? (sajuMap.get(session.id) ?? null) : null,
    shinjeom_readings: session.service_type === "shinjeom" ? (shinjeomMap.get(session.id) ?? null) : null,
  })) as SessionRow[];

  // completed 세션 + 리딩이 있는 in_progress 세션 (상태 업데이트 누락 복구)
  const sessionList = withReadings
    .filter((s) => {
      if (s.status === "completed") return true;
      return !!getReadingFromSession(s);
    })
    .slice(0, 20);

  // 3. session_cards 일괄 조회 (N+1 → 1 query)
  const sessionIds = sessionList.map((s) => s.id);
  const sessionCards: SessionCard[] =
    sessionIds.length > 0
      ? await db.findManyIn<SessionCard>("session_cards", "session_id", sessionIds).catch(() => [])
      : [];

  // 4. 통계 계산
  const totalReadings = sessionList.length;
  const lastReadingDate = sessionList.length > 0 ? sessionList[0].created_at : null;
  const favoriteCharName = getCharacterName(profile?.favorite_character_id);
  const mostFrequentCard = getMostFrequentCard(sessionCards, locale);
  const nickname = profile?.nickname || t("mypage.profile.default-nickname", locale);
  const initial = nickname.charAt(0);

  return {
    profile,
    profileError,
    sessionList,
    sessionCards,
    totalReadings,
    lastReadingDate,
    favoriteCharName,
    mostFrequentCard,
    nickname,
    initial,
  };
}
