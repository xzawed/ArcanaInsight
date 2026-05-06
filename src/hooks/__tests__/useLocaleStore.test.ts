import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("useLocaleStore", () => {
  let documentMock: { cookie: string; documentElement: { lang: string } };

  beforeEach(() => {
    vi.resetModules();
    documentMock = { cookie: "", documentElement: { lang: "" } };
    vi.stubGlobal("document", documentMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("기본 locale은 'ko'", async () => {
    const { useLocaleStore } = await import("../useLocaleStore");
    expect(useLocaleStore.getState().locale).toBe("ko");
  });

  it("setLocale 호출 시 store 갱신", async () => {
    const { useLocaleStore } = await import("../useLocaleStore");
    useLocaleStore.getState().setLocale("en");
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("setLocale 호출 시 document.cookie 작성", async () => {
    const { useLocaleStore } = await import("../useLocaleStore");
    useLocaleStore.getState().setLocale("ja");
    expect(documentMock.cookie).toContain("ai_locale=ja");
    expect(documentMock.cookie).toContain("path=/");
    expect(documentMock.cookie).toContain("SameSite=Lax");
  });

  it("setLocale 호출 시 documentElement.lang 갱신", async () => {
    const { useLocaleStore } = await import("../useLocaleStore");
    useLocaleStore.getState().setLocale("en");
    expect(documentMock.documentElement.lang).toBe("en");
  });

  it("document 미정의 환경에서도 throw 없이 동작", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("document", undefined);
    vi.resetModules();
    const { useLocaleStore } = await import("../useLocaleStore");
    expect(() => useLocaleStore.getState().setLocale("ja")).not.toThrow();
    expect(useLocaleStore.getState().locale).toBe("ja");
  });
});
