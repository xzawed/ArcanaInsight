import { create } from "zustand";
import { ChatMessage, Topic, SajuTimeRange } from "@/types/session";
import { ReadingResult } from "@/types/service";
import { SajuResult } from "@/services/saju/saju-types";
import { UserInfo } from "@/types/user-info";
import type { CharacterId } from "@/types/character";

export type { UserInfo };

type SajuPhase = "info-input" | "topic-select" | "reading" | "result";

interface SajuSessionState {
  phase: SajuPhase;
  sessionId: string | null;
  characterId: CharacterId | null;
  topic: Topic | null;
  timeRange: SajuTimeRange | null;
  includeMonthly: boolean;
  userInfo: UserInfo | null;
  chatMessages: ChatMessage[];
  readingResult: ReadingResult | null;
  sajuData: SajuResult | null;
  isLoading: boolean;
  freeQuestion: string | null;

  setPhase: (phase: SajuPhase) => void;
  setSessionId: (id: string) => void;
  setCharacterId: (id: CharacterId) => void;
  setTopic: (topic: Topic) => void;
  setTimeRange: (range: SajuTimeRange) => void;
  setIncludeMonthly: (v: boolean) => void;
  setUserInfo: (info: UserInfo) => void;
  addChatMessage: (message: ChatMessage) => void;
  setReadingResult: (result: ReadingResult) => void;
  setSajuData: (data: SajuResult) => void;
  setLoading: (loading: boolean) => void;
  setFreeQuestion: (q: string | null) => void;
  reset: () => void;
}

const initialState = {
  phase: "info-input" as SajuPhase,
  sessionId: null,
  characterId: null,
  topic: null,
  timeRange: null,
  includeMonthly: false,
  userInfo: null,
  chatMessages: [],
  readingResult: null,
  sajuData: null,
  isLoading: false,
  freeQuestion: null,
};

export const useSajuSessionStore = create<SajuSessionState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setSessionId: (id) => set({ sessionId: id }),
  setCharacterId: (id) => set({ characterId: id }),
  setTopic: (topic) => set({ topic }),
  setTimeRange: (range) => set({ timeRange: range }),
  setIncludeMonthly: (v) => set({ includeMonthly: v }),
  setUserInfo: (info) => set({ userInfo: info }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setReadingResult: (result) => set({ readingResult: result }),
  setSajuData: (data) => set({ sajuData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setFreeQuestion: (q) => set({ freeQuestion: q }),
  reset: () => set(initialState),
}));
