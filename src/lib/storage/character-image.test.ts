import { describe, it, expect, afterEach } from "vitest";
import { getCharacterImageUrl } from "./character-image";

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
