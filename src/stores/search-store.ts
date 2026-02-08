import { create } from "zustand";
import type { SearchResult } from "../lib/commands";
import type { TimelineEvent } from "../lib/types";
import * as cmd from "../lib/commands";

export interface SearchFilters {
  trackIds: string[];
  eventTypes: string[];
  minImportance: number;
  dateFrom: string;
  dateTo: string;
  aiGenerated: boolean | null;
  tags: string;
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
  applyFilters: (events: TimelineEvent[]) => void;
  hasActiveFilters: () => boolean;
}

const DEFAULT_FILTERS: SearchFilters = {
  trackIds: [],
  eventTypes: [],
  minImportance: 0,
  dateFrom: "",
  dateTo: "",
  aiGenerated: null,
  tags: "",
};

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: "",
  results: [],
  filteredEventIds: null,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  search: async (timelineId, query) => {
    if (!query.trim()) {
      set({ results: [], loading: false });
      // Re-apply filters without search
      get().applyFilters([]);
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

  setFilter: (key, value) => {
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    }));
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS }, filteredEventIds: null });
  },

  applyFilters: (events: TimelineEvent[]) => {
    const { filters, query } = get();
    const hasFilters = get().hasActiveFilters();

    if (!hasFilters && !query) {
      set({ filteredEventIds: null });
      return;
    }

    let filtered = events;

    if (filters.trackIds.length > 0) {
      const trackSet = new Set(filters.trackIds);
      filtered = filtered.filter((e) => trackSet.has(e.trackId));
    }

    if (filters.eventTypes.length > 0) {
      const typeSet = new Set(filters.eventTypes);
      filtered = filtered.filter((e) => typeSet.has(e.eventType));
    }

    if (filters.minImportance > 0) {
      filtered = filtered.filter((e) => e.importance >= filters.minImportance);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((e) => e.startDate >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((e) => e.startDate <= filters.dateTo);
    }

    if (filters.aiGenerated !== null) {
      filtered = filtered.filter((e) => e.aiGenerated === filters.aiGenerated);
    }

    if (filters.tags) {
      const searchTags = filters.tags.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
      filtered = filtered.filter((e) =>
        searchTags.some((t) => e.tags.toLowerCase().includes(t))
      );
    }

    set({ filteredEventIds: new Set(filtered.map((e) => e.id)) });
  },

  hasActiveFilters: () => {
    const { filters } = get();
    return (
      filters.trackIds.length > 0 ||
      filters.eventTypes.length > 0 ||
      filters.minImportance > 0 ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.aiGenerated !== null ||
      filters.tags !== ""
    );
  },
}));
