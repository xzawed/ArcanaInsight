"use client";

interface ReadingErrorStateProps {
  titleText: string;
  errorText: string;
  tryAgainText: string;
  newSessionText: string;
  onRetry: () => void;
  onNewSession: () => void;
  isRetrying?: boolean;
}

export function ReadingErrorState({ titleText, errorText, tryAgainText, newSessionText, onRetry, onNewSession, isRetrying }: Readonly<ReadingErrorStateProps>) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl bg-arcana-card/90 border border-red-500/40 shadow-xl backdrop-blur-md max-w-sm" data-testid="reading-error">
      <p className="text-arcana-text text-sm md:text-base font-serif font-bold text-center">{titleText}</p>
      <p className="text-arcana-muted text-xs md:text-sm font-sans text-center">{errorText}</p>
      <div className="flex gap-3">
        <button
          type="button"
          data-testid="reading-retry"
          onClick={onRetry}
          disabled={isRetrying}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-serif font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tryAgainText}
        </button>
        <button
          type="button"
          onClick={onNewSession}
          className="px-6 py-2 rounded-full border border-arcana-purple text-arcana-purple font-serif font-bold text-sm hover:bg-arcana-purple/10 transition-colors"
        >
          {newSessionText}
        </button>
      </div>
    </div>
  );
}
