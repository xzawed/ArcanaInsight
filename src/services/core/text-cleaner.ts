/** AI 응답 텍스트에서 이스케이프/코드 잔여물을 정리 */
export function cleanReadingText(text: string): string {
  return text
    .replace(/\\n\\n/g, "\n\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
