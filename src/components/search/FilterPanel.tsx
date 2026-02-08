import { useEffect } from "react";
import { X, Filter } from "lucide-react";
import { useSearchStore } from "../../stores/search-store";
import { useTrackStore } from "../../stores/track-store";
import { useEventStore } from "../../stores/event-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { EVENT_TYPES } from "../../lib/constants";

export function FilterPanel() {
  const { filters, setFilter, clearFilters, applyFilters, hasActiveFilters } = useSearchStore();
  const tracks = useTrackStore((s) => s.tracks);
  const events = useEventStore((s) => s.events);

  useEffect(() => {
    applyFilters(events);
    useCanvasStore.getState().markDirty();
  }, [filters, events, applyFilters]);

  const activeCount = [
    filters.trackIds.length > 0,
    filters.eventTypes.length > 0,
    filters.minImportance > 0,
    filters.dateFrom !== "",
    filters.dateTo !== "",
    filters.aiGenerated !== null,
    filters.tags !== "",
  ].filter(Boolean).length;

  return (
    <div className="px-3 py-2 flex flex-col gap-2 border-b border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
          <Filter size={12} />
          Filters
          {activeCount > 0 && (
            <span className="bg-accent text-white text-[10px] px-1.5 rounded-full">{activeCount}</span>
          )}
        </span>
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="text-[10px] text-accent hover:underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-1">
          {filters.trackIds.map((id) => {
            const track = tracks.find((t) => t.id === id);
            return track ? (
              <Chip
                key={id}
                label={track.name}
                onRemove={() => setFilter("trackIds", filters.trackIds.filter((t) => t !== id))}
              />
            ) : null;
          })}
          {filters.eventTypes.map((type) => (
            <Chip
              key={type}
              label={type}
              onRemove={() => setFilter("eventTypes", filters.eventTypes.filter((t) => t !== type))}
            />
          ))}
          {filters.minImportance > 0 && (
            <Chip label={`≥${filters.minImportance}★`} onRemove={() => setFilter("minImportance", 0)} />
          )}
          {filters.dateFrom && (
            <Chip label={`From: ${filters.dateFrom}`} onRemove={() => setFilter("dateFrom", "")} />
          )}
          {filters.dateTo && (
            <Chip label={`To: ${filters.dateTo}`} onRemove={() => setFilter("dateTo", "")} />
          )}
          {filters.aiGenerated !== null && (
            <Chip
              label={filters.aiGenerated ? "AI only" : "Human only"}
              onRemove={() => setFilter("aiGenerated", null)}
            />
          )}
          {filters.tags && (
            <Chip label={`Tags: ${filters.tags}`} onRemove={() => setFilter("tags", "")} />
          )}
        </div>
      )}

      {/* Track filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted">Tracks</label>
        <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto">
          {tracks.map((track) => (
            <label key={track.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={filters.trackIds.includes(track.id)}
                onChange={(e) => {
                  const newIds = e.target.checked
                    ? [...filters.trackIds, track.id]
                    : filters.trackIds.filter((id) => id !== track.id);
                  setFilter("trackIds", newIds);
                }}
                className="rounded"
              />
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span className="text-text truncate">{track.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Event type filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted">Event Type</label>
        <div className="flex flex-wrap gap-1">
          {EVENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                const newTypes = filters.eventTypes.includes(type.value)
                  ? filters.eventTypes.filter((t) => t !== type.value)
                  : [...filters.eventTypes, type.value];
                setFilter("eventTypes", newTypes);
              }}
              className={`px-2 py-0.5 text-[10px] rounded-full border cursor-pointer transition-colors ${
                filters.eventTypes.includes(type.value)
                  ? "bg-accent text-white border-accent"
                  : "border-border text-text-secondary hover:border-accent"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Importance slider */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted">
          Min Importance: {filters.minImportance || "Any"}
        </label>
        <input
          type="range"
          min={0}
          max={5}
          value={filters.minImportance}
          onChange={(e) => setFilter("minImportance", Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Date range */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-text-muted">From</label>
          <input
            type="text"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full rounded border border-border bg-bg px-2 py-1 text-[11px] text-text"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-text-muted">To</label>
          <input
            type="text"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full rounded border border-border bg-bg px-2 py-1 text-[11px] text-text"
          />
        </div>
      </div>

      {/* AI toggle */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-text-muted">AI Generated:</label>
        <select
          value={filters.aiGenerated === null ? "" : filters.aiGenerated ? "true" : "false"}
          onChange={(e) => {
            const val = e.target.value;
            setFilter("aiGenerated", val === "" ? null : val === "true");
          }}
          className="rounded border border-border bg-bg px-2 py-0.5 text-[11px]"
        >
          <option value="">Any</option>
          <option value="true">AI Only</option>
          <option value="false">Human Only</option>
        </select>
      </div>

      {/* Tags filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted">Tags (comma-separated)</label>
        <input
          type="text"
          value={filters.tags}
          onChange={(e) => setFilter("tags", e.target.value)}
          placeholder="war, politics"
          className="w-full rounded border border-border bg-bg px-2 py-1 text-[11px] text-text"
        />
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/15 text-accent">
      {label}
      <button onClick={onRemove} className="hover:text-danger cursor-pointer">
        <X size={8} />
      </button>
    </span>
  );
}
