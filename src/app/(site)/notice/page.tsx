import Link from "next/link";
import type { Metadata } from "next";
import { t as translate } from "@/i18n/translations";
import { getRequestLocale } from "@/i18n/server-locale";

/**
 * 서비스 종료 공지 (2026-08-31 종료 · 2026-09-01 데이터 파기).
 *
 * 약관 제3조가 "공지 후 7일"을 효력 기준으로 두므로 게시일(2026-08-23)을 본문에 명시한다.
 * 약관·개인정보처리방침 페이지와 달리 3개 언어를 지원한다 — 종료·파기 고지는 전 이용자가
 * 읽을 수 있어야 하기 때문이다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: `${translate("notice.page.title", locale)} — ArcanaInsight`,
    description: translate("notice.banner.text", locale),
  };
}

export default async function NoticePage() {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(key, locale);

  return (
    <div className="bg-arcana-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          {t("notice.page.back")}
        </Link>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-arcana-gold mt-6 mb-2">
          {t("notice.page.title")}
        </h1>
        <p className="text-arcana-muted text-xs mb-8">{t("notice.page.published")}</p>

        <div className="space-y-8 text-arcana-text text-sm leading-relaxed">
          <section className="rounded-lg border border-arcana-gold/40 bg-arcana-gold/10 px-4 py-4">
            <p>{t("notice.page.intro")}</p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">
              {t("notice.page.schedule.heading")}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t("notice.page.schedule.service")}</li>
              <li>{t("notice.page.schedule.data")}</li>
              <li>{t("notice.page.schedule.after")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">
              {t("notice.page.data.heading")}
            </h2>
            <p className="mb-3">{t("notice.page.data.intro")}</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t("notice.page.data.account")}</li>
              <li>{t("notice.page.data.reading")}</li>
              <li>{t("notice.page.data.birth")}</li>
            </ul>
            <p className="mt-3 text-arcana-muted">{t("notice.page.data.irreversible")}</p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">
              {t("notice.page.save.heading")}
            </h2>
            <p>{t("notice.page.save.body")}</p>
          </section>

          <section className="border-t border-arcana-border pt-6">
            <h2 className="font-serif font-bold text-base text-arcana-text mb-3">
              {t("notice.page.contact.heading")}
            </h2>
            <p>{t("notice.page.contact.body")}</p>
            <p className="mt-2 text-arcana-muted">{t("notice.page.contact.email")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
