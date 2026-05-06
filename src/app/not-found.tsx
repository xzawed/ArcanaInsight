import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

const COPY: Record<Locale, { title: string; description: string; cta: string }> = {
  ko: { title: "페이지를 찾을 수 없습니다", description: "요청하신 페이지가 존재하지 않거나 이동되었습니다.", cta: "홈으로 돌아가기" },
  en: { title: "Page not found", description: "The page you requested does not exist or has been moved.", cta: "Back to home" },
  ja: { title: "ページが見つかりません", description: "リクエストされたページは存在しないか、移動されました。", cta: "ホームに戻る" },
};

export default async function NotFound() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const copy = COPY[locale];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="text-3xl font-serif mb-3">{copy.title}</h1>
      <p className="text-arcana-muted mb-6">{copy.description}</p>
      <Link href="/" className="px-5 py-2 rounded-lg bg-arcana-purple text-white">
        {copy.cta}
      </Link>
    </div>
  );
}
