"use client";

interface ReadingTextProps {
  text: string;
  className?: string;
}

/** AI 리딩 텍스트를 단락별로 분리하여 렌더링 */
export function ReadingText({ text, className = "" }: ReadingTextProps) {
  // 리터럴 \\n이 남아있을 경우 실제 줄바꿈으로 변환
  const normalized = text.replace(/\\n/g, "\n");

  // 빈 줄(\n\n) 기준으로 단락 분리
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

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
