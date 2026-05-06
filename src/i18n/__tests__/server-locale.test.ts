import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const headersMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
  cookies: () => cookiesMock(),
}));

beforeEach(() => {
  vi.resetModules();
  headersMock.mockReset();
  cookiesMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildHeaders(xLocale?: string | null) {
  return Promise.resolve({
    get: (name: string) => (name === "x-locale" ? (xLocale ?? null) : null),
  });
}

function buildCookies(localeValue?: string) {
  return Promise.resolve({
    get: (name: string) =>
      name === "ai_locale" && localeValue !== undefined ? { value: localeValue } : undefined,
  });
}

describe("getRequestLocale", () => {
  it("x-locale 헤더 우선 (en)", async () => {
    headersMock.mockReturnValue(buildHeaders("en"));
    cookiesMock.mockReturnValue(buildCookies("ja"));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("en");
  });

  it("x-locale 헤더 우선 (ja)", async () => {
    headersMock.mockReturnValue(buildHeaders("ja"));
    cookiesMock.mockReturnValue(buildCookies(undefined));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("ja");
  });

  it("헤더 미존재 시 쿠키 사용", async () => {
    headersMock.mockReturnValue(buildHeaders(null));
    cookiesMock.mockReturnValue(buildCookies("en"));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("en");
  });

  it("헤더가 알 수 없는 값이면 쿠키로 fallback", async () => {
    headersMock.mockReturnValue(buildHeaders("fr"));
    cookiesMock.mockReturnValue(buildCookies("ja"));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("ja");
  });

  it("헤더·쿠키 모두 없으면 DEFAULT(ko)", async () => {
    headersMock.mockReturnValue(buildHeaders(null));
    cookiesMock.mockReturnValue(buildCookies(undefined));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("ko");
  });

  it("쿠키 값이 알 수 없으면 DEFAULT(ko)", async () => {
    headersMock.mockReturnValue(buildHeaders(null));
    cookiesMock.mockReturnValue(buildCookies("zh"));
    const { getRequestLocale } = await import("../server-locale");
    expect(await getRequestLocale()).toBe("ko");
  });
});
