import { create } from "zustand";
import { ChatMessage, Topic } from "@/types/session";
import { ReadingResult } from "@/types/service";
import { SajuResult } from "@/services/saju/saju-types";

export interface SajuUserInfo {
  name: string;
  birthDate: string;
  birthHour: string;
  gender: "male" | "female" | "other";
}

type SajuPhase = "info-input" | "topic-select" | "reading" | "result";

interface SajuSessionState {
  phase: SajuPhase;
  sessionId: string | null;
  characterId: string | null;
  topic: Topic | null;
  userInfo: SajuUserInfo | null;
  chatMessages: ChatMessage[];
  readingResult: ReadingResult | null;
  sajuData: SajuResult | null;
  isLoading: boolean;

  setPhase: (phase: SajuPhase) => void;
  setSessionId: (id: string) => void;
  setCharacterId: (id: string) => void;
  setTopic: (topic: Topic) => void;
  setUserInfo: (info: SajuUserInfo) => void;
  addChatMessage: (message: ChatMessage) => void;
  setReadingResult: (result: ReadingResult) => void;
  setSajuData: (data: SajuResult) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: "info-input" as SajuPhase,
  sessionId: null,
  characterId: null,
  topic: null,
  userInfo: null,
  chatMessages: [],
  readingResult: null,
  sajuData: null,
  isLoading: false,
};

export const useSajuSessionStore = create<SajuSessionState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setSessionId: (id) => set({ sessionId: id }),
  setCharacterId: (id) => set({ characterId: id }),
  setTopic: (topic) => set({ topic }),
  setUserInfo: (info) => set({ userInfo: info }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setReadingResult: (result) => set({ readingResult: result }),
  setSajuData: (data) => set({ sajuData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}));
