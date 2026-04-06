import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { characters } from "@/data/characters";
import { DeckManager } from "@/services/tarot/deck-manager";
import { LogoutButton } from "./LogoutButton";

/** readings는 1:1 관계(unique session_id)이므로 PostgREST가 단일 객체로 반환 */
interface ReadingData {
  id: string;
  share_token?: string | null;
  overall_reading?: string | null;
}

interface SessionRow {
  id: string;
  service_type: string;
  topic: string;
  status: string;
  created_at: string;
  character_id?: string | null;
  readings: ReadingData | ReadingData[] | null;
  saju_readings: ReadingData | ReadingData[] | null;
  shinjeom_readings: ReadingData | ReadingData[] | null;
}

interface SessionCard {
  card_id: string;
}

interface Profile {
  id: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  provider?: string;
  favorite_character_id?: string;
}

const topicLabels: Record<string, string> = {
  love: "연애/관계",
  "love-single": "연애 (솔로)",
  "love-couple": "연애 (커플)",
  finance: "재정/금전",
  career: "직장/진로",
  health: "건강",
  general: "일반 상담",
  "saju-general": "사주 종합",
  "saju-love-single": "사주 연애(솔로)",
  "saju-love-couple": "사주 연애(커플)",
  "saju-career": "사주 직장·재물",
  "saju-health": "사주 건강",
  "saju-personality": "사주 성격·적성",
  "saju-compatibility": "사주 궁합",
  "saju-auspicious-date": "사주 택일",
  "shinjeom-general": "신점 종합",
  "shinjeom-love": "신점 연애/궁합",
  "shinjeom-wealth": "신점 재물/사업",
  "shinjeom-career": "신점 직장/이직",
  "shinjeom-health": "신점 건강/액막이",
  "shinjeom-auspicious": "신점 택일",
};

const topicColors: Record<string, string> = {
  love: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "love-single": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "love-couple": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  finance: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  career: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  health: "bg-green-500/20 text-green-300 border-green-500/30",
  general: "bg-arcana-purple/20 text-arcana-purple border-arcana-purple/30",
};

const serviceColors: Record<string, string> = {
  tarot: "text-arcana-purple",
  saju: "text-cyan-400",
  shinjeom: "text-amber-400",
};

const deckManager = new DeckManager();

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return date.toLocaleDateString("ko-KR");
}

function getCharacterName(characterId?: string | null): string | null {
  if (!characterId) return null;
  const char = characters.find((c) => c.id === characterId);
  return char?.name ?? null;
}

/** PostgREST 1:1 관계: 객체 또는 배열 모두 처리 */
function normalizeReading(readings: ReadingData | ReadingData[] | null | undefined): ReadingData | undefined {
  if (!readings) return undefined;
  if (Array.isArray(readings)) return readings[0];
  return readings;
}

/** 3개 리딩 테이블 중 데이터가 있는 것 반환 */
function getReadingFromSession(session: SessionRow): ReadingData | undefined {
  return normalizeReading(session.readings)
    ?? normalizeReading(session.saju_readings)
    ?? normalizeReading(session.shinjeom_readings);
}

/** 카드 빈도 집계 → 가장 많이 뽑은 카드명 반환 */
function getMostFrequentCard(sessionCards: SessionCard[]): string | null {
  if (sessionCards.length === 0) return null;
  const freq: Record<string, number> = {};
  for (const sc of sessionCards) {
    freq[sc.card_id] = (freq[sc.card_id] || 0) + 1;
  }
  const topCardId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  const card = deckManager.getCardById(topCardId);
  return card?.nameKo ?? topCardId;
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // 1. 프로필 + 세션 조회 (리딩이 있는 세션도 포함하기 위해 completed + in_progress 모두 조회)
  const [profileRes, sessionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, nickname, avatar_url, provider, favorite_character_id")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("sessions")
      .select("id, service_type, topic, status, created_at, character_id, readings(id, share_token, overall_reading), saju_readings(id, share_token, overall_reading), shinjeom_readings(id, share_token, overall_reading)")
      .eq("user_id", user.id)
      .in("status", ["completed", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const profile = profileRes.data;
  const profileError = profileRes.error;
  const rawSessions = (sessionsRes.data ?? []) as SessionRow[];
  const sessionsError = sessionsRes.error;

  // completed 세션 + 리딩이 있는 in_progress 세션 (상태 업데이트 누락 복구)
  const sessionList = rawSessions.filter((s) => {
    if (s.status === "completed") return true;
    return !!getReadingFromSession(s);
  }).slice(0, 20);

  // 2. 세션 ID 목록으로 session_cards 조회 (별도 쿼리)
  const sessionIds = sessionList.map((s) => s.id);
  let sessionCards: SessionCard[] = [];
  if (sessionIds.length > 0) {
    const cardsRes = await supabase
      .from("session_cards")
      .select("card_id")
      .in("session_id", sessionIds);
    sessionCards = (cardsRes.data ?? []) as SessionCard[];
  }

  const totalReadings = sessionList.length;
  const lastReadingDate = sessionList.length > 0 ? sessionList[0].created_at : null;
  const favoriteCharName = getCharacterName(profile?.favorite_character_id);
  const mostFrequentCard = getMostFrequentCard(sessionCards);
  const nickname = profile?.nickname || "사용자";
  const initial = nickname.charAt(0);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/mypage-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative">
        {/* DB 에러 안내 */}
        {(profileError || sessionsError) && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <p className="font-bold">데이터를 불러오는 중 문제가 발생했습니다</p>
            <p className="mt-1 text-xs text-red-400/70">
              {profileError && `프로필: ${profileError.message}`}
              {profileError && sessionsError && " / "}
              {sessionsError && `히스토리: ${sessionsError.message}`}
            </p>
          </div>
        )}

        {/* 프로필 섹션 */}
        <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-arcana-purple to-arcana-indigo flex items-center justify-center text-3xl font-serif font-bold text-white shadow-lg shadow-arcana-purple/30 shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif font-bold text-xl md:text-2xl truncate">{nickname}</h2>
              <p className="text-arcana-muted text-sm truncate">{profile?.email}</p>
              {favoriteCharName && (
                <p className="text-arcana-purple text-xs mt-1">
                  선호 상담사: <span className="font-semibold">{favoriteCharName}</span>
                </p>
              )}
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* 대시보드 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-arcana-purple">{totalReadings}</p>
            <p className="text-arcana-muted text-xs mt-1">총 리딩 수</p>
          </div>
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-gold truncate">
              {mostFrequentCard ?? "아직 없음"}
            </p>
            <p className="text-arcana-muted text-xs mt-1">자주 뽑은 카드</p>
          </div>
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-indigo truncate">
              {favoriteCharName ?? "미설정"}
            </p>
            <p className="text-arcana-muted text-xs mt-1">선호 상담사</p>
          </div>
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-text truncate">
              {lastReadingDate ? formatRelativeDate(lastReadingDate) : "없음"}
            </p>
            <p className="text-arcana-muted text-xs mt-1">최근 상담</p>
          </div>
        </div>

        {/* 리딩 히스토리 */}
        <h3 className="font-serif font-bold text-base md:text-lg mb-4 drop-shadow-md">리딩 히스토리</h3>

        {sessionList.length === 0 ? (
          <div className="text-center py-16 bg-arcana-card/50 backdrop-blur-sm rounded-2xl border border-arcana-border">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                src="/images/backgrounds/deco-crystal-ball.jpg"
                alt=""
                fill
                className="object-contain rounded-full opacity-60"
              />
            </div>
            <p className="text-arcana-muted text-lg font-serif mb-2">아직 리딩 기록이 없습니다</p>
            <p className="text-arcana-muted/60 text-sm mb-6">카드가 당신의 이야기를 기다리고 있어요</p>
            <Link
              href="/tarot"
              className="inline-block rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-arcana-purple/30 hover:shadow-xl hover:shadow-arcana-purple/40 transition-all"
            >
              첫 타로 상담 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionList.map((session) => {
              const reading = getReadingFromSession(session);
              const charName = getCharacterName(session.character_id);
              const topicColor = topicColors[session.topic] ?? topicColors.general;
              const overallText = reading?.overall_reading || "";
              const preview = overallText.length > 80
                ? overallText.slice(0, 80) + "..."
                : overallText || null;
              const shareToken = reading?.share_token;
              const serviceLabel = session.service_type === "saju" ? "사주" : session.service_type === "shinjeom" ? "신점" : "타로";
              const resultPath = session.service_type === "saju"
                ? `/saju/result/${shareToken}`
                : session.service_type === "shinjeom"
                ? null
                : `/tarot/result/${shareToken}`;

              const content = (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${topicColor}`}
                      >
                        {topicLabels[session.topic] ?? session.topic}
                      </span>
                      <span className={`text-xs font-display font-bold ${serviceColors[session.service_type] ?? "text-arcana-purple"}`}>
                        {serviceLabel}
                      </span>
                      {charName && (
                        <span className="text-xs text-arcana-muted bg-arcana-surface/50 px-2 py-0.5 rounded-full">
                          {charName}
                        </span>
                      )}
                    </div>
                    <span className="text-arcana-muted text-xs shrink-0">
                      {formatRelativeDate(session.created_at)}
                    </span>
                  </div>
                  {preview ? (
                    <p className="text-arcana-text/80 text-sm mt-2 line-clamp-2">{preview}</p>
                  ) : (
                    <p className="text-arcana-muted/60 text-xs mt-2 italic">결과가 저장되지 않았습니다</p>
                  )}
                </>
              );

              return shareToken && resultPath ? (
                <Link
                  key={session.id}
                  href={resultPath}
                  className="block bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 transition-colors hover:shadow-lg hover:shadow-arcana-purple/10 hover:border-arcana-purple cursor-pointer"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={session.id}
                  className="block bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 opacity-80"
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
