import { useState } from "react";
import { CheckSquare, PlusSquare, ChevronDown } from "lucide-react";
import { Button } from "../common/Button";
import { useTrackStore } from "../../stores/track-store";
import { useAiStore } from "../../stores/ai-store";
import { useToastStore } from "../../stores/toast-store";
import type { AiGeneratedEvent } from "../../lib/commands";

interface AiBatchActionsProps {
  suggestions: AiGeneratedEvent[];
  timelineId: string;
  selectedIndices: Set<number>;
}

export function AiBatchActions({
  suggestions,
  timelineId,
  selectedIndices,
}: AiBatchActionsProps) {
  const tracks = useTrackStore((s) => s.tracks);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const trackId = selectedTrackId || tracks[0]?.id || "";

  const handleAddAll = async () => {
    if (!trackId || suggestions.length === 0) return;
    setAdding(true);
    let count = 0;
    try {
      for (const suggestion of suggestions) {
        await useAiStore.getState().addSuggestionAsEvent(suggestion, timelineId, trackId);
        count++;
      }
      useToastStore.getState().addToast({
        type: "success",
        title: `Added ${count} events`,
      });
    } catch {
      useToastStore.getState().addToast({
        type: "error",
        title: `Added ${count} of ${suggestions.length} events`,
        description: "Some events failed to add",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleAddSelected = async () => {
    if (!trackId || selectedIndices.size === 0) return;
    setAdding(true);
    let count = 0;
    const selected = suggestions.filter((_, i) => selectedIndices.has(i));
    try {
      for (const suggestion of selected) {
        await useAiStore.getState().addSuggestionAsEvent(suggestion, timelineId, trackId);
        count++;
      }
      useToastStore.getState().addToast({
        type: "success",
        title: `Added ${count} events`,
      });
    } catch {
      useToastStore.getState().addToast({
        type: "error",
        title: `Added ${count} of ${selected.length} events`,
        description: "Some events failed to add",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mb-2">
      {/* Track picker */}
      <div className="relative flex-1 min-w-0">
        <select
          value={trackId}
          onChange={(e) => setSelectedTrackId(e.target.value)}
          className="w-full appearance-none bg-bg-tertiary border border-border rounded-md px-2 py-1 text-[10px] text-text pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={10}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>

      <Button
        size="sm"
        variant="primary"
        onClick={handleAddAll}
        disabled={adding || suggestions.length === 0 || !trackId}
        title="Add all suggestions as events"
      >
        <PlusSquare size={12} className="mr-1" />
        All
      </Button>

      <Button
        size="sm"
        variant="secondary"
        onClick={handleAddSelected}
        disabled={adding || selectedIndices.size === 0 || !trackId}
        title="Add selected suggestions as events"
      >
        <CheckSquare size={12} className="mr-1" />
        Selected ({selectedIndices.size})
      </Button>
    </div>
  );
}
