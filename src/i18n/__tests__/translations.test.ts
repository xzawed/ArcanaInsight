import { describe, it, expect, beforeEach } from "vitest";
import { t, registerTranslations, clearTranslations, getDictSnapshot } from "../translations";

describe("translations 사전 — namespace × locale", () => {
  beforeEach(() => clearTranslations());

  it("ko 사전은 모든 namespace 키를 채움", () => {
    const snapshot = getDictSnapshot("ko");
    expect(snapshot["header.nav.tarot"]).toBe("타로");
    expect(snapshot["header.nav.saju"]).toBe("사주");
    expect(snapshot["header.nav.shinjeom"]).toBe("신점");
    expect(snapshot["header.nav.mypage"]).toBe("마이페이지");
    expect(snapshot["common.skip-link"]).toBe("메인 콘텐츠로 이동");
    expect(snapshot["footer.tagline"]).toContain("타로");
  });

  it("en 사전은 5개 namespace 모두 영문화", () => {
    expect(t("header.nav.tarot", "en")).toBe("Tarot");
    expect(t("header.auth.login", "en")).toBe("Sign in");
    expect(t("footer.section.services", "en")).toBe("Services");
    expect(t("home.hero.title", "en")).toBe("Tarot & Fortune Reading");
    expect(t("settings.page.title", "en")).toBe("Settings");
  });

  it("ja 사전은 UI namespace 모두 채움 — 번역값 직접 반환", () => {
    expect(t("common.language", "ja")).toBe("言語");
    expect(t("locale.modal.title", "ja")).toBe("言語を選択してください");
    expect(t("header.nav.tarot", "ja")).toBe("タロット");
    expect(t("home.hero.title", "ja")).toBe("タロット＆運勢リーディング");
  });

  it("등록되지 않은 키는 키 자체 반환", () => {
    expect(t("foo.bar.missing", "en")).toBe("foo.bar.missing");
  });

  it("registerTranslations로 런타임에 사전 확장 가능", () => {
    registerTranslations("en", { "extra.key": "Extra" });
    expect(t("extra.key", "en")).toBe("Extra");
  });

  it("clearTranslations 후에도 정적 ko/en/ja 사전은 복원됨", () => {
    registerTranslations("en", { "tmp": "tmp" });
    clearTranslations();
    expect(t("tmp", "en")).toBe("tmp"); // 키 미등록 → 자기자신
    expect(t("header.nav.tarot", "en")).toBe("Tarot"); // 정적 사전은 살아있음
  });
});
