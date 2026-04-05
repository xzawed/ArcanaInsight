"use client";

interface ReadingTextProps {
  text: string;
  className?: string;
}

/** AI 리딩 텍스트를 단락별로 분리하여 렌더링 */
export function ReadingText({ text, className = "" }: ReadingTextProps) {
  // 1. 리터럴 이스케이프 시퀀스를 실제 문자로 변환
  let normalized = text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"');

  // 2. JSON 잔여물 정리 (AI가 JSON 키를 텍스트에 포함시킨 경우)
  normalized = normalized
    .replace(/"(cardInterpretations|cardId|position|interpretation|overallReading|advice|isReversed)":\s*/g, "")
    .replace(/^\s*[{}\[\]]\s*$/gm, "")
    .replace(/^["']+|["']+$/gm, "")
    .replace(/,\s*$/gm, "");

  // 3. 연속 마침표/느낌표/물음표 뒤에 줄바꿈이 없으면 단락 분리 힌트 추가
  //    (AI가 줄바꿈 없이 긴 텍스트를 반환하는 경우 대응)
  normalized = normalized.replace(/([.!?。])\s{2,}/g, "$1\n\n");

  // 4. 빈 줄(\n\n) 기준으로 단락 분리
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // 5. 단락이 1개인데 너무 길면 (200자 이상) 문장 단위로 분리 시도
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    const sentences = paragraphs[0].split(/(?<=[.!?。])\s+/);
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

    if (chunks.length > 1) {
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
