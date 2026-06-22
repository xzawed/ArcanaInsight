"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n/useT";

interface ReadingProgressIndicatorProps {
  /** 시작 후 경과 초 (1초 단위 갱신, useSession 부모에서 관리). */
  elapsedSec: number;
  /** sessionId 확보 전 단계 여부 — true 면 "연결 중", false 면 "해석 중". */
  isConnecting: boolean;
  /** 캐릭터 effectTheme.primary — 스피너 글로우 색상에 활용. */
  primaryColor?: string;
}

/**
 * 타로 리딩 진행 인디케이터.
 * - phase === "reading" && isLoading && !readingError 조건에서 부모가 렌더 결정.
 * - 카드 뒤집기 연출은 시각 자산이라 유지 — 본 컴포넌트는 보조 인디케이터로 화면 하단 미니 배너.
 * - 30초 도달 시 long-wait 보조 텍스트 자동 노출 (사용자 인지 부담 완화).
 */
export function ReadingProgressIndicator({
  elapsedSec,
  isConnecting,
  primaryColor,
}: ReadingProgressIndicatorProps): React.ReactElement {
  const { t } = useT();
  const stageText = isConnecting
    ? t("tarot.session.progress.connecting")
    : t("tarot.session.progress.analyzing");
  const elapsedText = t("tarot.session.progress.elapsed").replace("{n}", String(elapsedSec));
  const showLongWait = elapsedSec >= 30;
  const glow = primaryColor ?? "#a78bfa";

  return (
    <motion.div
      data-testid="reading-progress"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-36 md:bottom-20 z-40 px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-full bg-arcana-card/85 border border-arcana-border backdrop-blur-md shadow-lg"
        style={{ boxShadow: `0 0 24px ${glow}33` }}
      >
        <motion.span
          className="block w-3.5 h-3.5 rounded-full"
          style={{ background: glow }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex flex-col">
          <span className="text-arcana-text text-xs md:text-sm font-sans font-bold leading-tight">
            {stageText}
          </span>
          <span className="text-arcana-muted text-[10px] md:text-xs font-sans leading-tight">
            {elapsedText}
            {showLongWait && (
              <>
                {" · "}
                <span className="text-arcana-purple">
                  {t("tarot.session.progress.long-wait")}
                </span>
              </>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
