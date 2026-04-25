"use client";

import { useEffect, useState } from "react";
import { getCharacterById } from "@/data/characters";
import type { CharacterConfig } from "@/types/character";

/**
 * 로그인한 사용자의 선호 상담사를 API 라우트를 통해 조회한다.
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
    (async () => {
      try {
        const res = await fetch("/api/profile/favorite-character");
        if (!res.ok || cancelled) { setLoading(false); return; }
        const { characterId } = (await res.json()) as { characterId: string | null };
        if (cancelled) return;
        if (characterId) {
          const char = getCharacterById(characterId);
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
