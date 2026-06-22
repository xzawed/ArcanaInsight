"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterCard } from "@/components/character/CharacterCard";
import { characters } from "@/data/characters";
import { useT } from "@/i18n/useT";

interface FavoriteCharacterSelectorProps {
  currentCharacterId?: string | null;
  currentCharacterName?: string | null;
}

export function FavoriteCharacterSelector({ currentCharacterId, currentCharacterName }: FavoriteCharacterSelectorProps) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = async (characterId: string | null) => {
    const res = await fetch("/api/profile/favorite-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId }),
    });
    if (!res.ok) return;
    setOpen(false);
    startTransition(() => router.refresh());
  };

  return (
    <>
      {/* 선호 상담사 카드 (클릭 가능) */}
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-4 text-center w-full hover:border-arcana-purple/50 transition-colors group"
      >
        <p className={`text-sm font-sans font-bold truncate transition-colors ${currentCharacterName ? "text-arcana-indigo" : "text-arcana-muted"}`}>
          {isPending ? t("mypage.favorite.saving") : (currentCharacterName ?? t("mypage.favorite.unset"))}
        </p>
        <p className="text-arcana-muted text-xs mt-1 group-hover:text-arcana-purple/70 transition-colors">
          {t("mypage.profile.favorite-character")} {currentCharacterName ? t("mypage.favorite.action.change") : t("mypage.favorite.action.set")}
        </p>
      </button>

      {/* 모달 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-arcana-surface border border-arcana-border rounded-2xl p-6 w-full max-w-lg max-h-[80dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-bold text-base">{t("mypage.favorite.modal-title")}</h3>
                <button onClick={() => setOpen(false)} className="text-arcana-muted hover:text-arcana-text text-xl leading-none">✕</button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {characters.map((char, index) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    isSelected={char.id === currentCharacterId}
                    onClick={() => handleSelect(char.id)}
                    index={index}
                  />
                ))}
              </div>

              {currentCharacterId && (
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full py-2 rounded-full text-xs text-arcana-muted border border-arcana-border hover:border-arcana-purple/50 hover:text-arcana-text transition-colors"
                >
                  {t("mypage.favorite.action.unset")}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
