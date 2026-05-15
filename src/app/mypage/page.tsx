import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDbProvider } from "@/lib/env";
import { getRequestLocale } from "@/i18n/server-locale";
import { t } from "@/i18n/translations";
import { getTopicLabel } from "@/data/topics-meta";
import { LogoutButton } from "./LogoutButton";
import { FavoriteCharacterSelector } from "./FavoriteCharacterSelector";
import { fetchMypageData } from "./mypage-queries";
import {
  formatRelativeDate,
  getCharacterName,
  getReadingFromSession,
  getServiceLabel,
  topicColors,
  serviceColors,
} from "./mypage-utils";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const locale = await getRequestLocale();

  const {
    profile,
    profileError,
    sessionList,
    totalReadings,
    lastReadingDate,
    favoriteCharName,
    mostFrequentCard,
    nickname,
    initial,
  } = await fetchMypageData(user.id, locale);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/mypage-bg.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative">
        {/* DB 에러 안내 */}
        {profileError && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <p className="font-bold">{t("mypage.profile.error", locale)}</p>
            <p className="mt-1 text-xs text-red-400/70">{profileError.message}</p>
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
                  {t("mypage.profile.favorite-character", locale)}: <span className="font-semibold">{favoriteCharName}</span>
                </p>
              )}
            </div>
            <LogoutButton useNextAuth={getDbProvider() === "postgres"} />
          </div>
        </div>

        {/* 대시보드 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-serif font-bold text-arcana-purple">{totalReadings}</p>
            <p className="text-arcana-muted text-xs mt-1">{t("mypage.stats.total", locale)}</p>
          </div>
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-gold truncate">
              {mostFrequentCard ?? t("mypage.stats.frequent-card-empty", locale)}
            </p>
            <p className="text-arcana-muted text-xs mt-1">{t("mypage.stats.frequent-card", locale)}</p>
          </div>
          <FavoriteCharacterSelector
            currentCharacterId={profile?.favorite_character_id}
            currentCharacterName={favoriteCharName}
          />
          <div className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center">
            <p className="text-sm font-serif font-bold text-arcana-text truncate">
              {lastReadingDate ? formatRelativeDate(lastReadingDate, locale) : t("mypage.stats.last-reading-empty", locale)}
            </p>
            <p className="text-arcana-muted text-xs mt-1">{t("mypage.stats.last-reading", locale)}</p>
          </div>
        </div>

        {/* 리딩 히스토리 */}
        <h3 className="font-serif font-bold text-base md:text-lg mb-4 drop-shadow-md">{t("mypage.history.title", locale)}</h3>

        {sessionList.length === 0 ? (
          <div className="text-center py-16 bg-arcana-card/50 backdrop-blur-sm rounded-2xl border border-arcana-border">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                src="/images/backgrounds/deco-crystal-ball.jpg"
                alt=""
                fill
                className="object-contain rounded-full opacity-60"
                sizes="100vw"
              />
            </div>
            <p className="text-arcana-muted text-lg font-serif mb-2">{t("mypage.history.empty.title", locale)}</p>
            <p className="text-arcana-muted/60 text-sm mb-6">{t("mypage.history.empty.desc", locale)}</p>
            <Link
              href="/tarot"
              className="inline-block rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-arcana-purple/30 hover:shadow-xl hover:shadow-arcana-purple/40 transition-all"
            >
              {t("mypage.history.empty.cta", locale)}
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
              const serviceLabel = getServiceLabel(session.service_type, locale);
              const resultPath = session.service_type === "saju"
                ? `/saju/result/${shareToken}`
                : session.service_type === "shinjeom"
                ? `/shinjeom/result/${shareToken}`
                : `/tarot/result/${shareToken}`;

              const content = (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${topicColor}`}
                      >
                        {getTopicLabel(session.topic, locale)}
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
                      {formatRelativeDate(session.created_at, locale)}
                    </span>
                  </div>
                  {preview ? (
                    <p className="text-arcana-text/80 text-sm mt-2 line-clamp-2">{preview}</p>
                  ) : (
                    <p className="text-arcana-muted/60 text-xs mt-2 italic">{t("mypage.history.no-result", locale)}</p>
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
