"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCharacterById } from "@/data/characters";
import type { CharacterConfig } from "@/types/character";
import { useFavoriteCharacter } from "@/hooks/useFavoriteCharacter";

export interface UsePreselectCharacterOptions {
  /**
   * 캐릭터가 선택(프리셀렉트 또는 즐겨찾기 fallback)된 후 호출되는 콜백.
   * 페이지별 부가 로직(스토어 반영, 인사 메시지 생성, 스텝 전환 등)을 여기서 수행한다.
   */
  onSelect: (character: CharacterConfig) => void;
  /**
   * 현재 선택된 캐릭터 (즐겨찾기 fallback 중복 실행 방지용).
   */
  currentCharacter: CharacterConfig | null;
}

/**
 * URL의 `character` 파라미터로 캐릭터를 프리셀렉트하고,
 * 파라미터가 없을 때 로그인된 사용자의 즐겨찾기 캐릭터를 fallback으로 자동 선택한다.
 *
 * **초기 상태 초기화(useState lazy initializer)는 호출 측에서 직접 처리해야 한다.**
 * 이 훅은 마운트 후 사이드 이펙트(스토어 반영, 인사 메시지, 스텝 전환)를 담당한다.
 *
 * - 캐릭터 선택 이후의 스텝 전환, 스토어 갱신, 인사 메시지 등은 `onSelect` 콜백에서 처리한다.
 */
export function usePreselectCharacter({
  onSelect,
  currentCharacter,
}: UsePreselectCharacterOptions) {
  const searchParams = useSearchParams();

  const preselectedCharId = searchParams.get("character");
  const hasPreselected = !!preselectedCharId;

  // URL 파라미터로 캐릭터가 지정된 경우: 마운트 후 한 번만 onSelect 호출
  // (초기 state는 호출 측에서 이미 세팅; 여기서는 스토어·메시지 등 부가 처리 트리거)
  useEffect(() => {
    if (!preselectedCharId) return;
    const char = getCharacterById(preselectedCharId);
    if (char) onSelect(char);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 1회 — preselectedCharId / onSelect 변화 무시 (의도된 패턴)

  // 선호 상담사 fallback: URL 파라미터 없이 직접 접속한 경우 자동 선택
  const { favoriteCharacter } = useFavoriteCharacter(hasPreselected);
  useEffect(() => {
    if (favoriteCharacter && !currentCharacter) {
      onSelect(favoriteCharacter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteCharacter]); // NOSONAR — currentCharacter 포함 시 favorite 재실행 루프 발생
}
