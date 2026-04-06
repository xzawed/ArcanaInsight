"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCharacterById } from "@/data/characters";
import type { CharacterConfig } from "@/types/character";

/**
 * 로그인한 사용자의 선호 상담사를 Supabase에서 조회한다.
 * skip=true이면 즉시 null 반환 (URL 파라미터로 이미 캐릭터가 선택된 경우).
 */
export function useFavoriteCharacter(skip: boolean): {
  favoriteCharacter: CharacterConfig | null;
  loading: boolean;
} {
  const [favoriteCharacter, setFavoriteCharacter] = useState<CharacterConfig | null>(null);
  const [loading, setLoading] = useState(!skip);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }
        const { data } = await supabase
          .from("profiles")
          .select("favorite_character_id")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        if (data?.favorite_character_id) {
          const char = getCharacterById(data.favorite_character_id);
          if (char) setFavoriteCharacter(char);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [skip]);

  return { favoriteCharacter, loading };
}
