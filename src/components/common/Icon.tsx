import Image from "next/image";

const iconMap: Record<string, string> = {
  // 네비��이션
  "nav-home": "/images/icons/nav-home.png",
  "nav-tarot": "/images/icons/nav-tarot.png",
  "nav-saju": "/images/icons/nav-saju.png",
  "nav-shinjeom": "/images/icons/nav-shinjeom.png",
  "nav-mypage": "/images/icons/nav-mypage.png",
  // 신점 카테고리
  "shinjeom-general": "/images/icons/shinjeom-general.png",
  "shinjeom-love": "/images/icons/shinjeom-love.png",
  "shinjeom-wealth": "/images/icons/shinjeom-wealth.png",
  "shinjeom-career": "/images/icons/shinjeom-career.png",
  "shinjeom-health": "/images/icons/shinjeom-health.png",
  "shinjeom-auspicious": "/images/icons/shinjeom-auspicious.png",
  // 타로 주제
  "topic-love-single": "/images/icons/topic-love-single.png",
  "topic-love-couple": "/images/icons/topic-love-couple.png",
  "topic-career": "/images/icons/topic-career.png",
  "topic-finance": "/images/icons/topic-finance.png",
  "topic-health": "/images/icons/topic-health.png",
  "topic-general": "/images/icons/topic-general.png",
  // 테마
  "theme-midnight": "/images/icons/theme-midnight.png",
  "theme-dawn": "/images/icons/theme-dawn.png",
  "theme-sunset": "/images/icons/theme-sunset.png",
  "theme-spring": "/images/icons/theme-spring.png",
  "theme-summer": "/images/icons/theme-summer.png",
  "theme-autumn": "/images/icons/theme-autumn.png",
  "theme-winter": "/images/icons/theme-winter.png",
  // 기타 UI
  "ui-settings": "/images/icons/ui-settings.png",
  "ui-auto-theme": "/images/icons/ui-auto-theme.png",
  "ui-info": "/images/icons/ui-info.png",
  "ui-target": "/images/icons/ui-target.png",
};

interface IconProps {
  id: string;
  size?: number;
  className?: string;
}

export function Icon({ id, size = 24, className }: IconProps) {
  const src = iconMap[id];
  if (!src) return <span>{id}</span>;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block ${className ?? ""}`}
      unoptimized
    />
  );
}

export { iconMap };
