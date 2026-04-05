"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/common/Icon";

interface NavItem {
  href: string;
  label: string;
  iconId: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "홈", iconId: "nav-home" },
  { href: "/tarot", label: "타로", iconId: "nav-tarot" },
  { href: "/saju", label: "사주", iconId: "nav-saju" },
  { href: "/shinjeom", label: "신점", iconId: "nav-shinjeom" },
  { href: "/mypage", label: "MY", iconId: "nav-mypage" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-arcana-bg/90 backdrop-blur-md border-t border-arcana-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" || item.href === "/#daily-card"
            ? pathname === "/" && item.href === "/"
            : pathname.startsWith(item.href);

          const content = (
            <span
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] px-3 py-1 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-arcana-purple/15 text-arcana-purple"
                  : "text-arcana-muted"
              }`}
            >
              <Icon id={item.iconId} size={20} />
              <span className={`text-xs font-sans leading-tight ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </span>
          );

          return (
            <Link key={item.href} href={item.href} className="flex items-center justify-center"
              onClick={(e) => { (e.currentTarget as HTMLElement).blur(); }}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
