/** 오행 타입 */
export type OhaengType = "wood" | "fire" | "earth" | "metal" | "water";

/** 오행 한글/한자/색상 매핑 */
export const OHAENG: Record<OhaengType, { ko: string; hanja: string; color: string }> = {
  wood:  { ko: "목", hanja: "木", color: "#10b981" },  // emerald-500
  fire:  { ko: "화", hanja: "火", color: "#ef4444" },  // red-500
  earth: { ko: "토", hanja: "土", color: "#f59e0b" },  // amber-500
  metal: { ko: "금", hanja: "金", color: "#cbd5e1" },  // slate-300
  water: { ko: "수", hanja: "水", color: "#3b82f6" },  // blue-500
};

/** 천간 → 오행 매핑 */
export const STEM_ELEMENT: Record<string, OhaengType> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

/** 지지 → 오행 매핑 */
export const BRANCH_ELEMENT: Record<string, OhaengType> = {
  "子": "water", "丑": "earth",
  "寅": "wood", "卯": "wood",
  "辰": "earth", "巳": "fire",
  "午": "fire", "未": "earth",
  "申": "metal", "酉": "metal",
  "戌": "earth", "亥": "water",
};

/** 천간 한자 → 한글 매핑 */
export const STEM_KO: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};

/** 지지 한자 → 한글 매핑 */
export const BRANCH_KO: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};

/** 십성 한글 이름 및 간략 설명 */
export const TEN_STARS: Record<string, { ko: string; desc: string }> = {
  "比肩": { ko: "비견", desc: "나와 동등한 존재, 경쟁과 자립" },
  "劫财": { ko: "겁재", desc: "재물 쟁탈, 승부욕과 도전" },
  "食神": { ko: "식신", desc: "먹을 복, 표현력과 재능" },
  "伤官": { ko: "상관", desc: "관을 해침, 창의성과 반항" },
  "偏财": { ko: "편재", desc: "뜻밖의 재물, 투기와 사교" },
  "正财": { ko: "정재", desc: "정당한 재물, 근면과 안정" },
  "七杀": { ko: "편관(칠살)", desc: "권위와 통제, 리더십과 압박" },
  "正官": { ko: "정관", desc: "질서와 명예, 정통과 책임" },
  "偏印": { ko: "편인", desc: "편향된 학문, 특이한 재능" },
  "正印": { ko: "정인", desc: "학문과 보호, 어머니의 사랑" },
};

/** 12운성 한글 이름 및 설명 */
export const TWELVE_STAGES: Record<string, { ko: string; desc: string }> = {
  "长生": { ko: "장생", desc: "새로운 시작, 생기 충만" },
  "沐浴": { ko: "목욕", desc: "불안정, 변화와 유혹" },
  "冠带": { ko: "관대", desc: "성장, 사회 진출" },
  "临官": { ko: "임관(건록)", desc: "독립, 활동력 최고" },
  "帝旺": { ko: "제왕", desc: "정점, 최고의 에너지" },
  "衰": { ko: "쇠", desc: "쇠퇴, 안정 추구" },
  "病": { ko: "병", desc: "약화, 내면 성찰" },
  "死": { ko: "사", desc: "전환, 한 시기의 마감" },
  "墓": { ko: "묘", desc: "저장, 잠재력 축적" },
  "绝": { ko: "절", desc: "단절, 새 시작 직전" },
  "胎": { ko: "태", desc: "잉태, 새 가능성" },
  "养": { ko: "양", desc: "양육, 준비 단계" },
};

/** 12시진 시간 매핑 (birthHour → 시작시간) */
export const BIRTH_HOUR_MAP: Record<string, number> = {
  ja: 0, chuk: 1, in: 3, myo: 5, jin: 7, sa: 9,
  o: 11, mi: 13, sin: 15, yu: 17, sul: 19, hae: 21,
  unknown: -1,
};
