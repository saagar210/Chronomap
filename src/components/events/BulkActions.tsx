import { useState } from "react";
import { Trash2, Palette, Star, Layers } from "lucide-react";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { ColorPicker } from "../common/ColorPicker";

export function BulkActions() {
  const selectedIds = useEventStore((s) => s.selectedEventIds);
  const bulkDelete = useEventStore((s) => s.bulkDeleteEvents);
  const bulkUpdate = useEventStore((s) => s.bulkUpdateEvents);
  const clearSelection = useEventStore((s) => s.clearSelection);
  const tracks = useTrackStore((s) => s.tracks);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  const ids = Array.from(selectedIds);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await bulkDelete(ids);
    useCanvasStore.getState().markDirty();
    setConfirmDelete(false);
  };

  const handleTrackChange = async (trackId: string) => {
    await bulkUpdate({ ids, trackId });
    useCanvasStore.getState().markDirty();
    setShowTrackPicker(false);
  };

  const handleColorChange = async (color: string) => {
    await bulkUpdate({ ids, color });
    useCanvasStore.getState().markDirty();
    setShowColorPicker(false);
  };

  const handleImportanceChange = async (importance: number) => {
    await bulkUpdate({ ids, importance });
    useCanvasStore.getState().markDirty();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-surface border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
      <span className="text-xs font-medium text-text-secondary">{count} selected</span>
      <div className="w-px h-5 bg-border" />

      {/* Move to Track */}
      <div className="relative">
        <button
          onClick={() => { setShowTrackPicker(!showTrackPicker); setShowColorPicker(false); setConfirmDelete(false); }}
          className="p-1.5 rounded hover:bg-bg cursor-pointer"
          title="Change track"
        >
          <Layers size={14} />
        </button>
        {showTrackPicker && (
          <div className="absolute bottom-full mb-1 left-0 bg-surface border border-border rounded shadow-lg py-1 min-w-32">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTrackChange(t.id)}
                className="w-full text-left px-3 py-1 text-xs hover:bg-bg flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color */}
      <div className="relative">
        <button
          onClick={() => { setShowColorPicker(!showColorPicker); setShowTrackPicker(false); setConfirmDelete(false); }}
          className="p-1.5 rounded hover:bg-bg cursor-pointer"
          title="Change color"
        >
          <Palette size={14} />
        </button>
        {showColorPicker && (
          <div className="absolute bottom-full mb-1 left-0">
            <ColorPicker value="" onChange={handleColorChange} />
          </div>
        )}
      </div>

      {/* Importance */}
      <div className="flex items-center gap-0.5">
        <Star size={14} className="text-text-muted" />
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleImportanceChange(n)}
            className="w-5 h-5 text-[10px] rounded hover:bg-bg cursor-pointer"
            title={`Set importance ${n}`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className={`p-1.5 rounded cursor-pointer ${confirmDelete ? "bg-danger text-white" : "hover:bg-danger/10 text-danger"}`}
        title={confirmDelete ? "Click again to confirm" : "Delete selected"}
      >
        <Trash2 size={14} />
      </button>

      {/* Cancel */}
      <button
        onClick={() => { clearSelection(); setConfirmDelete(false); }}
        className="text-[10px] text-text-muted hover:text-text cursor-pointer px-1"
      >
        Cancel
      </button>
    </div>
  );
}
