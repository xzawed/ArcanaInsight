import { SpreadDefinition, SpreadType, Topic } from "@/types/session";

export const spreads: Record<SpreadType, SpreadDefinition> = {
  "one-card": {
    type: "one-card", name: "One Card", nameKo: "원카드", nameJa: "ワンカード",
    description: "간단한 질문에 대한 직관적인 답을 얻습니다.",
    iconId: "spread-card",
    shortDescKo: "빠르고 직관적인 답변",
    shortDescEn: "Quick intuitive answer",
    shortDescJa: "素早く直感的な回答",
    detailKo: "하나의 카드로 질문에 대한 핵심 메시지를 받습니다. 간단한 질문이나 오늘의 조언이 필요할 때 적합합니다.",
    detailEn: "Receive the core message for your question with a single card. Best for simple questions or daily guidance.",
    detailJa: "1枚のカードで質問への核心メッセージを受け取ります。シンプルな質問や今日のアドバイスが必要なときに最適です。",
    positions: [{ index: 0, label: "Answer", labelKo: "답", labelJa: "答え", x: 50, y: 50 }],
  },
  "three-card": {
    type: "three-card", name: "Past / Present / Future", nameKo: "과거 / 현재 / 미래", nameJa: "過去 / 現在 / 未来",
    description: "시간의 흐름에 따른 상황의 변화를 읽습니다.",
    iconId: "spread-three",
    shortDescKo: "과거 · 현재 · 미래",
    shortDescEn: "Past · Present · Future",
    shortDescJa: "過去 · 現在 · 未来",
    detailKo: "세 장의 카드로 시간의 흐름에 따른 상황 변화를 읽습니다. 과거의 원인, 현재의 상태, 미래의 방향을 종합적으로 파악합니다.",
    detailEn: "Read the flow of time with three cards. Understand past causes, current state, and future direction together.",
    detailJa: "3枚のカードで時間の流れに沿った状況の変化を読みます。過去の原因、現在の状態、未来の方向を総合的に把握します。",
    positions: [
      { index: 0, label: "Past", labelKo: "과거", labelJa: "過去", x: 20, y: 50 },
      { index: 1, label: "Present", labelKo: "현재", labelJa: "現在", x: 50, y: 50 },
      { index: 2, label: "Future", labelKo: "미래", labelJa: "未来", x: 80, y: 50 },
    ],
  },
  "five-card": {
    type: "five-card", name: "Simplified Celtic Cross", nameKo: "간소화된 켈틱 크로스", nameJa: "簡略ケルト十字",
    description: "상황을 다각도로 분석합니다.",
    iconId: "spread-five",
    shortDescKo: "심층 다각도 분석",
    shortDescEn: "In-depth multi-angle analysis",
    shortDescJa: "多角的な深層分析",
    detailKo: "다섯 장의 카드로 현재 상황, 도전, 기반, 가까운 미래, 최종 결과를 다각도로 분석합니다. 복잡한 상황에 깊이 있는 통찰이 필요할 때 추천합니다.",
    detailEn: "Analyze present, challenges, foundation, near future, and outcome with five cards. Recommended for complex situations needing deep insight.",
    detailJa: "5枚のカードで現在の状況、挑戦、基盤、近い未来、最終結果を多角的に分析します。複雑な状況で深い洞察が必要なときにおすすめです。",
    positions: [
      { index: 0, label: "Present", labelKo: "현재 상황", labelJa: "現在の状況", x: 50, y: 60 },
      { index: 1, label: "Challenge", labelKo: "도전/장애물", labelJa: "挑戦/障害", x: 20, y: 40 },
      { index: 2, label: "Foundation", labelKo: "기반/원인", labelJa: "基盤/原因", x: 50, y: 90 },
      { index: 3, label: "Near Future", labelKo: "가까운 미래", labelJa: "近い未来", x: 80, y: 40 },
      { index: 4, label: "Outcome", labelKo: "최종 결과", labelJa: "最終結果", x: 50, y: 10 },
    ],
  },
  "celtic-cross": {
    type: "celtic-cross", name: "Celtic Cross", nameKo: "켈틱 크로스", nameJa: "ケルト十字",
    description: "가장 전통적인 10장 배열법으로 인생의 복합적인 상황을 깊이 분석합니다.",
    iconId: "spread-celtic",
    shortDescKo: "전통 10장 종합 분석",
    shortDescEn: "Traditional 10-card comprehensive reading",
    shortDescJa: "伝統的な10枚総合分析",
    detailKo: "가장 유명한 전통 타로 배열법입니다. 현재 상황, 방해 요소, 과거, 의식, 근미래, 자아, 외부 환경, 희망과 두려움, 최종 결과까지 10개 관점에서 심층 분석합니다.",
    detailEn: "The most famous traditional tarot spread. Examines present, challenges, past, conscious goals, near future, self, environment, hopes & fears, and final outcome across 10 perspectives.",
    detailJa: "最も有名な伝統的タロット配置法です。現在の状況、妨害要素、過去、意識、近未来、自我、外部環境、希望と恐れ、最終結果まで10の観点から深層分析します。",
    positions: [
      { index: 0, label: "Present Situation", labelKo: "현재 상황", labelJa: "現在の状況", x: 35, y: 50 },
      { index: 1, label: "Challenge", labelKo: "도전/방해 요소", labelJa: "挑戦/妨害要素", x: 35, y: 50, rotation: 90 },
      { index: 2, label: "Foundation", labelKo: "기반/원인", labelJa: "基盤/原因", x: 35, y: 80 },
      { index: 3, label: "Recent Past", labelKo: "최근 과거", labelJa: "最近の過去", x: 15, y: 50 },
      { index: 4, label: "Crown", labelKo: "의식적 목표", labelJa: "意識的な目標", x: 35, y: 20 },
      { index: 5, label: "Near Future", labelKo: "가까운 미래", labelJa: "近い未来", x: 55, y: 50 },
      { index: 6, label: "Self", labelKo: "자아/태도", labelJa: "自我/態度", x: 80, y: 80 },
      { index: 7, label: "Environment", labelKo: "환경/외부 영향", labelJa: "環境/外部影響", x: 80, y: 60 },
      { index: 8, label: "Hopes & Fears", labelKo: "희망과 두려움", labelJa: "希望と恐れ", x: 80, y: 40 },
      { index: 9, label: "Final Outcome", labelKo: "최종 결과", labelJa: "最終結果", x: 80, y: 20 },
    ],
  },
  "relationship": {
    type: "relationship", name: "Relationship Spread", nameKo: "관계 스프레드", nameJa: "リレーションシップ",
    description: "두 사람 사이의 관계를 양면에서 거울처럼 분석합니다.",
    iconId: "spread-relationship",
    shortDescKo: "두 사람의 관계 분석",
    shortDescEn: "Two-person relationship analysis",
    shortDescJa: "二人の関係分析",
    detailKo: "나와 상대방의 시각, 관계의 의미, 장애물과 강점을 양면에서 거울처럼 분석합니다. 연인, 가족, 친구 등 모든 대인 관계 상담에 최적화되어 있습니다.",
    detailEn: "Mirror-analyze your view, their view, the meaning of the relationship, and obstacles & strengths. Optimized for all interpersonal consultations — partners, family, friends.",
    detailJa: "自分と相手の視点、関係の意味、障害と強みを両面から鏡のように分析します。恋人・家族・友人などすべての対人関係相談に最適化されています。",
    positions: [
      { index: 0, label: "You", labelKo: "나", labelJa: "自分", x: 20, y: 50 },
      { index: 1, label: "Your View", labelKo: "내가 보는 상대", labelJa: "自分から見た相手", x: 20, y: 25 },
      { index: 2, label: "Their View", labelKo: "상대가 보는 나", labelJa: "相手から見た自分", x: 80, y: 25 },
      { index: 3, label: "Relationship Meaning", labelKo: "관계의 의미", labelJa: "関係の意味", x: 50, y: 50 },
      { index: 4, label: "Obstacles", labelKo: "장애물", labelJa: "障害", x: 50, y: 80 },
      { index: 5, label: "Strengths", labelKo: "강점", labelJa: "強み", x: 50, y: 20 },
      { index: 6, label: "Outcome", labelKo: "결과", labelJa: "結果", x: 80, y: 50 },
    ],
  },
  "horseshoe": {
    type: "horseshoe", name: "Horseshoe Spread", nameKo: "말굽 스프레드", nameJa: "ホースシュー",
    description: "시간의 흐름과 내외부 요인을 함께 분석하는 7장 배열법입니다.",
    iconId: "spread-horseshoe",
    shortDescKo: "시간 흐름 + 내외부 요인",
    shortDescEn: "Time flow + internal/external factors",
    shortDescJa: "時間の流れ+内外要因",
    detailKo: "U자 모양으로 과거에서 미래까지의 흐름을 보여주며, 심리 상태·외부 환경·장애물을 함께 분석합니다. 재정·커리어 등 복합적 상황에 적합합니다.",
    detailEn: "U-shape showing flow from past to future, analyzing state of mind, environment, and obstacles. Suitable for complex situations like finance and career.",
    detailJa: "U字型で過去から未来への流れを示し、心理状態・外部環境・障害を併せて分析します。財務・キャリアなど複合的な状況に適しています。",
    positions: [
      { index: 0, label: "Past", labelKo: "과거", labelJa: "過去", x: 10, y: 80 },
      { index: 1, label: "Present", labelKo: "현재", labelJa: "現在", x: 10, y: 50 },
      { index: 2, label: "Near Future", labelKo: "가까운 미래", labelJa: "近い未来", x: 10, y: 20 },
      { index: 3, label: "State of Mind", labelKo: "심리 상태", labelJa: "心理状態", x: 50, y: 10 },
      { index: 4, label: "Environment", labelKo: "환경/외부 영향", labelJa: "環境/外部影響", x: 90, y: 20 },
      { index: 5, label: "Obstacles", labelKo: "장애물", labelJa: "障害", x: 90, y: 50 },
      { index: 6, label: "Outcome", labelKo: "결과", labelJa: "結果", x: 90, y: 80 },
    ],
  },
  "decision": {
    type: "decision", name: "Decision Making Spread", nameKo: "의사결정 스프레드", nameJa: "意思決定スプレッド",
    description: "두 가지 선택지와 각각의 결과를 비교하여 중요한 결정을 돕습니다.",
    iconId: "spread-decision",
    shortDescKo: "두 갈래 길의 선택",
    shortDescEn: "Choice between two paths",
    shortDescJa: "二つの道の選択",
    detailKo: "문제의 핵심을 파악한 뒤 두 가지 선택지와 각각의 결과를 비교합니다. 중요한 결정 앞에서 방향을 찾을 때 도움을 줍니다.",
    detailEn: "Identify the heart of the matter, then compare two options and their respective outcomes. Helps find direction before important decisions.",
    detailJa: "問題の核心を把握した後、二つの選択肢とそれぞれの結果を比較します。重要な決定の前で方向を見つけるのに役立ちます。",
    positions: [
      { index: 0, label: "Heart of the Matter", labelKo: "문제의 핵심", labelJa: "問題の核心", x: 50, y: 80 },
      { index: 1, label: "Option A", labelKo: "선택지 A", labelJa: "選択肢A", x: 25, y: 50 },
      { index: 2, label: "Option B", labelKo: "선택지 B", labelJa: "選択肢B", x: 75, y: 50 },
      { index: 3, label: "Result A", labelKo: "A 선택 시 결과", labelJa: "A選択時の結果", x: 25, y: 15 },
      { index: 4, label: "Result B", labelKo: "B 선택 시 결과", labelJa: "B選択時の結果", x: 75, y: 15 },
    ],
  },
  "week-ahead": {
    type: "week-ahead", name: "Week Ahead Spread", nameKo: "한 주 전망", nameJa: "一週間の見通し",
    description: "이번 주 7일간의 에너지와 테마를 하루씩 읽어드립니다.",
    iconId: "spread-week",
    shortDescKo: "월요일부터 일요일까지",
    shortDescEn: "Monday through Sunday",
    shortDescJa: "月曜から日曜まで",
    detailKo: "이번 주 7일간의 에너지와 테마를 하루씩 카드로 읽어드립니다. 한 주를 의미 있게 준비하고 싶을 때 추천합니다.",
    detailEn: "Read the energy and theme of each day this week with one card per day. Recommended when you want to prepare for the week meaningfully.",
    detailJa: "今週7日間のエネルギーとテーマを一日ずつカードで読み取ります。一週間を意味深く準備したいときにおすすめです。",
    positions: [
      { index: 0, label: "Monday", labelKo: "월요일", labelJa: "月曜日", x: 8, y: 50 },
      { index: 1, label: "Tuesday", labelKo: "화요일", labelJa: "火曜日", x: 22, y: 50 },
      { index: 2, label: "Wednesday", labelKo: "수요일", labelJa: "水曜日", x: 36, y: 50 },
      { index: 3, label: "Thursday", labelKo: "목요일", labelJa: "木曜日", x: 50, y: 50 },
      { index: 4, label: "Friday", labelKo: "금요일", labelJa: "金曜日", x: 64, y: 50 },
      { index: 5, label: "Saturday", labelKo: "토요일", labelJa: "土曜日", x: 78, y: 50 },
      { index: 6, label: "Sunday", labelKo: "일요일", labelJa: "日曜日", x: 92, y: 50 },
    ],
  },
  "zodiac": {
    type: "zodiac", name: "Zodiac Wheel Spread", nameKo: "조디악 휠", nameJa: "ゾディアックホイール",
    description: "점성술 12하우스에 카드를 배치하여 인생 전반을 종합 분석합니다.",
    iconId: "spread-zodiac",
    shortDescKo: "12하우스 인생 전반",
    shortDescEn: "12 Houses, full life overview",
    shortDescJa: "12ハウス・人生全般",
    detailKo: "점성술의 12하우스에 각각 카드를 배치하여 자아·재정·소통·가정·사랑·건강·관계·변화·철학·커리어·우정·영성을 종합 분석합니다.",
    detailEn: "Place a card in each of the 12 astrological houses to comprehensively analyze self, finance, communication, home, love, health, partnership, transformation, philosophy, career, friendship, and spirituality.",
    detailJa: "占星術の12ハウスにそれぞれカードを配置し、自我・財政・コミュニケーション・家庭・愛・健康・関係・変化・哲学・キャリア・友情・霊性を総合分析します。",
    positions: [
      { index: 0, label: "1st House — Self", labelKo: "1하우스 — 자아", labelJa: "1ハウス — 自我", x: 50, y: 2 },
      { index: 1, label: "2nd House — Finance", labelKo: "2하우스 — 재정", labelJa: "2ハウス — 財政", x: 73, y: 12 },
      { index: 2, label: "3rd House — Communication", labelKo: "3하우스 — 소통", labelJa: "3ハウス — コミュニケーション", x: 90, y: 30 },
      { index: 3, label: "4th House — Home", labelKo: "4하우스 — 가정", labelJa: "4ハウス — 家庭", x: 95, y: 55 },
      { index: 4, label: "5th House — Creativity", labelKo: "5하우스 — 창의/사랑", labelJa: "5ハウス — 創造性/愛", x: 83, y: 78 },
      { index: 5, label: "6th House — Health", labelKo: "6하우스 — 건강", labelJa: "6ハウス — 健康", x: 63, y: 93 },
      { index: 6, label: "7th House — Partnership", labelKo: "7하우스 — 관계", labelJa: "7ハウス — 関係", x: 37, y: 93 },
      { index: 7, label: "8th House — Transformation", labelKo: "8하우스 — 변화/깊은유대", labelJa: "8ハウス — 変化/深い絆", x: 17, y: 78 },
      { index: 8, label: "9th House — Philosophy", labelKo: "9하우스 — 철학/여행", labelJa: "9ハウス — 哲学/旅", x: 5, y: 55 },
      { index: 9, label: "10th House — Career", labelKo: "10하우스 — 커리어", labelJa: "10ハウス — キャリア", x: 10, y: 30 },
      { index: 10, label: "11th House — Community", labelKo: "11하우스 — 우정/커뮤니티", labelJa: "11ハウス — 友情/コミュニティ", x: 27, y: 12 },
      { index: 11, label: "12th House — Spirituality", labelKo: "12하우스 — 영성/카르마", labelJa: "12ハウス — 霊性/カルマ", x: 30, y: 5 },
    ],
  },
  "tree-of-life": {
    type: "tree-of-life", name: "Tree of Life Spread", nameKo: "생명의 나무", nameJa: "生命の樹",
    description: "카발라의 세피로트 10개에 카드를 배치하는 심층 영적 탐구 배열법입니다.",
    iconId: "spread-tree",
    shortDescKo: "카발라 영적 탐구",
    shortDescEn: "Kabbalah spiritual exploration",
    shortDescJa: "カバラ霊的探求",
    detailKo: "카발라의 세피로트 10개에 카드를 배치하여 영적 목표·지혜·이해·자비·도전·균형·감정·지성·잠재의식·현실을 탐구하는 심층 배열법입니다.",
    detailEn: "Place cards on the 10 Sephirot of Kabbalah to explore spiritual goals, wisdom, understanding, mercy, challenge, balance, emotion, intellect, subconscious, and reality.",
    detailJa: "カバラのセフィロト10個にカードを配置し、霊的目標・知恵・理解・慈悲・挑戦・均衡・感情・知性・潜在意識・現実を探求する深層配置法です。",
    positions: [
      { index: 0, label: "Kether — Crown", labelKo: "케테르 — 왕관/영적 목표", labelJa: "ケテル — 王冠/霊的目標", x: 50, y: 5 },
      { index: 1, label: "Chokmah — Wisdom", labelKo: "호크마 — 지혜", labelJa: "ホクマー — 知恵", x: 75, y: 20 },
      { index: 2, label: "Binah — Understanding", labelKo: "비나 — 이해", labelJa: "ビナー — 理解", x: 25, y: 20 },
      { index: 3, label: "Chesed — Mercy", labelKo: "헤세드 — 자비/풍요", labelJa: "ケセド — 慈悲/豊かさ", x: 75, y: 40 },
      { index: 4, label: "Geburah — Severity", labelKo: "게부라 — 도전/엄격", labelJa: "ゲブラー — 挑戦/厳格", x: 25, y: 40 },
      { index: 5, label: "Tiphareth — Beauty", labelKo: "티파레트 — 아름다움/균형", labelJa: "ティフェレト — 美/均衡", x: 50, y: 50 },
      { index: 6, label: "Netzach — Victory", labelKo: "네짜흐 — 승리/감정", labelJa: "ネツァク — 勝利/感情", x: 75, y: 65 },
      { index: 7, label: "Hod — Splendor", labelKo: "호드 — 영광/지성", labelJa: "ホド — 栄光/知性", x: 25, y: 65 },
      { index: 8, label: "Yesod — Foundation", labelKo: "예소드 — 기반/잠재의식", labelJa: "イェソド — 基盤/潜在意識", x: 50, y: 80 },
      { index: 9, label: "Malkuth — Kingdom", labelKo: "말쿠트 — 왕국/현실", labelJa: "マルクト — 王国/現実", x: 50, y: 95 },
    ],
  },
};

export const topicToSpread: Partial<Record<Topic, SpreadType>> = {
  love: "three-card", "love-single": "three-card", "love-couple": "relationship",
  general: "celtic-cross", health: "one-card",
  finance: "horseshoe", career: "horseshoe",
};

export function getSpreadForTopic(topic: Topic): SpreadDefinition {
  const spreadType = topicToSpread[topic] ?? "three-card";
  return spreads[spreadType];
}

// ─── locale 헬퍼 ─────────────────────────────────────────────────────────────

/** 스프레드 이름을 locale에 맞춰 반환 (en은 name 필드 사용). */
export function getSpreadName(spread: SpreadDefinition, locale: string): string {
  if (locale === "en") return spread.name;
  if (locale === "ja" && spread.nameJa) return spread.nameJa;
  return spread.nameKo;
}

/** 스프레드 짧은 설명(부제) — 페이지 카드 부제용. */
export function getSpreadShortDesc(spread: SpreadDefinition, locale: string): string {
  if (locale === "en" && spread.shortDescEn) return spread.shortDescEn;
  if (locale === "ja" && spread.shortDescJa) return spread.shortDescJa;
  return spread.shortDescKo ?? "";
}

/** 스프레드 상세 설명. */
export function getSpreadDetail(spread: SpreadDefinition, locale: string): string {
  if (locale === "en" && spread.detailEn) return spread.detailEn;
  if (locale === "ja" && spread.detailJa) return spread.detailJa;
  return spread.detailKo ?? spread.description;
}

/** 스프레드 위치 라벨 — celtic-cross 등 결과 페이지에서 사용. */
export function getPositionLabel(position: { label: string; labelKo: string; labelJa?: string }, locale: string): string {
  if (locale === "en") return position.label;
  if (locale === "ja" && position.labelJa) return position.labelJa;
  return position.labelKo;
}
