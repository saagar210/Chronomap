import { create } from "zustand";
import type { SearchResult } from "../lib/commands";
import * as cmd from "../lib/commands";

interface SearchFilters {
  trackIds: string[];
  eventTypes: string[];
  minImportance: number;
}

interface SearchStore {
  query: string;
  results: SearchResult[];
  filteredEventIds: Set<string> | null;
  loading: boolean;
  error: string | null;
  filters: SearchFilters;

  search: (timelineId: string, query: string) => Promise<void>;
  setQuery: (query: string) => void;
  clearSearch: () => void;
  setFilter: <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => void;
  clearFilters: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: "",
  results: [],
  filteredEventIds: null,
  loading: false,
  error: null,
  filters: {
    trackIds: [],
    eventTypes: [],
    minImportance: 0,
  },

  search: async (timelineId, query) => {
    if (!query.trim()) {
      set({ results: [], filteredEventIds: null, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const results = await cmd.searchEvents(timelineId, query);
      const filteredEventIds = new Set(results.map((r) => r.eventId));
      set({ results, filteredEventIds, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setQuery: (query) => set({ query }),

  clearSearch: () =>
    set({
      query: "",
      results: [],
      filteredEventIds: null,
      error: null,
    }),

  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    })),

  clearFilters: () =>
    set({
      filters: {
        trackIds: [],
        eventTypes: [],
        minImportance: 0,
      },
    }),
}));
