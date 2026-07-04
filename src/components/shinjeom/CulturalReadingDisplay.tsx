"use client";

import { CULTURAL_TOPIC_INFO } from "@/data/shinjeom/cultural-readings";

interface Props {
  topicId: string;
  locale: string;
}

/** EN/JA locale에서 신점 주제 카드 하단에 한국어 원문 + 로마자를 병기. ko에서는 렌더링 안 함. */
export function CulturalReadingDisplay({ topicId, locale }: Readonly<Props>) {
  if (locale === "ko") return null;
  const info = CULTURAL_TOPIC_INFO[topicId];
  if (!info) return null;
  return (
    <span className="text-[10px] text-arcana-purple/60 font-serif tracking-wide mt-0.5">
      {info.koTerm} · {info.romaja}
    </span>
  );
}
