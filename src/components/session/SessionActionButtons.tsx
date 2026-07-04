"use client";

interface SessionActionButtonsProps {
  onNewSession: () => void;
  onShare: () => void;
  newSessionLabel: string;
  shareLabel: string;
  className?: string;
}

export function SessionActionButtons({ onNewSession, onShare, newSessionLabel, shareLabel, className }: Readonly<SessionActionButtonsProps>) {
  return (
    <div className={`flex gap-3 pt-5 flex-shrink-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onNewSession}
        className="flex-1 px-6 py-2.5 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
      >
        {newSessionLabel}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="flex-1 px-6 py-2.5 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/20"
      >
        {shareLabel}
      </button>
    </div>
  );
}
