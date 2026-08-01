import { cleanReadingText } from "@/services/core/text-cleaner";
import type { CardInterpretationItem } from "@/types/service";

/**
 * 저장된 `readings.card_interpretation`(JSONB)을 결과 화면이 쓸 형태로 정규화한다.
 *
 * ## 왜 별도 함수인가
 *
 * 공유·마이페이지 결과 페이지(`app/(site)/tarot/result/[id]/page.tsx`)는 서버 컴포넌트라
 * 단위 테스트가 어렵다. 그래서 **포맷 판정 로직만 떼어내 테스트 가능하게 둔다.**
 *
 * ## 무엇을 막으려는 것인가 (2026-05-26 ~ 08-01, 약 67일간 실재한 결함)
 *
 * #414로 타로가 단일 `interpretation` → 3-섹션(`symbolism`/`situation`/`action`)으로 바뀌었는데,
 * 결과 페이지는 계속 `interpretation`만 읽었다. 게다가 그 페이지가
 * `as { …; interpretation: string; … }[]` 로 **거짓 단언**을 해서 TypeScript가 옵셔널을 못 봤고,
 * 신포맷 행에는 그 키가 아예 없어 `cleanReadingText(undefined)`가 서버 컴포넌트를 터뜨렸다.
 *
 * E2E는 404 경로만 검사하고 있었고 CI에는 실 DB가 없어, 이 경로는 **한 번도 검증된 적이 없었다.**
 *
 * 세션 화면(`CardInterpretationList`)과 **같은 판정 기준**을 쓴다 — 두 화면이 같은 데이터를
 * 다르게 그리면 그것이 다음 드리프트다.
 */
export interface NormalizedCardInterpretation extends CardInterpretationItem {
  interpretation: string;
  symbolism: string;
  situation: string;
  action: string;
  /** 3-섹션 포맷인가. `CardInterpretationList`와 동일 기준. */
  hasSections: boolean;
}

export function normalizeCardInterpretations(raw: unknown): NormalizedCardInterpretation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is CardInterpretationItem => typeof item === "object" && item !== null)
    .map((item) => {
      const symbolism = cleanReadingText(item.symbolism);
      const situation = cleanReadingText(item.situation);
      return {
        ...item,
        interpretation: cleanReadingText(item.interpretation),
        symbolism,
        situation,
        action: cleanReadingText(item.action),
        hasSections: !!(symbolism || situation),
      };
    });
}
