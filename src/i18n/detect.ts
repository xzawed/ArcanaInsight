import { type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from "./config";

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranges = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranges) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}

export function detectLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const fromHeader = parseAcceptLanguage(request.headers.get("accept-language"));
  if (fromHeader) return fromHeader;
  return DEFAULT_LOCALE;
}

export { LOCALES } from "./config";
