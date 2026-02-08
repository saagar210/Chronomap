import { useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { IconButton } from "../common/IconButton";
import { useSearchStore } from "../../stores/search-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { SearchResults } from "./SearchResults";

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { query, setQuery, search, clearSearch, results, loading } =
    useSearchStore();
  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (activeTimelineId) {
          search(activeTimelineId, value);
        }
      }, 300);
    },
    [activeTimelineId, search, setQuery]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && query) {
        clearSearch();
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [query, clearSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Search size={14} className="text-text-muted shrink-0" />
        <input
          ref={inputRef}
          placeholder="Search events... (Cmd+F)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 border-none bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none py-1"
        />
        {query && (
          <IconButton onClick={clearSearch} tooltip="Clear search">
            <X size={14} />
          </IconButton>
        )}
      </div>
      {query && (results.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1">
          <SearchResults />
        </div>
      )}
    </div>
  );
}
