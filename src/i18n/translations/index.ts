import { DEFAULT_LOCALE, type Locale } from "../config";

type Dict = Record<string, string>;
type LocaleDict = Record<Locale, Dict>;

const dict: LocaleDict = {
  ko: {},
  en: {},
  ja: {},
};

export function t(key: string, locale: Locale): string {
  const localeDict = dict[locale] ?? {};
  if (key in localeDict) return localeDict[key];
  const fallback = dict[DEFAULT_LOCALE];
  if (key in fallback) return fallback[key];
  return key;
}

export function registerTranslations(locale: Locale, entries: Dict): void {
  dict[locale] = { ...dict[locale], ...entries };
}

export function clearTranslations(): void {
  dict.ko = {};
  dict.en = {};
  dict.ja = {};
}
