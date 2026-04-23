/** 공유 링크 or 텍스트 공유/복사 유틸 — 3개 세션 페이지 공통 */
export async function shareOrCopy(params: {
  title: string;
  text: string;
  url?: string;
  onCopied?: () => void;
}): Promise<void> {
  const { title, text, url, onCopied } = params;
  const content = url ? `${text}\n${url}` : text;

  if (typeof navigator === "undefined") return;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch { /* 사용자 취소 */ } // NOSONAR
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    onCopied?.();
  } catch (e) {
    console.warn("클립보드 복사 실패:", e);
  }
}
