import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { characters } from "@/data/characters";

interface SessionWithReadings {
  id: string;
  service_type: string;
  topic: string;
  created_at: string;
  character_id?: string;
  readings?: { id: string; share_token?: string; overall_reading?: string }[];
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
  finance: "재정/금전",
  career: "직장/진로",
  health: "건강",
  general: "일반 상담",
};

const topicColors: Record<string, string> = {
  love: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  finance: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  career: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  health: "bg-green-500/20 text-green-300 border-green-500/30",
  general: "bg-arcana-purple/20 text-arcana-purple border-arcana-purple/30",
};

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

function getCharacterName(characterId?: string): string | null {
  if (!characterId) return null;
  const char = characters.find((c) => c.id === characterId);
  return char?.name ?? null;
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, readings(*)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  const sessionList = (sessions ?? []) as SessionWithReadings[];
  const totalReadings = sessionList.length;
  const lastReadingDate = sessionList.length > 0 ? sessionList[0].created_at : null;
  const favoriteCharName = getCharacterName(profile?.favorite_character_id);
  const nickname = profile?.nickname || "사용자";
  const initial = nickname.charAt(0);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/mypage-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
        {/* 비네팅 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative">
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
            <button
              type="button"
              disabled
              title="준비 중"
              className="rounded-full px-4 py-2 text-xs border border-arcana-border text-arcana-muted cursor-not-allowed opacity-50 shrink-0"
            >
              프로필 편집
            </button>
          </div>
        </div>

        {/* 대시보드 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-arcana-purple">{totalReadings}</p>
            <p className="text-arcana-muted text-xs mt-1">총 리딩 수</p>
          </div>
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-gold truncate">데이터 수집 중</p>
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
              const reading = session.readings?.[0];
              const charName = getCharacterName(session.character_id);
              const topicColor = topicColors[session.topic] ?? topicColors.general;
              const preview =
                reading?.overall_reading && reading.overall_reading.length > 80
                  ? reading.overall_reading.slice(0, 80) + "..."
                  : reading?.overall_reading;

              return (
                <Link
                  key={session.id}
                  href={reading?.share_token ? `/tarot/result/${reading.share_token}` : "#"}
                  className="block bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 hover:border-arcana-purple transition-colors hover:shadow-lg hover:shadow-arcana-purple/10"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${topicColor}`}
                      >
                        {topicLabels[session.topic] ?? session.topic}
                      </span>
                      <span className="text-arcana-purple text-xs font-serif font-bold uppercase">
                        {session.service_type}
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
                  {preview && (
                    <p className="text-arcana-text/80 text-sm mt-2 line-clamp-2">{preview}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
