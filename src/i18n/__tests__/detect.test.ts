import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { detectLocale } from "../detect";
import { LOCALE_COOKIE } from "../config";

function buildRequest({
  cookieValue,
  acceptLanguage,
}: { cookieValue?: string; acceptLanguage?: string }): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === LOCALE_COOKIE && cookieValue !== undefined ? { value: cookieValue } : undefined,
    },
    headers: {
      get: (name: string) =>
        name === "accept-language" && acceptLanguage !== undefined ? acceptLanguage : null,
    },
  } as unknown as NextRequest;
}

describe("detectLocale", () => {
  it("쿠키 우선 — 유효한 locale 쿠키가 있으면 반환", () => {
    expect(detectLocale(buildRequest({ cookieValue: "en" }))).toBe("en");
    expect(detectLocale(buildRequest({ cookieValue: "ja" }))).toBe("ja");
    expect(detectLocale(buildRequest({ cookieValue: "ko" }))).toBe("ko");
  });

  it("쿠키가 알 수 없는 locale이면 Accept-Language로 fallback", () => {
    expect(detectLocale(buildRequest({ cookieValue: "fr", acceptLanguage: "en-US,en;q=0.9" }))).toBe("en");
  });

  it("쿠키 없으면 Accept-Language로 결정", () => {
    expect(detectLocale(buildRequest({ acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8" }))).toBe("ja");
    expect(detectLocale(buildRequest({ acceptLanguage: "en-GB,en;q=0.9" }))).toBe("en");
  });

  it("Accept-Language q값 우선순위 정렬", () => {
    // fr 미지원 → 다음 q 순위(en 0.5)
    expect(detectLocale(buildRequest({ acceptLanguage: "fr;q=0.9,en;q=0.5,ja;q=0.3" }))).toBe("en");
    // ja(0.95)가 en(0.5)보다 우선
    expect(detectLocale(buildRequest({ acceptLanguage: "fr;q=0.9,ja;q=0.95,en;q=0.5" }))).toBe("ja");
  });

  it("Accept-Language에 지원 locale 없으면 DEFAULT(ko)", () => {
    expect(detectLocale(buildRequest({ acceptLanguage: "fr-FR,fr;q=0.9,zh;q=0.8" }))).toBe("ko");
  });

  it("쿠키·Accept-Language 모두 없으면 DEFAULT(ko)", () => {
    expect(detectLocale(buildRequest({}))).toBe("ko");
  });

  it("Accept-Language에 primary tag만 있어도 인식", () => {
    expect(detectLocale(buildRequest({ acceptLanguage: "ja" }))).toBe("ja");
    expect(detectLocale(buildRequest({ acceptLanguage: "en" }))).toBe("en");
  });
});
