import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSearchStore } from "./search-store";
import * as cmd from "../lib/commands";

vi.mock("../lib/commands", () => ({
  searchEvents: vi.fn(),
}));

describe("useSearchStore", () => {
  beforeEach(() => {
    useSearchStore.setState({
      query: "",
      results: [],
      filteredEventIds: null,
      loading: false,
      error: null,
      filters: {
        trackIds: [],
        eventTypes: [],
        minImportance: 0,
        dateFrom: "",
        dateTo: "",
        aiGenerated: null,
        tags: "",
      },
    });
    vi.clearAllMocks();
  });

  describe("setQuery", () => {
    it("sets the query string", () => {
      useSearchStore.getState().setQuery("moon landing");
      expect(useSearchStore.getState().query).toBe("moon landing");
    });
  });

  describe("search", () => {
    it("calls searchEvents and stores results", async () => {
      const results = [
        {
          eventId: "e1",
          title: "Moon Landing",
          snippet: "First humans...",
          startDate: "1969-07-20",
          trackId: "t1",
        },
      ];
      vi.mocked(cmd.searchEvents).mockResolvedValueOnce(results);

      await useSearchStore.getState().search("tl1", "moon");

      expect(cmd.searchEvents).toHaveBeenCalledWith("tl1", "moon");
      expect(useSearchStore.getState().results).toEqual(results);
      expect(useSearchStore.getState().filteredEventIds).toEqual(
        new Set(["e1"])
      );
      expect(useSearchStore.getState().loading).toBe(false);
    });

    it("clears results for empty query", async () => {
      useSearchStore.setState({
        results: [
          {
            eventId: "e1",
            title: "X",
            snippet: "",
            startDate: "",
            trackId: "t1",
          },
        ],
        filteredEventIds: new Set(["e1"]),
      });

      await useSearchStore.getState().search("tl1", "   ");

      expect(cmd.searchEvents).not.toHaveBeenCalled();
      expect(useSearchStore.getState().results).toEqual([]);
      expect(useSearchStore.getState().filteredEventIds).toBeNull();
    });

    it("handles search errors", async () => {
      vi.mocked(cmd.searchEvents).mockRejectedValueOnce("Search failed");

      await useSearchStore.getState().search("tl1", "test");

      expect(useSearchStore.getState().error).toBe("Search failed");
      expect(useSearchStore.getState().loading).toBe(false);
    });

    it("sets loading true during search", async () => {
      vi.mocked(cmd.searchEvents).mockImplementation(
        () =>
          new Promise((resolve) => {
            expect(useSearchStore.getState().loading).toBe(true);
            resolve([]);
          })
      );

      await useSearchStore.getState().search("tl1", "test");
      expect(useSearchStore.getState().loading).toBe(false);
    });
  });

  describe("clearSearch", () => {
    it("resets query, results, filteredEventIds, and error", () => {
      useSearchStore.setState({
        query: "moon",
        results: [
          {
            eventId: "e1",
            title: "X",
            snippet: "",
            startDate: "",
            trackId: "t1",
          },
        ],
        filteredEventIds: new Set(["e1"]),
        error: "some error",
      });

      useSearchStore.getState().clearSearch();

      const state = useSearchStore.getState();
      expect(state.query).toBe("");
      expect(state.results).toEqual([]);
      expect(state.filteredEventIds).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("setFilter", () => {
    it("sets a single filter key", () => {
      useSearchStore.getState().setFilter("minImportance", 3);
      expect(useSearchStore.getState().filters.minImportance).toBe(3);
    });

    it("preserves other filters when setting one", () => {
      useSearchStore.getState().setFilter("trackIds", ["t1", "t2"]);
      useSearchStore.getState().setFilter("minImportance", 2);

      const { filters } = useSearchStore.getState();
      expect(filters.trackIds).toEqual(["t1", "t2"]);
      expect(filters.minImportance).toBe(2);
    });
  });

  describe("clearFilters", () => {
    it("resets all filters to defaults", () => {
      useSearchStore.setState({
        filters: {
          trackIds: ["t1"],
          eventTypes: ["point"],
          minImportance: 5,
          dateFrom: "2020-01-01",
          dateTo: "2025-01-01",
          aiGenerated: true,
          tags: "war",
        },
      });

      useSearchStore.getState().clearFilters();

      const { filters } = useSearchStore.getState();
      expect(filters.trackIds).toEqual([]);
      expect(filters.eventTypes).toEqual([]);
      expect(filters.minImportance).toBe(0);
    });
  });
});
