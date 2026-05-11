"use client";

import Link from "next/link";
import { useT } from "@/i18n/useT";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="bg-arcana-surface border-t border-arcana-border mt-auto">
      {/* 상단 섹션 */}
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 컬럼 1: 로고 & 설명 */}
        <div>
          <span className="text-lg font-display font-bold bg-gradient-to-r from-arcana-purple to-arcana-indigo bg-clip-text text-transparent">
            ArcanaInsight
          </span>
          <p className="mt-2 text-sm text-arcana-muted leading-relaxed">
            {t("footer.tagline")}
          </p>
        </div>

        {/* 컬럼 2: 서비스 링크 */}
        <div>
          <h3 className="font-serif font-bold text-arcana-text text-sm mb-3">{t("footer.section.services")}</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/tarot" className="text-sm text-arcana-muted hover:text-arcana-purple transition-colors">
                {t("footer.link.tarot")}
              </Link>
            </li>
            <li>
              <Link href="/#daily-fortune" className="text-sm text-arcana-muted hover:text-arcana-purple transition-colors">
                {t("footer.link.daily-card")}
              </Link>
            </li>
            <li>
              <Link href="/mypage" className="text-sm text-arcana-muted hover:text-arcana-purple transition-colors">
                {t("footer.link.mypage")}
              </Link>
            </li>
          </ul>
        </div>

        {/* 컬럼 3: 정보 링크 */}
        <div>
          <h3 className="font-serif font-bold text-arcana-text text-sm mb-3">{t("footer.section.info")}</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/terms" className="text-sm text-arcana-muted hover:text-arcana-purple transition-colors">
                {t("footer.link.terms")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-sm text-arcana-muted hover:text-arcana-purple transition-colors">
                {t("footer.link.privacy")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 하단 섹션 */}
      <div className="border-t border-arcana-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-arcana-muted">
          <p>&copy; 2026 ArcanaInsight. All rights reserved.</p>
          <p>Powered by Grok AI</p>
        </div>
      </div>
    </footer>
  );
}
