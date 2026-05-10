import { describe, it, expect } from "vitest";
import { flatten } from "../translations/shared/keys";

describe("flatten — namespace 키 결합", () => {
  it("namespace prefix를 키 앞에 붙여 평탄화", () => {
    const out = flatten("header", {
      "logo.alt": "ArcanaInsight",
      "nav.home": "홈",
      "nav.tarot": "타로",
      "nav.saju": "사주",
      "nav.shinjeom": "신점",
      "nav.mypage": "마이페이지",
      "nav.settings": "설정",
      "auth.login": "로그인",
      "auth.logout": "로그아웃",
      "auth.signup": "회원가입",
      "theme.label": "테마",
      "theme.auto": "자동",
      "theme.change-aria": "테마 변경",
      "theme.settings-label": "테마 설정",
      "user-menu-aria": "사용자 메뉴",
    });
    expect(out["header.nav.tarot"]).toBe("타로");
    expect(out["header.auth.login"]).toBe("로그인");
    expect(Object.keys(out)).toHaveLength(15);
  });

  it("빈 사전이면 빈 객체 반환", () => {
    const out = flatten("common", {} as never);
    expect(out).toEqual({});
  });
});
