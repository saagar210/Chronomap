import { create } from "zustand";
import type {
  AiGeneratedEvent,
  AiChatResponse,
  AiModel,
} from "../lib/commands";
import * as cmd from "../lib/commands";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiStore {
  messages: ChatMessage[];
  suggestions: AiGeneratedEvent[];
  connected: boolean;
  loading: boolean;
  error: string | null;
  models: AiModel[];

  checkConnection: () => Promise<void>;
  sendMessage: (content: string, timelineContext?: string) => Promise<void>;
  addSuggestionAsEvent: (
    suggestion: AiGeneratedEvent,
    timelineId: string,
    trackId: string
  ) => Promise<void>;
  clearChat: () => void;
}

export const useAiStore = create<AiStore>((set, get) => ({
  messages: [],
  suggestions: [],
  connected: false,
  loading: false,
  error: null,
  models: [],

  checkConnection: async () => {
    set({ error: null });
    try {
      const models = await cmd.aiCheckConnection();
      set({ connected: true, models });
    } catch (e) {
      set({ connected: false, models: [], error: String(e) });
    }
  },

  sendMessage: async (content, timelineContext) => {
    const userMessage: ChatMessage = { role: "user", content };
    set((s) => ({
      messages: [...s.messages, userMessage],
      loading: true,
      error: null,
    }));
    try {
      const allMessages = [...get().messages];
      const response: AiChatResponse = await cmd.aiChat(
        allMessages,
        timelineContext
      );
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content,
      };
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        suggestions: [...s.suggestions, ...response.events],
        loading: false,
      }));
    } catch (e) {
      console.error("AI chat error:", e);
      set({ error: String(e), loading: false });
    }
  },

  addSuggestionAsEvent: async (suggestion, timelineId, trackId) => {
    set({ error: null });
    try {
      await cmd.createEvent({
        timelineId,
        trackId,
        title: suggestion.title,
        description: suggestion.description,
        startDate: suggestion.startDate,
        endDate: suggestion.endDate,
        eventType: suggestion.eventType as
          | "point"
          | "range"
          | "milestone"
          | "era"
          | undefined,
        importance: suggestion.importance,
        aiGenerated: true,
        aiConfidence: suggestion.confidence,
      });
      set((s) => ({
        suggestions: s.suggestions.filter((sg) => sg !== suggestion),
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  clearChat: () =>
    set({ messages: [], suggestions: [], error: null }),
}));
