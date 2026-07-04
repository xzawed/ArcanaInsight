"use client";

import { ReadingText } from "@/components/common/ReadingText";

interface ReadingSectionBlockProps {
  icon: string;
  label: string;
  content: string;
}

export function ReadingSectionBlock({ icon, label, content }: Readonly<ReadingSectionBlockProps>) {
  if (!content) return null;
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-arcana-gold text-xs font-bold tracking-widest uppercase font-sans">
          {icon} {label}
        </span>
      </div>
      <div className="border-t border-arcana-border/40 pt-3">
        <ReadingText text={content} />
      </div>
    </div>
  );
}
