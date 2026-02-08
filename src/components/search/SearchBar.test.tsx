import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "./SearchBar";
import { useSearchStore } from "../../stores/search-store";
import { useTimelineStore } from "../../stores/timeline-store";

// Mock the SearchResults component to avoid pulling in its dependencies
vi.mock("./SearchResults", () => ({
  SearchResults: () => <div data-testid="search-results">Results</div>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <svg data-testid="search-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSearchStore.setState({
      query: "",
      results: [],
      filteredEventIds: null,
      loading: false,
      error: null,
      filters: { trackIds: [], eventTypes: [], minImportance: 0 },
    });
    useTimelineStore.setState({
      timelines: [],
      activeTimelineId: "tl1",
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input with placeholder", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText(/Search events/)).toBeDefined();
  });

  it("displays current query value in input", () => {
    useSearchStore.setState({ query: "moon" });
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search events/) as HTMLInputElement;
    expect(input.value).toBe("moon");
  });

  it("updates query on input change", () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search events/);
    fireEvent.change(input, { target: { value: "apollo" } });
    expect(useSearchStore.getState().query).toBe("apollo");
  });

  it("debounces search call by 300ms", async () => {
    const searchSpy = vi.fn();
    useSearchStore.setState({ search: searchSpy });

    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search events/);

    fireEvent.change(input, { target: { value: "moon" } });

    // Search should not be called immediately
    expect(searchSpy).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(searchSpy).toHaveBeenCalledWith("tl1", "moon");
  });

  it("only fires search once for rapid input changes", () => {
    const searchSpy = vi.fn();
    useSearchStore.setState({ search: searchSpy });

    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search events/);

    fireEvent.change(input, { target: { value: "m" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "mo" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "moo" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the last value should trigger search
    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith("tl1", "moo");
  });

  it("shows clear button when query exists", () => {
    useSearchStore.setState({ query: "test" });
    render(<SearchBar />);
    // The clear button uses IconButton with tooltip="Clear search"
    expect(screen.getByTitle("Clear search")).toBeDefined();
  });

  it("does not show clear button when query is empty", () => {
    render(<SearchBar />);
    expect(screen.queryByTitle("Clear search")).toBeNull();
  });

  it("clears search when clear button clicked", () => {
    useSearchStore.setState({ query: "test", results: [], loading: false });
    render(<SearchBar />);

    fireEvent.click(screen.getByTitle("Clear search"));

    expect(useSearchStore.getState().query).toBe("");
  });

  it("shows search results dropdown when query and results exist", () => {
    useSearchStore.setState({
      query: "moon",
      results: [
        {
          eventId: "e1",
          title: "Moon Landing",
          snippet: "",
          startDate: "1969-07-20",
          trackId: "t1",
        },
      ],
      loading: false,
    });
    render(<SearchBar />);
    expect(screen.getByTestId("search-results")).toBeDefined();
  });

  it("does not show results dropdown when query is empty", () => {
    render(<SearchBar />);
    expect(screen.queryByTestId("search-results")).toBeNull();
  });
});
