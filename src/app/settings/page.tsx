"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useThemeStore, themes, ThemeId } from "@/hooks/useTheme";
import { useSkinStore } from "@/hooks/useSkinStore";
import { useGenderStore } from "@/hooks/useGenderStore";
import { cardSkins } from "@/data/skins";
import { GenderFilter } from "@/types/character";
import { getCharactersByGender, getCharacterById } from "@/data/characters";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { mode, activeTheme, setMode } = useThemeStore();
  const { selectedSkinId, setSkin } = useSkinStore();
  const { genderFilter, setGenderFilter } = useGenderStore();

  const [confirmEachCard, setConfirmEachCard] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("arcana-confirm-each-card") === "true";
    return false;
  });
  const [hasSavedInfo, setHasSavedInfo] = useState(() => {
    if (typeof window !== "undefined") return !!localStorage.getItem("arcana_user_info");
    return false;
  });

  // 선호 상담사
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteCharacterId, setFavoriteCharacterId] = useState<string | null>(null);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("favorite_character_id").eq("id", user.id).single()
          .then(({ data }) => setFavoriteCharacterId(data?.favorite_character_id ?? null));
      } else {
        const saved = localStorage.getItem("arcana-favorite-character");
        if (saved) setFavoriteCharacterId(saved);
      }
    });
  }, []);

  const handleSelectFavorite = async (characterId: string) => {
    const newValue = favoriteCharacterId === characterId ? null : characterId;
    setFavoriteCharacterId(newValue);

    if (userId) {
      setIsSavingFavorite(true);
      const supabase = createClient();
      await supabase.from("profiles").update({ favorite_character_id: newValue }).eq("id", userId);
      setIsSavingFavorite(false);
    } else {
      if (newValue) {
        localStorage.setItem("arcana-favorite-character", newValue);
      } else {
        localStorage.removeItem("arcana-favorite-character");
      }
    }
  };

  const filteredCharacters = getCharactersByGender(genderFilter);

  const toggleConfirmMode = () => {
    const next = !confirmEachCard;
    setConfirmEachCard(next);
    localStorage.setItem("arcana-confirm-each-card", String(next));
  };

  const clearSavedInfo = () => {
    localStorage.removeItem("arcana_user_info");
    localStorage.removeItem("arcana_privacy_agreed");
    setHasSavedInfo(false);
  };

  const themeOptions: { id: "auto" | ThemeId; label: string; icon: string }[] = [
    { id: "auto", label: "자동 (시간/계절)", icon: "🔄" },
    ...Object.values(themes).map((t) => ({ id: t.id, label: t.nameKo, icon: t.icon })),
  ];

  const genderOptions: { id: GenderFilter; label: string }[] = [
    { id: "all", label: "전부" },
    { id: "female", label: "여자" },
    { id: "male", label: "남자" },
  ];

  return (
    <div className="relative min-h-screen">
      {/* 배경 */}
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/session-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-arcana-bg/70" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors">
          ← 홈으로
        </Link>

        <h1 className="text-2xl md:text-3xl font-display font-bold text-arcana-purple mt-4 mb-8 drop-shadow-md">
          설정
        </h1>

        <div className="space-y-6">

          {/* 테마 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">테마</h2>
            <p className="text-arcana-muted text-xs mb-4">현재: {mode === "auto" ? `자동 (${themes[activeTheme].nameKo})` : themes[activeTheme].nameKo}</p>
            <div className="grid grid-cols-4 gap-2">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${
                    mode === t.id
                      ? "border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm"
                      : "border-arcana-border/50 text-arcana-muted hover:border-arcana-border"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-sans text-xs leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 카드 스킨 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">카드 스킨</h2>
            <p className="text-arcana-muted text-xs mb-4">현재: {cardSkins.find((s) => s.id === selectedSkinId)?.nameKo || "기본"}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cardSkins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSkin(skin.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedSkinId === skin.id
                      ? "border-arcana-purple bg-arcana-purple/10 shadow-sm shadow-arcana-purple/10"
                      : "border-arcana-border/50 hover:border-arcana-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ background: `linear-gradient(135deg, ${skin.palette.primary}, ${skin.palette.secondary})` }}
                    />
                    <span className="font-sans font-bold text-xs text-arcana-text">{skin.nameKo}</span>
                  </div>
                  <p className="text-arcana-muted text-xs leading-relaxed">{skin.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 상담사 성별 필터 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">기본 상담사 필터</h2>
            <p className="text-arcana-muted text-xs mb-4">캐릭터 선택 시 기본 필터</p>
            <div className="flex gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGenderFilter(opt.id)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-display font-bold transition-all ${
                    genderFilter === opt.id
                      ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white shadow-lg shadow-arcana-purple/20"
                      : "bg-arcana-card/50 border border-arcana-border text-arcana-muted hover:border-arcana-purple"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* 선호 상담사 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">선호 상담사</h2>
            <p className="text-arcana-muted text-xs mb-4">
              {favoriteCharacterId
                ? `현재: ${getCharacterById(favoriteCharacterId)?.name ?? "없음"}`
                : "선택된 상담사 없음"}
              {isSavingFavorite && " (저장 중...)"}
            </p>

            {!userId && (
              <p className="text-amber-400/80 text-xs mb-3">
                로그인하면 선호 상담사가 계정에 저장됩니다.
              </p>
            )}

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelectFavorite(char.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs transition-all ${
                    favoriteCharacterId === char.id
                      ? "border-arcana-purple bg-arcana-purple/15 text-arcana-purple shadow-sm"
                      : "border-arcana-border/50 text-arcana-muted hover:border-arcana-border"
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-arcana-surface">
                    <Image
                      src={char.expressions.default}
                      alt={char.name}
                      fill
                      className="object-cover object-top"
                      sizes="48px"
                    />
                  </div>
                  <span className="font-sans text-xs leading-tight text-center">{char.name}</span>
                  <span className="text-[10px] text-arcana-muted/70 leading-tight text-center">{char.speciality}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 카드 선택 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">카드 선택 방식</h2>
            <p className="text-arcana-muted text-xs mb-4">타로 카드 선택 시 동작</p>
            <button
              onClick={toggleConfirmMode}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-arcana-border/50 hover:border-arcana-border transition-colors"
            >
              <div>
                <span className="text-arcana-text text-sm font-sans">카드 확인 모드</span>
                <p className="text-arcana-muted text-xs mt-0.5">
                  {confirmEachCard ? "매 카드 선택 시 확인 요청" : "확인 없이 바로 선택 (기본)"}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                confirmEachCard ? "bg-arcana-purple" : "bg-arcana-border"
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  confirmEachCard ? "translate-x-4" : "translate-x-0"
                }`} />
              </div>
            </button>
          </section>

          {/* 저장된 개인정보 */}
          <section className="bg-arcana-card/70 backdrop-blur-sm border border-arcana-border rounded-2xl p-5">
            <h2 className="font-sans font-bold text-base md:text-lg text-arcana-text mb-1">저장된 개인정보</h2>
            <p className="text-arcana-muted text-xs mb-4">브라우저에 저장된 정보 관리</p>
            {hasSavedInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-arcana-text text-sm">개인정보 저장됨</span>
                <button
                  onClick={clearSavedInfo}
                  className="px-4 py-1.5 rounded-full border border-red-500/30 text-red-400 text-xs font-sans hover:bg-red-500/10 transition-colors"
                >
                  삭제
                </button>
              </div>
            ) : (
              <p className="text-arcana-muted text-sm">저장된 정보 없음</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
