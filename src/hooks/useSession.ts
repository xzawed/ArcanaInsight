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
  selectCard: (card: SelectedCard) => void;
  addChatMessage: (message: ChatMessage) => void;
  appendToLastMessage: (content: string) => void;
  setReadingResult: (result: ReadingResult) => void;
  setLoading: (loading: boolean) => void;
  setUserInfo: (info: UserInfo) => void;
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
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setTopic: (topic) => set({ topic }),
  setSpreadType: (type, required) => set({ spreadType: type, requiredCards: required }),
  setSessionId: (id) => set({ sessionId: id }),
  setCharacterId: (id) => set({ characterId: id }),
  setAvailableCards: (cards) => set({ availableCards: cards }),
  selectCard: (card) => set((state) => ({ selectedCards: [...state.selectedCards, card] })),
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
  reset: () => set(initialState),
}));
