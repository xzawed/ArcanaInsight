/** 서비스 공통 에러 메시지 — UX 일관성 보장 */
export const ERROR_MESSAGES = {
  API_CONFIG: "AI 서비스 설정에 문제가 있어요. 관리자에게 문의해주세요.",
  SERVER_TEMP: "서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.",
  NETWORK: "네트워크 문제가 발생했어요. 인터넷 연결을 확인해주세요.",
  READING_FAIL: "해석 중 문제가 발생했어요. 다시 시도해주세요.",
  RESULT_MISSING: "결과를 받지 못했어요. 다시 시도해주세요.",
  RATE_LIMIT: "요청이 많아 잠시 후 다시 시도해주세요.",
} as const;

/** 에러 메시지에서 API 키 문제를 감지 */
export function getErrorMessage(error: string): string {
  if (error.includes("API_KEY") || error.includes("auth") || error.includes("401")) {
    return ERROR_MESSAGES.API_CONFIG;
  }
  if (error.includes("rate limit") || error.includes("429")) {
    return ERROR_MESSAGES.RATE_LIMIT;
  }
  return ERROR_MESSAGES.SERVER_TEMP;
}
