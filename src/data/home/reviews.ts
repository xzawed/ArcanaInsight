export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  characterId: string;
  topic: string;
}

export const reviews: Review[] = [
  { id: "r1", name: "별빛여행자", rating: 5, text: "아르카나의 해석이 정말 소름 돋을 정도로 정확했어요. AI라고 믿기 어려울 만큼 따뜻한 조언이었습니다.", characterId: "arcana", topic: "연애/관계" },
  { id: "r2", name: "달빛수호자", rating: 5, text: "미코의 엄숙하면서도 깊이 있는 해석 덕분에 고민이 정리됐어요. 마음이 차분해지는 상담이었습니다.", characterId: "miko", topic: "직장/진로" },
  { id: "r3", name: "꽃바람", rating: 4, text: "선화의 우아한 말투로 듣는 타로가 이렇게 힐링이 될 줄 몰랐어요. 매일 오늘의 카드 확인하고 있어요!", characterId: "seonhwa", topic: "일반 상담" },
  { id: "r4", name: "별의조각", rating: 5, text: "호시가 너무 귀여워서 상담 받는 내내 웃었어요ㅋㅋ 근데 해석은 진짜 정확해서 놀랐습니다!", characterId: "hoshi", topic: "재정/금전" },
  { id: "r5", name: "밤하늘꿈", rating: 5, text: "3카드 스프레드로 진로 상담 받았는데, 현재 상황을 너무 잘 짚어줘서 깜짝 놀랐어요.", characterId: "arcana", topic: "직장/진로" },
  { id: "r6", name: "은하수길", rating: 4, text: "캐릭터마다 해석 스타일이 달라서 같은 카드도 다르게 느껴져요. 여러 캐릭터로 비교해보는 재미가 있습니다.", characterId: "seonhwa", topic: "건강" },
];
