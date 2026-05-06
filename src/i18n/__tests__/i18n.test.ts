import { describe, it, expect, beforeEach } from "vitest";
import { isLocale, DEFAULT_LOCALE, LOCALES } from "../config";
import { t, registerTranslations, clearTranslations } from "../translations";

describe("config", () => {
  it("LOCALES = ['ko','en','ja']", () => {
    expect([...LOCALES]).toEqual(["ko", "en", "ja"]);
    expect(DEFAULT_LOCALE).toBe("ko");
  });

  it("isLocale 가드", () => {
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("zh")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(123)).toBe(false);
  });
});

describe("translations.t fallback chain", () => {
  beforeEach(() => clearTranslations());

  it("locale 사전에 키 있으면 그대로 반환", () => {
    registerTranslations("ko", { "header.home": "홈" });
    registerTranslations("en", { "header.home": "Home" });
    expect(t("header.home", "en")).toBe("Home");
    expect(t("header.home", "ko")).toBe("홈");
  });

  it("locale 사전에 키 없으면 ko fallback", () => {
    registerTranslations("ko", { "header.tarot": "타로" });
    expect(t("header.tarot", "en")).toBe("타로");
    expect(t("header.tarot", "ja")).toBe("타로");
  });

  it("ko 사전에도 없으면 키 그대로 반환", () => {
    expect(t("missing.key", "en")).toBe("missing.key");
  });

  it("registerTranslations 누적 병합", () => {
    registerTranslations("en", { "a": "A" });
    registerTranslations("en", { "b": "B" });
    expect(t("a", "en")).toBe("A");
    expect(t("b", "en")).toBe("B");
  });
});
