import { describe, it, expect, vi } from "vitest";
import { withAbortTimeout, readSseLines } from "./http-utils";

function makeResponse(lines: string[]): Response {
  const body = lines.join("\n") + "\n";
  return new Response(body);
}

describe("withAbortTimeout", () => {
  it("정상 완료 — 값 반환", async () => {
    const result = await withAbortTimeout(async () => "ok", 5_000);
    expect(result).toBe("ok");
  });

  it("타임아웃 — signal abort 후 fn이 throw하면 전파", async () => {
    const fn = vi.fn().mockImplementation((signal: AbortSignal) =>
      new Promise<string>((_, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    await expect(withAbortTimeout(fn, 10)).rejects.toThrow();
  });
});

describe("readSseLines", () => {
  it("body가 null → throw", async () => {
    const nullBody = { body: null } as unknown as Response;
    const gen = readSseLines(nullBody, () => null);
    await expect(gen.next()).rejects.toThrow("Response body is null");
  });

  it("[DONE] 수신 시 종료", async () => {
    const res = makeResponse(["data: [DONE]"]);
    const chunks: string[] = [];
    for await (const c of readSseLines(res, () => null)) chunks.push(c);
    expect(chunks).toHaveLength(0);
  });

  it("정상 JSON 이벤트 → extractDelta가 반환한 값 yield", async () => {
    const res = makeResponse(["data: {\"delta\":\"hello\"}"]);
    const chunks: string[] = [];
    for await (const c of readSseLines(res, (p) => (p as { delta?: string }).delta ?? null)) {
      chunks.push(c);
    }
    expect(chunks).toEqual(["hello"]);
  });

  it("data: 접두사 없는 라인 무시", async () => {
    const res = makeResponse(["noise", "data: {\"delta\":\"world\"}"]);
    const chunks: string[] = [];
    for await (const c of readSseLines(res, (p) => (p as { delta?: string }).delta ?? null)) {
      chunks.push(c);
    }
    expect(chunks).toEqual(["world"]);
  });

  it("잘못된 JSON → 경고만, 나머지 계속 처리", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = makeResponse(["data: bad-json", "data: {\"delta\":\"fine\"}"]);
    const chunks: string[] = [];
    for await (const c of readSseLines(res, (p) => (p as { delta?: string }).delta ?? null)) {
      chunks.push(c);
    }
    expect(chunks).toEqual(["fine"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("signal이 이미 abort된 상태면 reader.cancel 후 AbortError throw", async () => {
    const controller = new AbortController();
    controller.abort();

    const res = makeResponse(["data: {\"delta\":\"hello\"}"]);
    const gen = readSseLines(res, () => null, "TEST", controller.signal);

    await expect(gen.next()).rejects.toThrow(DOMException);
  });
});
