import { create } from "zustand";
import { Topic, ChatMessage } from "@/types/session";
import { ReadingResult } from "@/types/service";
import { UserInfo } from "@/types/user-info";

export type ShinjeomPhase = "character-select" | "topic-select" | "conversation" | "result";

interface ShinjeomSessionState {
  phase: ShinjeomPhase;
  sessionId: string | null;
  characterId: string | null;
  topic: Topic | null;
  userInfo: UserInfo | null;
  chatMessages: ChatMessage[];
  turnCount: number; // 사용자 메시지 횟수
  readingResult: ReadingResult | null;
  isLoading: boolean;

  setPhase: (phase: ShinjeomPhase) => void;
  setSessionId: (id: string) => void;
  setCharacterId: (id: string) => void;
  setTopic: (topic: Topic) => void;
  setUserInfo: (info: ShinjeomSessionState["userInfo"]) => void;
  addChatMessage: (message: ChatMessage) => void;
  incrementTurn: () => void;
  setReadingResult: (result: ReadingResult) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: "character-select" as ShinjeomPhase,
  sessionId: null,
  characterId: null,
  topic: null,
  userInfo: null,
  chatMessages: [],
  turnCount: 0,
  readingResult: null,
  isLoading: false,
};

export const useShinjeomSessionStore = create<ShinjeomSessionState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setSessionId: (id) => set({ sessionId: id }),
  setCharacterId: (id) => set({ characterId: id }),
  setTopic: (topic) => set({ topic }),
  setUserInfo: (info) => set({ userInfo: info }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
  setReadingResult: (result) => set({ readingResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}));
