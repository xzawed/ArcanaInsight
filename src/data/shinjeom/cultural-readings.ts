/**
 * 신점 주제별 한국 전통 운세 개념 — 로마자 병기용.
 * EN/JA locale 사용자가 한국어 원문 용어를 인식할 수 있도록 제공.
 */
export interface CulturalTopicInfo {
  koTerm: string;
  romaja: string;
}

export const CULTURAL_TOPIC_INFO: Readonly<Record<string, CulturalTopicInfo>> = {
  "shinjeom-general":    { koTerm: "신수",       romaja: "Shinsu" },
  "shinjeom-love":       { koTerm: "연애·궁합",  romaja: "Yeonae · Gunghap" },
  "shinjeom-wealth":     { koTerm: "재물·사업운", romaja: "Jaebol · Saeobeun" },
  "shinjeom-career":     { koTerm: "직장·이직",  romaja: "Jikjang · Ijijik" },
  "shinjeom-health":     { koTerm: "건강·액막이", romaja: "Geongang · Aengmagi" },
  "shinjeom-auspicious": { koTerm: "택일",        romaja: "Taegil" },
} as const;
