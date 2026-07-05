import type { AIProvider } from "@/types/service";

/**
 * 리딩 생성 + 파싱 실패 시 1회 재생성.
 *
 * 배경(2026-07-06 조사): 사주·신점 리딩이 간헐적으로 JSON 형식 위반(트레일링 콤마·필드 중첩)을 내
 * parseResult가 parseError를 반환 → 사용자 무결과/부실 결과. 모델이 ~⅓만 실패하므로, 첫 시도가
 * parseError면 **한 번 더** 생성해 대부분을 흡수한다.
 *
 * - 1차: streamReading (청크는 onChunk로 클라이언트에 전달 — 대기 연출/스트리밍 표시용).
 * - 재시도: generateReading (non-stream) — 중복 청크 이벤트를 보내지 않기 위해 스트리밍하지 않는다.
 *   (3개 리딩 라우트 모두 최종 결과는 done 이벤트로만 소비하므로 재시도 청크 미표시는 UX에 무해.)
 * - 재시도 결과가 parseError 없으면 채택, 아니면 1차 결과를 유지(결정론적).
 * - 재시도 생성 자체가 throw하면 1차 결과를 유지(가용성 우선).
 */
export async function streamReadingWithParseRetry<T extends { parseError?: string }>(opts: {
  provider: AIProvider;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  parse: (raw: string) => T;
  onChunk: (chunk: string) => void;
  maxRetries?: number;
  logTag?: string;
}): Promise<{ result: T; fullResponse: string; retried: boolean }> {
  const { provider, systemPrompt, userPrompt, maxTokens, parse, onChunk, maxRetries = 1, logTag = "reading" } = opts;

  let fullResponse = "";
  for await (const chunk of provider.streamReading(systemPrompt, userPrompt, maxTokens)) {
    fullResponse += chunk;
    onChunk(chunk);
  }
  let result = parse(fullResponse);
  let retried = false;

  for (let i = 0; i < maxRetries && result.parseError; i++) {
    retried = true;
    console.warn(`[${logTag}] parseError=${result.parseError} → 재생성 ${i + 1}/${maxRetries}`);
    try {
      const retryResponse = await provider.generateReading(systemPrompt, userPrompt, maxTokens);
      const retryResult = parse(retryResponse);
      if (!retryResult.parseError) {
        result = retryResult;
        fullResponse = retryResponse;
        break;
      }
    } catch (e) {
      console.warn(`[${logTag}] 재생성 실패:`, e instanceof Error ? e.message : String(e));
      break;
    }
  }

  return { result, fullResponse, retried };
}
