"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { SkinSelector } from "@/components/skin/SkinSelector";
import { cardSkins } from "@/data/skins";
import { useSkinStore } from "@/hooks/useSkinStore";

export function SkinGallery() {
  const { selectedSkinId, setSkin } = useSkinStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastName, setToastName] = useState("");

  const handleSelect = (skinId: string) => {
    if (skinId === selectedSkinId) return;
    const skin = cardSkins.find((s) => s.id === skinId);
    setSkin(skinId);
    if (skin) {
      setToastName(skin.nameKo);
      setToastVisible(true);
    }
  };

  // 2초 후 토스트 자동 숨김
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  return (
    <section id="skin-gallery" className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 섹션 헤더 */}
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-3">나만의 카드 디자인</h2>
          <p className="text-arcana-muted text-sm md:text-base max-w-lg mx-auto">
            취향에 맞는 카드 스킨을 선택해보세요
          </p>
        </ScrollReveal>

        {/* 스킨 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {cardSkins.map((skin, index) => (
            <ScrollReveal key={skin.id} delay={index * 0.08}>
              <SkinSelector
                skin={skin}
                isSelected={selectedSkinId === skin.id}
                onSelect={handleSelect}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* 스킨 변경 토스트 알림 */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-arcana-gold text-[#08081a] text-sm font-serif font-bold shadow-xl whitespace-nowrap pointer-events-none"
          >
            ✨ {toastName} 스킨이 적용되었습니다
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
