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
  // 사주 분석영역
  "saju-general": "/images/icons/saju-general.png",
  "saju-love-single": "/images/icons/topic-love-single.png",
  "saju-love-couple": "/images/icons/topic-love-couple.png",
  "saju-career": "/images/icons/topic-finance.png",
  "saju-health": "/images/icons/topic-health.png",
  "saju-personality": "/images/icons/saju-personality.png",
  "saju-compatibility": "/images/icons/saju-compatibility.png",
  "saju-date": "/images/icons/saju-date.png",
  // 사주 시간단위
  "saju-week": "/images/icons/saju-week.png",
  "saju-month": "/images/icons/saju-month.png",
  "saju-year": "/images/icons/saju-year.png",
  "saju-crystal": "/images/icons/saju-crystal.png",
  "saju-trend": "/images/icons/saju-trend.png",
  "saju-calendar": "/images/icons/saju-calendar.png",
  "saju-destiny": "/images/icons/saju-destiny.png",
  // 타로 스프레드
  "spread-card": "/images/icons/spread-card.png",
  "spread-three": "/images/icons/spread-three.png",
  "spread-five": "/images/icons/spread-five.png",
  "spread-celtic": "/images/icons/spread-celtic.png",
  "spread-relationship": "/images/icons/spread-relationship.png",
  "spread-horseshoe": "/images/icons/spread-horseshoe.png",
  "spread-decision": "/images/icons/spread-decision.png",
  "spread-week": "/images/icons/spread-week.png",
  "spread-zodiac": "/images/icons/spread-zodiac.png",
  "spread-tree": "/images/icons/spread-tree.png",
  // 기타 UI
  "ui-settings": "/images/icons/ui-settings.png",
  "ui-auto-theme": "/images/icons/ui-auto-theme.png",
  "ui-info": "/images/icons/ui-info.png",
  "ui-target": "/images/icons/ui-target.png",
  "ui-hourglass": "/images/icons/ui-hourglass.png",
  "ui-book": "/images/icons/ui-book.png",
  "ui-person": "/images/icons/ui-person.png",
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
