"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { SkinSelector } from "@/components/skin/SkinSelector";
import { StyleSelector } from "@/components/skin/StyleSelector";
import { cardSkins } from "@/data/skins";
import { cardStyles } from "@/data/cardStyles";
import type { CardStyleId } from "@/data/cardStyles";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useCardStyleStore } from "@/hooks/useCardStyleStore";
import { useThemeStore } from "@/hooks/useTheme";

const TOAST_VISIBILITY_MS = 2000

export function SkinGallery() {
  const { selectedSkinId, setSkin } = useSkinStore();
  const { styleOverride, setStyleOverride, resolvedStyle } = useCardStyleStore();
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastName, setToastName] = useState("");

  const currentStyleId = resolvedStyle(activeTheme);

  const handleSkinSelect = (skinId: string) => {
    if (skinId === selectedSkinId) return;
    const skin = cardSkins.find((s) => s.id === skinId);
    setSkin(skinId);
    if (skin) {
      setToastName(skin.nameKo);
      setToastVisible(true);
    }
  };

  const handleStyleSelect = (styleId: CardStyleId) => {
    if (styleId === styleOverride) return;
    const style = cardStyles.find((s) => s.id === styleId);
    setStyleOverride(styleId);
    if (style) {
      setToastName(style.nameKo);
      setToastVisible(true);
    }
  };

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), TOAST_VISIBILITY_MS);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  return (
    <section id="skin-gallery" className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 섹션 헤더 */}
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-3">나만의 카드 디자인</h2>
          <p className="text-arcana-muted text-sm md:text-base max-w-lg mx-auto">
            취향에 맞는 카드 스킨을 선택해보세요
          </p>
        </ScrollReveal>

        {/* 카드 디자인 그리드 — 아트 스타일 4개 + 팔레트 스킨 6개 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {cardStyles.map((style, index) => (
            <ScrollReveal key={style.id} delay={index * 0.08}>
              <StyleSelector
                style={style}
                isSelected={currentStyleId === style.id}
                onSelect={handleStyleSelect}
              />
            </ScrollReveal>
          ))}
          {cardSkins.map((skin, index) => (
            <ScrollReveal key={skin.id} delay={(cardStyles.length + index) * 0.08}>
              <SkinSelector
                skin={skin}
                isSelected={selectedSkinId === skin.id}
                onSelect={handleSkinSelect}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* 스킨/스타일 변경 토스트 알림 */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-arcana-gold text-[#08081a] text-sm font-display font-bold shadow-xl whitespace-nowrap pointer-events-none"
          >
            ✨ {toastName} 스킨이 적용되었습니다
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
