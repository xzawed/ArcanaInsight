"use client";

import Image from "next/image";
import { useThemeStore, themes, getThemeName, type ThemeId } from "@/hooks/useTheme";
import { Icon } from "@/components/common/Icon";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/hooks/useLocaleStore";

const themeList = Object.values(themes);

interface ThemeDropdownProps {
  variant: "desktop" | "mobile";
  onClose: () => void;
}

export function ThemeDropdown({ variant, onClose }: ThemeDropdownProps) {
  const { mode, activeTheme, setMode } = useThemeStore();
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const activeThemeName = getThemeName(themes[activeTheme], locale);

  const isDesktop = variant === "desktop";

  return (
    <div
      className={`absolute right-0 mt-2 w-52 bg-arcana-card/90 backdrop-blur-md rounded-xl border border-arcana-border shadow-xl shadow-black/30 overflow-hidden${isDesktop ? "" : " z-50"}`}
    >
      {isDesktop && (
        <div className="px-3 py-2 border-b border-arcana-border">
          <p className="text-arcana-muted text-[10px] font-serif">{t("header.theme.settings-label")}</p>
        </div>
      )}
      <button
        data-testid={isDesktop ? "theme-option-auto" : "mobile-theme-option-auto"}
        onClick={() => { setMode("auto"); onClose(); }}
        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
          mode === "auto" ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
        }`}
      >
        <Icon id="ui-auto-theme" size={16} />
        <span className="font-serif text-xs">{t("settings.theme.auto-label")}</span>
        {isDesktop && mode === "auto" && (
          <span className="ml-auto text-[10px] text-arcana-muted">{activeThemeName}</span>
        )}
      </button>
      <div className="border-t border-arcana-border" />
      {themeList.map((th) => (
        <button
          key={th.id}
          data-testid={isDesktop ? `theme-option-${th.id}` : `mobile-theme-option-${th.id}`}
          onClick={() => { setMode(th.id as ThemeId); onClose(); }}
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
            mode === th.id ? "bg-arcana-purple/15 text-arcana-purple" : "text-arcana-text hover:bg-arcana-purple/10"
          }`}
        >
          <Image src={th.iconPath} alt="" width={16} height={16} unoptimized />
          <span className="font-serif text-xs">{getThemeName(th, locale)}</span>
          <span
            className="ml-auto w-3 h-3 rounded-full border border-arcana-border"
            style={{ backgroundColor: th.colors.primary }}
          />
        </button>
      ))}
    </div>
  );
}
