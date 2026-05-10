'use client';

import { useThemeStore } from '@/hooks/useTheme';
import { useCardStyleStore } from '@/hooks/useCardStyleStore';
import { cardStyles, getStyleName, getStyleDescription } from '@/data/cardStyles';
import { useLocaleStore } from '@/hooks/useLocaleStore';
import { useT } from '@/i18n/useT';

export function CardStyleSelector() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { activeTheme } = useThemeStore();
  const { styleOverride, setStyleOverride, clearOverride, resolvedStyle } = useCardStyleStore();

  const activeStyleId = resolvedStyle(activeTheme);

  return (
    <div className="space-y-3">
      {/* 자동 매핑 버튼 */}
      <button
        onClick={clearOverride}
        className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
          styleOverride === null
            ? 'border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm'
            : 'border-arcana-border/50 text-arcana-muted hover:border-arcana-border'
        }`}
      >
        <span className="text-base">🎨</span>
        <span className="font-sans font-medium">{t('settings.card-style.auto-label')}</span>
        {styleOverride === null && (
          <span className="ml-auto text-xs text-arcana-muted">
            {t('settings.card-style.auto-active')} ({activeStyleId})
          </span>
        )}
      </button>

      {/* 4개 스타일 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        {cardStyles.map((style) => {
          const isActive = styleOverride === style.id;
          return (
            <button
              key={style.id}
              onClick={() => setStyleOverride(style.id)}
              className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm'
                  : 'border-arcana-border/50 text-arcana-muted hover:border-arcana-border'
              }`}
            >
              <span className="font-sans font-semibold text-sm">
                {getStyleName(style, locale)}
              </span>
              <span className="text-xs leading-snug opacity-70">
                {getStyleDescription(style, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
