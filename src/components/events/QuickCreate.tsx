import { useState, useRef, useEffect, useCallback } from "react";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { X } from "lucide-react";

interface QuickCreateProps {
  x: number;
  y: number;
  date: string;
  onClose: () => void;
}

export function QuickCreate({ x, y, date, onClose }: QuickCreateProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(date);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tracks = useTrackStore((s) => s.tracks);
  const firstTrack = tracks[0] ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !firstTrack) return;
    const timelineId = useTimelineStore.getState().activeTimelineId;
    if (!timelineId) return;

    try {
      await useEventStore.getState().createEvent({
        timelineId,
        trackId: firstTrack.id,
        title: title.trim(),
        startDate,
        eventType: "point",
        importance: 2,
      });
      useCanvasStore.getState().markDirty();
      onClose();
    } catch {
      // Toast is handled by the event store
    }
  }, [title, startDate, firstTrack, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      // Stop propagation so canvas shortcuts don't fire
      e.stopPropagation();
    },
    [handleSubmit, onClose]
  );

  if (!firstTrack) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-bg border border-border rounded-lg shadow-xl p-3 w-64"
      style={{ left: x, top: y }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">Quick Create</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text p-0.5 rounded cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Event title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-2 py-1.5 text-sm bg-bg-secondary border border-border rounded mb-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-full px-2 py-1.5 text-sm bg-bg-secondary border border-border rounded mb-2 text-text focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Track: {firstTrack.name}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="px-2 py-1 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Create
        </button>
      </div>
    </div>
  );
}
