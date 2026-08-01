import { describe, it, expect, afterEach } from "vitest";
import {
  CHARACTER_VARIANT_WIDTHS,
  characterImageLoader,
  getCharacterImageUrl,
} from "./character-image";

const KEY = "NEXT_PUBLIC_ASSET_BASE_URL";
const orig = process.env[KEY];
afterEach(() => {
  if (orig === undefined) delete process.env[KEY];
  else process.env[KEY] = orig;
});

describe("getCharacterImageUrl", () => {
  it("NEXT_PUBLIC_ASSET_BASE_URL 설정 시 R2/CDN URL을 반환한다", () => {
    process.env[KEY] = "https://cdn.xzawed.xyz";
    expect(getCharacterImageUrl("arcana", "idle")).toBe(
      "https://cdn.xzawed.xyz/characters/arcana/nukki-enhanced/idle.png",
    );
  });

  it("base URL 끝 슬래시를 정규화한다(이중 슬래시 방지)", () => {
    process.env[KEY] = "https://cdn.xzawed.xyz/";
    expect(getCharacterImageUrl("luna", "default")).toBe(
      "https://cdn.xzawed.xyz/characters/luna/nukki-enhanced/default.png",
    );
  });

  it("env 미설정 시 로컬 public 경로로 폴백한다", () => {
    delete process.env[KEY];
    expect(getCharacterImageUrl("seonhwa", "mystical")).toBe(
      "/images/characters/seonhwa/nukki-enhanced/mystical.png",
    );
  });
});

/**
 * 이 로더는 프로덕션에서 캐릭터 이미지 전량을 책임진다 — 폭 매핑이 틀리면 존재하지 않는
 * 변형을 가리켜 **이미지가 통째로 404**가 된다. 그런데 도입 시점에 테스트가 없었다.
 */
describe("characterImageLoader", () => {
  it("마스터 PNG 경로를 같은 폭의 WebP 변형 경로로 바꾼다", () => {
    expect(
      characterImageLoader({
        src: "https://cdn.xzawed.xyz/characters/arcana/nukki-enhanced/idle.png",
        width: 320,
      }),
    ).toBe("https://cdn.xzawed.xyz/characters/arcana/nukki-enhanced/idle-320.webp");
  });

  it("로컬 폴백 경로에서도 동작한다", () => {
    expect(
      characterImageLoader({ src: "/images/characters/luna/nukki-enhanced/smile.png", width: 640 }),
    ).toBe("/images/characters/luna/nukki-enhanced/smile-640.webp");
  });

  it("요청 폭 이상인 가장 작은 변형을 고른다(업스케일 방지)", () => {
    const src = "/images/characters/miko/nukki-enhanced/idle.png";
    expect(characterImageLoader({ src, width: 1 })).toContain("-320.webp");
    expect(characterImageLoader({ src, width: 320 })).toContain("-320.webp");
    expect(characterImageLoader({ src, width: 321 })).toContain("-640.webp");
    expect(characterImageLoader({ src, width: 960 })).toContain("-960.webp");
  });

  it("사다리 최댓값을 넘는 요청은 최대 변형으로 고정한다", () => {
    const src = "/images/characters/zero/nukki-enhanced/wink.png";
    const max = CHARACTER_VARIANT_WIDTHS[CHARACTER_VARIANT_WIDTHS.length - 1];
    expect(characterImageLoader({ src, width: 4000 })).toContain(`-${max}.webp`);
  });

  it("모든 사다리 폭이 정확히 자기 자신에 매핑된다", () => {
    const src = "/images/characters/rei/nukki-enhanced/serious.png";
    for (const w of CHARACTER_VARIANT_WIDTHS) {
      expect(characterImageLoader({ src, width: w })).toBe(
        `/images/characters/rei/nukki-enhanced/serious-${w}.webp`,
      );
    }
  });

  it("사다리는 오름차순이어야 한다 — 아니면 폭 선택이 틀어진다", () => {
    const sorted = [...CHARACTER_VARIANT_WIDTHS].sort((a, b) => a - b);
    expect([...CHARACTER_VARIANT_WIDTHS]).toEqual(sorted);
  });
});
