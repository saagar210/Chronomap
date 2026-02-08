import { Calendar } from "lucide-react";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useSearchStore } from "../../stores/search-store";
import { useEventStore } from "../../stores/event-store";
import { formatDate, truncate } from "../../lib/utils";

export function SearchResults() {
  const { results, loading, query } = useSearchStore();
  const selectEvent = useEventStore((s) => s.selectEvent);

  const handleResultClick = (eventId: string) => {
    selectEvent(eventId);
  };

  if (loading) {
    return (
      <div className="bg-bg border border-border rounded-md shadow-lg">
        <LoadingSpinner />
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="bg-bg border border-border rounded-md shadow-lg p-3">
        <p className="text-xs text-text-muted text-center">
          No results for &quot;{query}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
      {results.map((result) => (
        <button
          key={result.eventId}
          onClick={() => handleResultClick(result.eventId)}
          className="w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors border-b border-border last:border-b-0 cursor-pointer"
        >
          <div className="flex items-start gap-2">
            <Calendar size={12} className="text-text-muted mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-text truncate">
                {result.title}
              </p>
              <p className="text-[10px] text-text-muted">
                {formatDate(result.startDate)}
              </p>
              {result.snippet && (
                <p className="text-[10px] text-text-secondary mt-0.5">
                  {truncate(result.snippet, 80)}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
