import { DEFAULT_LOCALE, type Locale } from "../config";
import { ko } from "./ko";
import { en } from "./en";
import { ja } from "./ja";
import { flatten, type FlatDict, type Namespace, type SharedKeys } from "./shared/keys";

type LocaleDict = Record<Locale, FlatDict>;

function buildDict(source: Partial<SharedKeys>): FlatDict {
  let merged: FlatDict = {};
  for (const ns of Object.keys(source) as Namespace[]) {
    const nsDict = source[ns];
    if (nsDict) merged = { ...merged, ...flatten(ns, nsDict) };
  }
  return merged;
}

const dict: LocaleDict = {
  ko: buildDict(ko),
  en: buildDict(en),
  ja: buildDict(ja),
};

export function t(key: string, locale: Locale): string {
  const localeDict = dict[locale];
  if (key in localeDict) return localeDict[key];
  const fallback = dict[DEFAULT_LOCALE];
  if (key in fallback) return fallback[key];
  return key;
}

export function registerTranslations(locale: Locale, entries: FlatDict): void {
  dict[locale] = { ...dict[locale], ...entries };
}

export function clearTranslations(): void {
  dict.ko = buildDict(ko);
  dict.en = buildDict(en);
  dict.ja = buildDict(ja);
}

export function getDictSnapshot(locale: Locale): FlatDict {
  return { ...dict[locale] };
}
