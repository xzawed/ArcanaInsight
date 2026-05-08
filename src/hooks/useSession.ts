import { create } from "zustand";
import { SpreadType, ChatMessage } from "@/types/session";
import { SelectedCard, TarotCard } from "@/types/card";
import { ReadingResult } from "@/types/service";
import { Topic } from "@/types/session";
import { UserInfo } from "@/types/user-info";

export type { UserInfo };

type SessionPhase = "topic-select" | "card-shuffle" | "card-select" | "reading" | "result";

interface SessionState {
  phase: SessionPhase;
  sessionId: string | null;
  characterId: string | null;
  topic: Topic | null;
  spreadType: SpreadType | null;
  requiredCards: number;
  availableCards: TarotCard[];
  selectedCards: SelectedCard[];
  chatMessages: ChatMessage[];
  readingResult: ReadingResult | null;
  isLoading: boolean;
  userInfo: UserInfo | null;

  setPhase: (phase: SessionPhase) => void;
  setTopic: (topic: Topic) => void;
  setSpreadType: (type: SpreadType, required: number) => void;
  setSessionId: (id: string) => void;
  setCharacterId: (id: string) => void;
  setAvailableCards: (cards: TarotCard[]) => void;
  selectCard: (card: SelectedCard) => boolean;
  addChatMessage: (message: ChatMessage) => void;
  appendToLastMessage: (content: string) => void;
  setReadingResult: (result: ReadingResult) => void;
  setLoading: (loading: boolean) => void;
  setUserInfo: (info: UserInfo) => void;
  freeQuestion: string | null;
  setFreeQuestion: (q: string) => void;
  reset: () => void;
}

const initialState = {
  phase: "topic-select" as SessionPhase,
  sessionId: null,
  characterId: null,
  topic: null,
  spreadType: null,
  requiredCards: 0,
  availableCards: [],
  selectedCards: [],
  chatMessages: [],
  readingResult: null,
  isLoading: false,
  userInfo: null,
  freeQuestion: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setTopic: (topic) => set({ topic }),
  setSpreadType: (type, required) => set({ spreadType: type, requiredCards: required }),
  setSessionId: (id) => set({ sessionId: id }),
  setCharacterId: (id) => set({ characterId: id }),
  setAvailableCards: (cards) => set({ availableCards: cards }),
  selectCard: (card) => {
    // atomic check-and-push: 빠른 연속 클릭 race 차단.
    // - length cap 초과 무시 (handleCardSelect 가드와 이중 방어)
    // - 같은 card.id 중복 차단 (deck 내 같은 카드 두 번 push 방지)
    // cancel 후 재선택은 store에서 카드가 빠진 뒤이므로 통과 — 정상.
    const state = get();
    if (state.selectedCards.length >= state.requiredCards) return false;
    if (state.selectedCards.some((c) => c.card.id === card.card.id)) return false;
    set({ selectedCards: [...state.selectedCards, card] });
    return true;
  },
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  appendToLastMessage: (content) => set((state) => {
    const messages = [...state.chatMessages];
    const last = messages[messages.length - 1];
    if (last && last.role === "character") {
      messages[messages.length - 1] = { ...last, content: last.content + content };
    }
    return { chatMessages: messages };
  }),
  setReadingResult: (result) => set({ readingResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  setUserInfo: (info) => set({ userInfo: info }),
  setFreeQuestion: (q) => set({ freeQuestion: q || null }),
  reset: () => set(initialState),
}));
