"use client";

interface ReadingTextProps {
  readonly text: string;
  readonly className?: string;
}

/** AI 응답 텍스트의 리터럴 이스케이프·JSON 잔여물을 제거하고 단락 구분 힌트를 추가 */
function normalizeText(text: string): string {
  let result = text
    .replaceAll(String.raw`\n`, "\n")
    .replaceAll(String.raw`\r`, "")
    .replaceAll(String.raw`\t`, " ")
    .replaceAll(String.raw`\"`, '"');

  result = result
    .replaceAll(/"(cardInterpretations|cardId|position|interpretation|overallReading|advice|isReversed)":\s*/g, "")
    .replaceAll(/^\s*[{}[\]]\s*$/gm, "")
    .replaceAll(/^["']+|["']+$/gm, "")
    .replaceAll(/,\s*$/gm, "");

  return result.replaceAll(/([.!?。])\s{2,}/g, "$1\n\n");
}

/**
 * 단락이 1개이고 200자 이상일 때 문장 단위로 150자 청크로 묶어 반환.
 * 분리가 의미 없으면 빈 배열 반환.
 */
function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.split(/(?<=[.!?。])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > 150 && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 1 ? chunks : [];
}

/** AI 리딩 텍스트를 단락별로 분리하여 렌더링 */
export function ReadingText({ text, className = "" }: ReadingTextProps) {
  const normalized = normalizeText(text);

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    const chunks = splitLongParagraph(paragraphs[0]);
    if (chunks.length > 0) {
      return (
        <div className={`space-y-3 ${className}`}>
          {chunks.map((chunk, i) => (
            <p key={i} className="text-arcana-text reading-text">
              {chunk}
            </p>
          ))}
        </div>
      );
    }
  }

  if (paragraphs.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-arcana-text reading-text whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
