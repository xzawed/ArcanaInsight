import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

/**
 * 서버 사이드 (route handler · Server Component) locale 결정.
 * 우선순위: middleware가 부착한 `x-locale` 헤더 → 쿠키 → DEFAULT.
 * middleware가 모든 요청에 헤더를 넣으므로 사실상 헤더로 결정되지만,
 * 일부 정적 라우트(/api/*) 캐시·테스트 환경에서 헤더 누락 시 쿠키 fallback.
 */
export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-locale");
  if (isLocale(fromHeader)) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  return DEFAULT_LOCALE;
}
