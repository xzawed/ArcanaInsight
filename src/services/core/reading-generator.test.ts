import { describe, it, expect, vi } from "vitest";
import { streamReadingWithParseRetry } from "./reading-generator";
import type { AIProvider } from "@/types/service";

/** 테스트용 mock provider — streamReading은 청크 배열을 yield, generateReading은 지정 문자열 반환 */
function makeProvider(streamChunks: string[], generateResponses: string[]): AIProvider {
  let genCall = 0;
  return {
    async *streamReading() {
      for (const c of streamChunks) yield c;
    },
    async generateReading() {
      const r = generateResponses[genCall] ?? generateResponses.at(-1) ?? "";
      genCall++;
      return r;
    },
  } as AIProvider;
}

const parse = (raw: string) =>
  raw.includes("BAD") ? { parseError: "invalid_json" as const, text: raw } : { text: raw };

describe("streamReadingWithParseRetry", () => {
  it("1차 파싱 성공 시 재생성하지 않고 결과를 반환한다", async () => {
    const provider = makeProvider(["OK"], ["should-not-be-used"]);
    const genSpy = vi.spyOn(provider, "generateReading");
    const onChunk = vi.fn();
    const { result, retried } = await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk,
    });
    expect(result.parseError).toBeUndefined();
    expect(retried).toBe(false);
    expect(genSpy).not.toHaveBeenCalled();
    expect(onChunk).toHaveBeenCalledWith("OK");
  });

  it("1차 파싱 실패 시 1회 재생성하고 성공하면 재생성 결과를 채택한다", async () => {
    const provider = makeProvider(["BAD"], ["GOOD"]);
    const { result, retried, fullResponse } = await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk: () => {},
    });
    expect(retried).toBe(true);
    expect(result.parseError).toBeUndefined();
    expect(fullResponse).toBe("GOOD");
  });

  it("재생성도 실패하면 1차(원본) 결과를 유지한다", async () => {
    const provider = makeProvider(["BAD1"], ["BAD2"]);
    const { result, retried } = await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk: () => {},
    });
    expect(retried).toBe(true);
    expect(result.parseError).toBe("invalid_json");
    expect(result.text).toBe("BAD1");
  });

  it("재생성 호출 자체가 throw하면 1차 결과를 유지한다(가용성 우선)", async () => {
    const provider = makeProvider(["BAD"], []);
    vi.spyOn(provider, "generateReading").mockRejectedValue(new Error("network"));
    const { result, retried } = await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk: () => {},
    });
    expect(retried).toBe(true);
    expect(result.parseError).toBe("invalid_json");
  });

  it("maxRetries=0이면 재생성하지 않는다", async () => {
    const provider = makeProvider(["BAD"], ["GOOD"]);
    const genSpy = vi.spyOn(provider, "generateReading");
    const { result, retried } = await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk: () => {}, maxRetries: 0,
    });
    expect(retried).toBe(false);
    expect(result.parseError).toBe("invalid_json");
    expect(genSpy).not.toHaveBeenCalled();
  });

  it("스트리밍된 모든 청크를 onChunk로 순서대로 전달한다", async () => {
    const provider = makeProvider(["a", "b", "c"], ["x"]);
    const chunks: string[] = [];
    await streamReadingWithParseRetry({
      provider, systemPrompt: "s", userPrompt: "u", maxTokens: 100, parse, onChunk: (c) => chunks.push(c),
    });
    expect(chunks).toEqual(["a", "b", "c"]);
  });
});
