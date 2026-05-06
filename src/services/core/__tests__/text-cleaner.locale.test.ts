import { describe, it, expect } from "vitest";
import { parseJsonSafe } from "../text-cleaner";

describe("parseJsonSafe — 다국어 응답 안전성", () => {
  it("일본어 카기카쿠코(「」) 포함 JSON 파싱", () => {
    const raw = `{"overall":"運命の扉が「ゆっくり」開かれます。"}`;
    expect(parseJsonSafe(raw)).toEqual({
      overall: "運命の扉が「ゆっくり」開かれます。",
    });
  });

  it("영어 응답 JSON 파싱", () => {
    const raw = `{"overall":"The door of fate opens slowly."}`;
    expect(parseJsonSafe(raw)).toEqual({
      overall: "The door of fate opens slowly.",
    });
  });

  it("일본어 마크다운 코드블록 ```json ... ``` 추출", () => {
    const raw = `\`\`\`json\n{"reading":"星々が「希望」を語ります"}\n\`\`\``;
    expect(parseJsonSafe(raw)).toEqual({
      reading: "星々が「希望」を語ります",
    });
  });

  it("3개 locale 혼합 시 한국어 키 무손실", () => {
    const raw = `{"ko":"운세","en":"fortune","ja":"運勢"}`;
    expect(parseJsonSafe(raw)).toEqual({
      ko: "운세",
      en: "fortune",
      ja: "運勢",
    });
  });
});
